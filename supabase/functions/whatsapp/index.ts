// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const textData = await req.text()
    const searchParams = new URLSearchParams(textData)
    
    let from = searchParams.get('From') || 'Unknown'
    from = from.replace("whatsapp:", "") // Strip twilio whatsapp prefix
    let body = searchParams.get('Body') || ''
    const numMedia = parseInt(searchParams.get('NumMedia') || '0', 10);
    const mediaUrl0 = searchParams.get('MediaUrl0');
    const mediaContentType0 = searchParams.get('MediaContentType0') || '';

    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    console.log(`Processing WhatsApp message from: ${from}`)

    // If it's a voice note
    if (numMedia > 0 && mediaUrl0 && (mediaContentType0.includes('audio') || mediaContentType0.includes('video'))) {
      try {
        console.log(`Transcribing Twilio media URL: ${mediaUrl0}`);
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
        
        // Fetch audio from Twilio
        const audioRes = await fetch(mediaUrl0, {
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`)
          }
        });
        
        if (!audioRes.ok) {
          throw new Error('Failed to download media from Twilio');
        }
        const audioBlob = await audioRes.blob();
        
        // Transcribe with Groq
        const whisperFormData = new FormData();
        whisperFormData.append("file", audioBlob, 'whatsapp_audio.ogg');
        whisperFormData.append("model", "whisper-large-v3-turbo");
        
        const groqAudioRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqApiKey}`,
          },
          body: whisperFormData,
        });

        if (groqAudioRes.ok) {
          const groqAudioData = await groqAudioRes.json();
          if (groqAudioData.text) {
             body = groqAudioData.text;
             console.log("Transcribed text:", body);
          }
        } else {
           console.error("Groq Transcription failed:", await groqAudioRes.text());
        }
      } catch (err) {
        console.error("Error handling voice note:", err);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, I couldn't process your voice note.</Message></Response>`, {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200, 
        });
      }
    }

    // 1. Connect to our Database using Deno Environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 2. Fetch or Mock finding the Citizen user ID
    let { data: users, error: usersError } = await supabase.from('users').select('*').eq('phone', from);
    let user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      const { data: newUser, error } = await supabase.from('users').insert({
        phone: from,
        role: 'citizen',
        name: `Phone User ${from.slice(-4)}`,
        email: `tel_${from.replace('+', '')}@praja.local`,
        password_hash: 'dummy_hash_no_login_needed'
      }).select().single();
      
      if (!error) { user = newUser; }
    }
    
    // 3. Craft the AI Prompt (Same as Python version)
    const systemPrompt = `You are the Praja Municipal Complaint Agent. 
    The citizen's name is ${user?.name || 'Citizen'}.
    Your goal is to extract:
    1. Issue Description
    2. Location (City, Ward, or Address)

    Rules:
    - ONLY ask for whatever is missing.
    - Keep responses VERY short (1-2 sentences) and conversational.
    - If details are missing, respond in this JSON format ONLY:
    {"type": "question", "text": "Your question to the citizen here."}
    - If all required details are clear, respond exactly in this JSON format ONLY:
    {"type": "complete", "summary": "Brief summary", "category": "General", "location": "Extracted Location", "priority": "medium"}`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: body }
    ];

    // 4. Send directly to Groq native API endpoint inside Deno
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    const groqData = await groqRes.json();
    console.log("Raw Groq Response:", JSON.stringify(groqData));
    const aiResponseRaw = groqData.choices[0].message.content;
    const aiResponse = JSON.parse(aiResponseRaw);

    let replyText = "";
    
    if (aiResponse.type === 'complete' && user) {
      const trackingId = `PRJ-${new Date().toISOString().slice(2, 8).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      await supabase.from('grievances').insert({
        tracking_id: trackingId,
        citizen_id: user.id,
        title: aiResponse.summary,
        description: aiResponse.summary,
        location: aiResponse.location,
        ai_category: aiResponse.category || 'General',
        priority: aiResponse.priority || 'medium',
        status: 'open',
        channel: 'whatsapp',
      });
      
      replyText = `Thank you! Your grievance regarding ${aiResponse.category} at ${aiResponse.location} has been successfully registered. Tracking ID: ${trackingId}. We will update you shortly.`;
    } else {
      replyText = aiResponse.text || "I'm sorry, I didn't understand. Can you provide the issue and location?";
    }

    // 5. Send final Twilio XML response back to WhatsApp
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${replyText}</Message>
</Response>`;

    return new Response(xmlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing Twilio Webhook:", error);
    
    // We *must* return valid XML to Twilio even on an internal crash, otherwise WhatsApp spams error loops!
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Technical issue, please try again.</Message></Response>`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, 
    });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/whatsapp' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

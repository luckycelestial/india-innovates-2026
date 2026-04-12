// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop() || '';
  
  if (path === 'photo-need') {
    return handlePhotoNeed(req);
  } else if (path === 'verify-photo') {
    return handleVerifyPhoto(req);
  }

  return new Response(JSON.stringify({ error: 'Route not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

async function handlePhotoNeed(req: Request) {
  try {
    const { title, description } = await req.json();
    const text = `${title} ${description}`.toLowerCase();
    
    let need = "optional";
    let prompt = "A photo is optional, but it can help us verify and resolve faster.";
    
    const required_keywords = ["pothole", "garbage", "overflow", "leak", "broken", "crack", "damage", "sewage", "drain", "street light", "encroachment", "blocked road", "waterlogging"];
    const not_needed_keywords = ["status", "track", "tracking", "id update", "escalation request", "certificate", "document delay", "benefit not received"];
    
    if (required_keywords.some(k => text.includes(k))) {
      need = "required";
      prompt = "Please upload a clear photo that shows the issue and nearby landmark.";
    } else if (not_needed_keywords.some(k => text.includes(k))) {
      need = "not_needed";
      prompt = "No photo is needed for this complaint type.";
    }
    
    return new Response(JSON.stringify({ photo_need: need, prompt_to_user: prompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

async function handleVerifyPhoto(req: Request) {
  try {
    const { title, description, photo_url, photo_base64 } = await req.json();
    console.log("Verifying photo for:", title);
    
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      // Fallback if no API key is provided
      return new Response(JSON.stringify({ matches: true, reason: "Verification skipped (No API Key)" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const systemPrompt = `You are a hyper-strict infrastructure and civic issue photo verification assistant. Your task is strictly to verify if the attached image visually and physically depicts the *exact* issue described below. 
Title: ${title}
Description: ${description}

If the image is a certificate, document, or completely unrelated to a physical complaint issue (like an ID card, a selfie, a cartoon, text), return "matches": false and explain the mismatch in "reason".

Respond ONLY with valid JSON.
Schema: {"matches": true, "reason": "Short explanation"} or {"matches": false, "reason": "Explain why"}`;
    
    let imageUrl = photo_url;
    if (photo_base64) imageUrl = photo_base64; // base64 data URI

    // Request Groq Vision limit max tokens to avoid huge outputs
    const reqBody = {
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      temperature: 0.1,
      max_completion_tokens: 100
    };

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reqBody)
    });

    const data = await groqRes.json();
    console.log("Vision result:", data.choices?.[0]);

    const rawContent = data.choices?.[0]?.message?.content || "";
    
    try {
      const matchPattern = rawContent.match(/\{[\s\S]*matches[\s\S]*\}/) || [];
      const parsed = JSON.parse(matchPattern[0] || rawContent);
      if (parsed.matches !== undefined) {
         return new Response(JSON.stringify({ 
            matches: parsed.matches, 
            reason: parsed.reason || "Vision AI verification complete." 
         }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
         });
      }
    } catch(e) {
      console.log("Parse error:", e);
    }
    
    // Default valid if Groq fails to return json or fails vision check
    return new Response(JSON.stringify({ matches: true, reason: "Vision AI fallback acceptance." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ matches: true, reason: "Error contacting verification engine." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/grievance-ai' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

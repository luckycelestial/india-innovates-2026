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

const NO_SPEECH_MSG = "No input was received. Please call back and describe your complaint, or send us an SMS.";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const step = url.searchParams.get('step') || 'inbound';
    const textData = await req.text();
    const searchParams = new URLSearchParams(textData);
    
    let from = searchParams.get('From');
    if (from && from.startsWith('whatsapp:')) from = from.replace("whatsapp:", "");
    const callSid = searchParams.get('CallSid');
    const speechResult = searchParams.get('SpeechResult') || '';

    // Get Env
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const baseActionUrl = '/functions/v1/twilio-voice';
    let xml = '';

    if (step === 'inbound') {
      xml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
          <Gather input="speech" action="${baseActionUrl}?step=menu" method="POST" timeout="8" speechTimeout="auto" language="en-IN" enhanced="true">
              <Say voice="Polly.Aditi" language="en-IN">Welcome to Praja voice assistant. Please speak naturally. Say "file complaint" to register a new complaint, or say "track ticket" to check status.</Say>
          </Gather>
          <Say voice="Polly.Aditi" language="en-IN">${NO_SPEECH_MSG}</Say>
      </Response>`;
    } else if (step === 'menu') {
      const spoken = speechResult.toLowerCase();
      const wantsFile = spoken.includes('file') || spoken.includes('complaint') || spoken.includes('issue');
      const wantsTrack = spoken.includes('track') || spoken.includes('status') || spoken.includes('ticket');
      
      if (wantsFile) {
        xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Gather input="speech" action="${baseActionUrl}?step=issue" method="POST" timeout="8" speechTimeout="auto" language="en-IN" enhanced="true">
                <Say voice="Polly.Aditi" language="en-IN">Please describe your issue briefly.</Say>
            </Gather>
            <Say voice="Polly.Aditi" language="en-IN">No issue captured. Please call again.</Say>
        </Response>`;
      } else if (wantsTrack) {
         xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Gather input="speech" action="${baseActionUrl}?step=track" method="POST" timeout="8" speechTimeout="auto" language="en-IN" enhanced="true">
                <Say voice="Polly.Aditi" language="en-IN">Please say your ticket I D slowly.</Say>
            </Gather>
            <Say voice="Polly.Aditi" language="en-IN">No ticket captured. Please call again.</Say>
        </Response>`;
      } else {
         xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Aditi" language="en-IN">I could not understand. Please say file complaint or track ticket.</Say>
            <Hangup/>
        </Response>`;
      }
    } else if (step === 'issue') {
      const issueText = speechResult.trim();
      if (!issueText) {
          xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Aditi" language="en-IN">Sorry, I could not hear you.</Say><Hangup/></Response>`;
      } else {
          // Send issueText via URL params to location step
          const encodedIssue = encodeURIComponent(issueText);
          xml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
              <Gather input="speech" action="${baseActionUrl}?step=location&amp;issue=${encodedIssue}" method="POST" timeout="8" speechTimeout="auto" language="en-IN" enhanced="true">
                  <Say voice="Polly.Aditi" language="en-IN">Now tell the exact location, such as area name, street, and nearby landmark.</Say>
              </Gather>
              <Say voice="Polly.Aditi" language="en-IN">No location captured. Please call again.</Say>
          </Response>`;
      }
    } else if (step === 'location') {
      const locationText = speechResult.trim();
      const issueText = url.searchParams.get('issue') || 'Unknown Issue';
      
      let user = null;
      if (from) {
        let { data: users } = await supabase.from('users').select('*').eq('phone', from);
        if (users && users.length > 0) user = users[0];

        if (!user) {
          const { data: newUser } = await supabase.from('users').insert({
            phone: from,
            role: 'citizen',
            name: `Phone User`,
            email: `tel_${from.replace('+', '') || Math.random().toString().slice(2,8)}@praja.local`,
            password_hash: 'dummy'
          }).select().single();
          user = newUser;
        }
      }
      
      const trackingId = `PRJ-${new Date().toISOString().slice(2, 8).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const combinedDesc = `Issue: ${issueText} \nLocation: ${locationText}`;

      if (user) {
        await supabase.from('grievances').insert({
          tracking_id: trackingId,
          citizen_id: user.id,
          title: issueText.split(' ').slice(0, 5).join(' ') + '...',
          description: combinedDesc,
          location: locationText,
          ai_category: 'Street/Traffic/Civic',
          channel: 'voice',
          status: 'open',
        });
      }
      
      const spokenTicket = trackingId.split('').join(' ');
      
      xml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
          <Say voice="Polly.Aditi" language="en-IN">Thank you. Your complaint has been registered safely. Your ticket I D is ${spokenTicket}. You will also receive SMS updates. Goodbye!</Say>
          <Hangup/>
      </Response>`;
    } else if (step === 'track') {
       const spokenId = speechResult.trim();
       const normalizedId = spokenId.toUpperCase().replace(/[^A-Z0-9]/g, '');
       let foundTicket = null;
       
       if (normalizedId) {
         let { data: tix } = await supabase.from('grievances').select('*').ilike('tracking_id', `%${normalizedId}%`).limit(1);
         if (tix && tix.length > 0) foundTicket = tix[0];
       }
       
       if (foundTicket) {
         xml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
              <Say voice="Polly.Aditi" language="en-IN">Your ticket is currently ${foundTicket.status}. The category is ${foundTicket.ai_category || 'General'}. We are working on it.</Say>
              <Hangup/>
          </Response>`;
       } else {
         xml = `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
              <Say voice="Polly.Aditi" language="en-IN">Sorry, I could not find a ticket matching ${spokenId}. Please try again later or text us on WhatsApp.</Say>
              <Hangup/>
          </Response>`;
       }
    }

    return new Response(xml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error) {
    console.error("Twilio Voice Error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Aditi" language="en-IN">An unexpected technical error occurred. Please try again.</Say><Hangup/></Response>`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200, 
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/twilio-voice' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-user-id',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, description, photo_url, user_location_text } = await req.json();
    
    // Auth Check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth headers' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser(token);
    
    let citizenId = user?.id;

    // Use dummy bypass if testing without full anon-key UUID
    if (!citizenId) {
      const headerUserId = req.headers.get('x-user-id');
      const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);
      
      const { data: foundUser } = await supabaseAdmin.from('users').select('*').eq('id', headerUserId || '').single();
      citizenId = foundUser ? foundUser.id : "8fc290a5-bfa3-4348-b674-40ab2425c492"; // Hardcode fallback
      
      var sb = supabaseAdmin;
    } else {
      var sb = supabase;
    }

    // Classify using Groq
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    let category = "General";
    let priority = "medium";
    let sentiment = "negative";

    if (groqApiKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are an Indian citizen grievance classifier. You must output ONLY JSON with keys "category" (Water Supply, Roads, Electricity, Sanitation, Drainage, Parks, Health, Education, General), "priority" (low, medium, high, critical), and "sentiment" (negative, neutral, positive).`
              },
              {
                role: "user",
                content: `Title: ${title}\nDescription: ${description}`
              }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          })
        });
        const groqData = await groqRes.json();
        const parsed = JSON.parse(groqData.choices[0].message.content);
        category = parsed.category || category;
        priority = parsed.priority || priority;
        sentiment = parsed.sentiment || sentiment;
      } catch (e) {
        console.error("Groq classification failed", e);
      }
    }

    // Tracking & SLA
    const generateTrackingId = () => `PRJ-${new Date().toISOString().slice(2, 8).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const hoursMap: Record<string, number> = { "critical": 24, "high": 72, "medium": 168, "low": 720 };
    const slaHours = hoursMap[priority] || 168;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

    const insertData: any = {
      tracking_id: generateTrackingId(),
      citizen_id: citizenId,
      title,
      description,
      ai_category: category,
      ai_sentiment: sentiment,
      priority,
      status: "open",
      channel: "web",
      sla_deadline: slaDeadline
    };

    if (photo_url) {
      insertData.photo_url = photo_url;
      // In python they ran EXIF parsing here. 
      // For Edge function compatibility, we'll store user text primarily if no EXIF is provided.
    }
    
    if (user_location_text) {
      insertData.location = user_location_text;
    }

    const { data: dbRes, error } = await sb.from('grievances').insert(insertData).select().single();
    
    if (error) {
      console.error("DB Insert error", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(dbRes), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    console.error("Submit Error:", error);
    return new Response(JSON.stringify({ error: error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/grievance-submit' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ALLOWED_ORIGINS = [
  "https://prajavox.vercel.app",
  "http://localhost:5173",
];

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop() || '';

  if (path === 'performance') {
    return new Response(JSON.stringify({
      total_open: 5,
      total_resolved: 42,
      total_escalated: 1,
      total_grievances: 48,
      category_breakdown: { "Water Supply": 10, "Electricity": 38 },
      histogram_labels: ["0-6h", "6-12h", "12h+"],
      histogram_counts: [5, 20, 17]
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (path === 'check-escalation') {
    return new Response(JSON.stringify({ escalated_count: Math.floor(Math.random() * 2) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response("ok", { headers: corsHeaders });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/dev-dummy-endpoint' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

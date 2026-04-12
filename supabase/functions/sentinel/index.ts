// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'topics';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    let result = null;

    if (action === 'topics') {
      const { data, error } = await supabase.from("grievances").select("ai_category, ai_sentiment, priority").neq("status", "resolved");
      if (error) throw error;
      
      const clusters: Record<string, any> = {};
      (data || []).forEach(r => {
        const cat = r.ai_category || "General";
        if (!clusters[cat]) {
          clusters[cat] = { count: 0, critical: 0, negative: 0 };
        }
        clusters[cat].count += 1;
        if (r.priority === "critical") clusters[cat].critical += 1;
        if (r.ai_sentiment === "negative" || r.ai_sentiment === "very_negative") clusters[cat].negative += 1;
      });

      const topics = Object.entries(clusters).map(([topic, v]) => ({ topic, ...v })).sort((a, b) => b.count - a.count);
      result = topics;

    } else if (action === 'trends') {
      const now = new Date();
      const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("grievances").select("ai_category, created_at, status").gte("created_at", sevenAgo);
      if (error) throw error;

      const daily: Record<string, any> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        const day = d.toISOString().slice(0, 10);
        daily[day] = { date: day, total: 0, resolved: 0 };
      }

      (data || []).forEach(r => {
        const day = (r.created_at || '').slice(0, 10);
        if (daily[day]) {
          daily[day].total += 1;
          if (r.status === "resolved") daily[day].resolved += 1;
        }
      });

      result = Object.values(daily);

    } else if (action === 'comparison') {
      const { data, error } = await supabase.from("grievances").select("ai_category, priority, status, ai_sentiment");
      if (error) throw error;

      const catStats: Record<string, any> = {};
      (data || []).forEach(r => {
        const cat = r.ai_category || "General";
        if (!catStats[cat]) {
          catStats[cat] = { total: 0, resolved: 0, critical: 0, negative: 0 };
        }
        catStats[cat].total += 1;
        if (r.status === "resolved") catStats[cat].resolved += 1;
        if (r.priority === "critical") catStats[cat].critical += 1;
        if (r.ai_sentiment === "negative" || r.ai_sentiment === "very_negative") catStats[cat].negative += 1;
      });

      const comparison = Object.entries(catStats).map(([cat, stats]: [string, any]) => {
        const resolutionRate = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;
        const satisfaction = stats.total ? Math.round((1 - (stats.negative / stats.total)) * 100) : 100;
        return {
          category: cat,
          total: stats.total,
          resolved: stats.resolved,
          resolution_rate: resolutionRate,
          satisfaction_score: satisfaction,
          critical_count: stats.critical
        };
      }).sort((a, b) => b.total - a.total);

      result = comparison;

    } else if (action === 'alerts') {
      const now = new Date();
      const cutoff72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

      const [[criticalData], [slaData], [escalatedData]] = await Promise.all([
        supabase.from("grievances").select("id, tracking_id, title, ai_category, priority, status, created_at").eq("priority", "critical").neq("status", "resolved").order("created_at", { ascending: false }).limit(5),
        supabase.from("grievances").select("id, tracking_id, title, ai_category, priority, status, created_at").neq("status", "resolved").lt("created_at", cutoff72h).order("created_at", { ascending: true }).limit(5),
        supabase.from("grievances").select("id, tracking_id, title, ai_category, priority, status, created_at").eq("status", "escalated").order("created_at", { ascending: false }).limit(5)
      ].map(p => p.then(res => [res.data || [], res.error])));

      const alerts: any[] = [];
      const critical: any[] = Array.isArray(criticalData) ? criticalData : [];
      critical.forEach((g: any) => {
        alerts.push({
          id: g.id,
          title: `Critical: ${g.title}`,
          description: `Tracking ID ${g.tracking_id || ''} — ${g.ai_category || 'General'} — awaiting resolution.`,
          severity: "critical",
          type: "critical_grievance"
        });
      });

      const sla: any[] = Array.isArray(slaData) ? slaData : [];
      sla.forEach((g: any) => {
        const createdMs = new Date(g.created_at || now).getTime();
        const hoursOpen = Math.round((now.getTime() - createdMs) / 3600000);
        alerts.push({
          id: g.id,
          title: `SLA Breach: ${g.title}`,
          description: `Open for ${hoursOpen}h — ${g.ai_category || 'General'}. Immediate action required.`,
          severity: "high",
          type: "sla_breach"
        });
      });

      const escalated: any[] = Array.isArray(escalatedData) ? escalatedData : [];
      escalated.forEach((g: any) => {
        alerts.push({
          id: g.id,
          title: `Escalated: ${g.title}`,
          description: `Ticket ${g.tracking_id || ''} has been escalated — ${g.ai_category || 'General'}.`,
          severity: "high",
          type: "escalated"
        });
      });

      const seen = new Set();
      const uniqueAlerts = alerts.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });

      result = uniqueAlerts;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Sentinel API Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sentinel' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

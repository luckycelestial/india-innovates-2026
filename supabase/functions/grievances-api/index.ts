import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-praja-user-id, x-praja-user-role",
};

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

function isStaff(role: string | null): boolean {
  return !!role && role !== "citizen";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const userId = (req.headers.get("x-praja-user-id") || "").trim();
    const role = (req.headers.get("x-praja-user-role") || "citizen").trim();

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = typeof body.action === "string" ? body.action : "list";

    if (action === "list") {
      const statusFilter = typeof body.statusFilter === "string" ? body.statusFilter : "";
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 2000);

      let q = supabase.from("grievances").select("*").order("created_at", {
        ascending: false,
      }).limit(limit);

      if (role === "citizen" && userId && userId !== NIL_UUID) {
        q = q.eq("citizen_id", userId);
      }

      if (statusFilter) {
        q = q.eq("status", statusFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ rows: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "update_escalation") {
      if (!isStaff(role)) {
        return new Response(JSON.stringify({ error: "Only staff can run escalation" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("grievances").update({ status: "escalated" })
        .eq("status", "open")
        .lt("created_at", cutoff)
        .select("id");
      if (error) throw error;
      return new Response(JSON.stringify({ rows: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("grievances-api:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

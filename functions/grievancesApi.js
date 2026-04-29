const { createClient } = require("@supabase/supabase-js");

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const DEMO_CITIZEN_ID = "981cfd4e-dc40-4021-9c38-66c8262b8d9c";

function isStaff(role) {
  return !!role && role !== "citizen";
}

exports.grievancesApiHandler = async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  const userId = (req.headers["x-praja-user-id"] || "").trim();
  const role = (req.headers["x-praja-user-role"] || "citizen").trim();

  const { action = "list", statusFilter = "", limit = 100 } = req.body || {};

  try {
    if (action === 'list') {
       const fetchLimit = Math.min(Math.max(Number(limit) || 100, 1), 2000);
       let query = supabase.from('grievances').select('*').order('created_at', { ascending: false }).limit(fetchLimit);

       if (role === "citizen" && userId && userId !== NIL_UUID && userId !== DEMO_CITIZEN_ID) {
         query = query.eq("citizen_id", userId);
       }

       if (statusFilter) {
         query = query.eq("status", statusFilter);
       }

       const { data, error } = await query;
       if (error) throw error;

       return res.status(200).json({ rows: data || [] });
    }

    if (action === 'update_escalation') {
      if (!isStaff(role)) {
        return res.status(403).json({ error: "Only staff can run escalation" });
      }
      const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("grievances").update({ status: "escalated" })
        .eq("status", "open")
        .lt("created_at", cutoff)
        .select("id");
      if (error) throw error;

      return res.status(200).json({ rows: data || [], escalated_count: (data || []).length });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

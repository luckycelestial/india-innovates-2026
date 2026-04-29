const { createClient } = require("@supabase/supabase-js");

exports.sentinelHandler = async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  const { action } = req.body || {};

  try {
    if (action === 'alerts') {
      const now = new Date();
      const cutoff72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

      const [[criticalData], [slaData], [escalatedData]] = await Promise.all([
        supabase.from("grievances").select("id, tracking_id, title, ai_category, priority, status, created_at").eq("priority", "critical").neq("status", "resolved").order("created_at", { ascending: false }).limit(5),
        supabase.from("grievances").select("id, tracking_id, title, ai_category, priority, status, created_at").neq("status", "resolved").lt("created_at", cutoff72h).order("created_at", { ascending: true }).limit(5),
        supabase.from("grievances").select("id, tracking_id, title, ai_category, priority, status, created_at").eq("status", "escalated").order("created_at", { ascending: false }).limit(5)
      ].map(p => p.then(result => [result.data || [], result.error])));

      const alerts = [];
      const critical = Array.isArray(criticalData) ? criticalData : [];
      critical.forEach((g) => {
        alerts.push({
          id: g.id,
          title: `Critical: ${g.title}`,
          description: `Tracking ID ${g.tracking_id || ''} — ${g.ai_category || 'General'} — awaiting resolution.`,
          severity: "critical",
          type: "critical_grievance"
        });
      });

      const sla = Array.isArray(slaData) ? slaData : [];
      sla.forEach((g) => {
        const createdMs = Date.parse(g.created_at || now.toISOString());
        const hoursOpen = Math.round((now.getTime() - createdMs) / 3600000);
        alerts.push({
          id: g.id,
          title: `SLA Breach: ${g.title}`,
          description: `Open for ${hoursOpen}h — ${g.ai_category || 'General'}. Immediate action required.`,
          severity: "high",
          type: "sla_breach"
        });
      });

      const escalated = Array.isArray(escalatedData) ? escalatedData : [];
      escalated.forEach((g) => {
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

      return res.status(200).json(uniqueAlerts);
    }

    if (action === 'topics') {
      const { data, error } = await supabase.from("grievances").select("ai_category, ai_sentiment, priority").neq("status", "resolved");
      if (error) throw error;

      const clusters = {};
      (data || []).forEach(r => {
        const cat = r.ai_category || "General";
        if (!clusters[cat]) clusters[cat] = { count: 0, critical: 0, negative: 0 };
        clusters[cat].count += 1;
        if (r.priority === "critical") clusters[cat].critical += 1;
        if (r.ai_sentiment === "negative" || r.ai_sentiment === "very_negative") clusters[cat].negative += 1;
      });

      const topics = Object.entries(clusters).map(([topic, v]) => ({ topic, ...v })).sort((a, b) => b.count - a.count);
      return res.status(200).json(topics);
    }

    if (action === 'trends') {
      const now = new Date();
      const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("grievances").select("ai_category, created_at, status").gte("created_at", sevenAgo);
      if (error) throw error;

      const daily = {};
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

      return res.status(200).json(Object.values(daily));
    }

    if (action === 'comparison') {
      const { data, error } = await supabase.from("grievances").select("ai_category, priority, status, ai_sentiment");
      if (error) throw error;

      const catStats = {};
      (data || []).forEach(r => {
        const cat = r.ai_category || "General";
        if (!catStats[cat]) catStats[cat] = { total: 0, resolved: 0, critical: 0, negative: 0 };
        catStats[cat].total += 1;
        if (r.status === "resolved") catStats[cat].resolved += 1;
        if (r.priority === "critical") catStats[cat].critical += 1;
        if (r.ai_sentiment === "negative" || r.ai_sentiment === "very_negative") catStats[cat].negative += 1;
      });

      const comparison = Object.entries(catStats).map(([cat, stats]) => {
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

      return res.status(200).json(comparison);
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

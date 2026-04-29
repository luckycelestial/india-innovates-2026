exports.devDummyEndpointHandler = async (req, res) => {
  const { action } = req.body || {};

  if (action === 'performance' || req.path.endsWith('/performance')) {
    return res.status(200).json({
      total_open: 5,
      total_resolved: 42,
      total_escalated: 1,
      total_grievances: 48,
      category_breakdown: { "Water Supply": 10, "Electricity": 38 },
      histogram_labels: ["0-6h", "6-12h", "12h+"],
      histogram_counts: [5, 20, 17]
    });
  }

  if (action === 'check-escalation' || req.path.endsWith('/check-escalation')) {
    return res.status(200).json({ escalated_count: Math.floor(Math.random() * 2) });
  }

  return res.status(200).json({ status: "ok" });
};

-- Performance indexes for high-frequency query patterns.
-- These cover the main access paths used by Edge Functions and frontend fetches.

-- grievances: citizen lookup (MyComplaintsTab, grievances-api citizen filter)
CREATE INDEX IF NOT EXISTS idx_grievances_citizen_id
  ON public.grievances (citizen_id);

-- grievances: status filter + time ordering (ManageTicketsTab, auto-escalation)
CREATE INDEX IF NOT EXISTS idx_grievances_status_created
  ON public.grievances (status, created_at DESC);

-- grievances: officer assignment lookup
CREATE INDEX IF NOT EXISTS idx_grievances_officer_id
  ON public.grievances (officer_id)
  WHERE officer_id IS NOT NULL;

-- grievances: ward-level aggregation (SentinelHeatmap)
CREATE INDEX IF NOT EXISTS idx_grievances_ward_id
  ON public.grievances (ward_id)
  WHERE ward_id IS NOT NULL;

-- notifications: user inbox (UnifiedDashboard notification bell)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id, created_at DESC);

-- ticket_logs: grievance timeline
CREATE INDEX IF NOT EXISTS idx_ticket_logs_grievance_id
  ON public.ticket_logs (grievance_id, created_at DESC);

-- sentiment_posts: ward analysis (SentinelTab)
CREATE INDEX IF NOT EXISTS idx_sentiment_posts_ward_id
  ON public.sentiment_posts (ward_id, collected_at DESC);

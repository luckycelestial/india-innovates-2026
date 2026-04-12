-- RLS policies: auth.uid() is expected to match public.users.id (Supabase Auth user id).
-- anon: read-only on reference/catalog tables only. Sensitive tables require authenticated JWT.
-- Service role (edge functions, dashboard SQL) bypasses RLS.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ward_sentiment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_contexts ENABLE ROW LEVEL SECURITY;
-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER avoids recursion when policies touch public.users)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role FROM public.users u WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.app_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role <> 'citizen'::public.user_role
  );
$$;

-- ---------------------------------------------------------------------------
-- public.users
-- ---------------------------------------------------------------------------
CREATE POLICY users_select_own_or_staff
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.app_is_staff());

CREATE POLICY users_insert_own
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY users_update_own_or_staff
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.app_is_staff())
  WITH CHECK (id = auth.uid() OR public.app_is_staff());

-- ---------------------------------------------------------------------------
-- Reference data: readable without login (anon + authenticated)
-- ---------------------------------------------------------------------------
CREATE POLICY schemes_select_all
  ON public.schemes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY wards_select_all
  ON public.wards FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY departments_select_all
  ON public.departments FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- public.grievances
-- ---------------------------------------------------------------------------
CREATE POLICY grievances_select_visible
  ON public.grievances FOR SELECT
  TO authenticated
  USING (
    citizen_id = auth.uid()
    OR officer_id = auth.uid()
    OR public.app_is_staff()
  );

CREATE POLICY grievances_insert_as_self
  ON public.grievances FOR INSERT
  TO authenticated
  WITH CHECK (citizen_id = auth.uid());

CREATE POLICY grievances_update_visible
  ON public.grievances FOR UPDATE
  TO authenticated
  USING (
    citizen_id = auth.uid()
    OR officer_id = auth.uid()
    OR public.app_is_staff()
  )
  WITH CHECK (
    citizen_id = auth.uid()
    OR officer_id = auth.uid()
    OR public.app_is_staff()
  );

CREATE POLICY grievances_delete_staff
  ON public.grievances FOR DELETE
  TO authenticated
  USING (public.app_is_staff());

-- ---------------------------------------------------------------------------
-- public.notifications
-- ---------------------------------------------------------------------------
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.app_is_staff());

CREATE POLICY notifications_insert_own_or_staff
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.app_is_staff());

CREATE POLICY notifications_update_own_or_staff
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.app_is_staff())
  WITH CHECK (user_id = auth.uid() OR public.app_is_staff());

CREATE POLICY notifications_delete_own_or_staff
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.app_is_staff());

-- ---------------------------------------------------------------------------
-- public.schedules
-- ---------------------------------------------------------------------------
CREATE POLICY schedules_select_own
  ON public.schedules FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.app_is_staff());

CREATE POLICY schedules_insert_own_or_staff
  ON public.schedules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.app_is_staff());

CREATE POLICY schedules_update_own_or_staff
  ON public.schedules FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.app_is_staff())
  WITH CHECK (user_id = auth.uid() OR public.app_is_staff());

CREATE POLICY schedules_delete_own_or_staff
  ON public.schedules FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.app_is_staff());

-- ---------------------------------------------------------------------------
-- public.ticket_logs (follow grievance visibility)
-- ---------------------------------------------------------------------------
CREATE POLICY ticket_logs_select_visible
  ON public.ticket_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.grievances g
      WHERE g.id = ticket_logs.grievance_id
        AND (
          g.citizen_id = auth.uid()
          OR g.officer_id = auth.uid()
          OR public.app_is_staff()
        )
    )
  );

CREATE POLICY ticket_logs_insert_visible
  ON public.ticket_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grievances g
      WHERE g.id = ticket_logs.grievance_id
        AND (
          g.citizen_id = auth.uid()
          OR g.officer_id = auth.uid()
          OR public.app_is_staff()
        )
    )
    AND (actor_id IS NULL OR actor_id = auth.uid() OR public.app_is_staff())
  );

CREATE POLICY ticket_logs_update_staff
  ON public.ticket_logs FOR UPDATE
  TO authenticated
  USING (public.app_is_staff())
  WITH CHECK (public.app_is_staff());

CREATE POLICY ticket_logs_delete_staff
  ON public.ticket_logs FOR DELETE
  TO authenticated
  USING (public.app_is_staff());

-- ---------------------------------------------------------------------------
-- Sentiment / analytics: staff only (no anon)
-- ---------------------------------------------------------------------------
CREATE POLICY sentiment_posts_staff_all
  ON public.sentiment_posts FOR ALL
  TO authenticated
  USING (public.app_is_staff())
  WITH CHECK (public.app_is_staff());

CREATE POLICY ward_sentiment_scores_staff_all
  ON public.ward_sentiment_scores FOR ALL
  TO authenticated
  USING (public.app_is_staff())
  WITH CHECK (public.app_is_staff());

-- ---------------------------------------------------------------------------
-- public.call_contexts — edge/service only (no policies for anon/authenticated)
-- ---------------------------------------------------------------------------

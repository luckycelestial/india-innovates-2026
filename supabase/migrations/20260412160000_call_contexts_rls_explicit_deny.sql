-- call_contexts: RLS was ON with no policies (advisor warning + implicit deny).
-- Add explicit deny policies for anon/authenticated. Service role bypasses RLS for edge functions.

CREATE POLICY call_contexts_select_deny_clients
  ON public.call_contexts FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY call_contexts_insert_deny_clients
  ON public.call_contexts FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY call_contexts_update_deny_clients
  ON public.call_contexts FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY call_contexts_delete_deny_clients
  ON public.call_contexts FOR DELETE
  TO anon, authenticated
  USING (false);

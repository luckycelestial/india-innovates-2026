import { supabase } from './supabase';

export function prajaUserHeaders(user) {
  return {
    'x-praja-user-id': user?.id ?? '',
    'x-praja-user-role': user?.role ?? 'citizen',
  };
}

/**
 * List grievances via Edge Function (service role; works with strict RLS on table).
 */
export async function listGrievances(user, options = {}) {
  const { statusFilter = '', limit = 100 } = options;
  const { data, error } = await supabase.functions.invoke('grievances-api', {
    body: { action: 'list', statusFilter, limit },
    headers: prajaUserHeaders(user),
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.rows ?? [];
}

/**
 * Auto-escalate stale open tickets (staff only; enforced in Edge Function).
 */
export async function runEscalationUpdate(user) {
  const { data, error } = await supabase.functions.invoke('grievances-api', {
    body: { action: 'update_escalation' },
    headers: prajaUserHeaders(user),
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.rows ?? [];
}

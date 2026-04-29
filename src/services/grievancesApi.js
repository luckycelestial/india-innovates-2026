import { supabase } from './supabase';
import { getFunctionsBaseUrl } from './firebase';

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
  const { data, error } = await fetch(`${getFunctionsBaseUrl()}/grievancesApi`, {
    method: 'POST',
    body: JSON.stringify({ action: 'list', statusFilter, limit }),
    headers: { ...prajaUserHeaders(user), 'Content-Type': 'application/json' },
  }).then(res => res.json()).then(data => ({ data })).catch(error => ({ error }));
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.rows ?? [];
}

/**
 * Auto-escalate stale open tickets (staff only; enforced in Edge Function).
 */
export async function runEscalationUpdate(user) {
  const { data, error } = await fetch(`${getFunctionsBaseUrl()}/grievancesApi`, {
    method: 'POST',
    body: JSON.stringify({ action: 'update_escalation' }),
    headers: { ...prajaUserHeaders(user), 'Content-Type': 'application/json' },
  }).then(res => res.json()).then(data => ({ data })).catch(error => ({ error }));
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.rows ?? [];
}

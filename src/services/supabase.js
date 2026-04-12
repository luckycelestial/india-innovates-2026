import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing! Check your Vercel Dashboard Settings > Environment Variables.');
}

// Handle missing keys gracefully by providing a dummy client or letting it fail safely when used
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
      from: () => ({ select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: { message: 'Supabase keys missing' } }) }) }) }),
      channel: () => ({ on: () => ({ subscribe: () => {} }) })
    };

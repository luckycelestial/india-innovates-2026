import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing! Check your Vercel Dashboard Settings > Environment Variables.');
}

const missingKeysError = {
  message: 'Supabase keys missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (e.g. in Vercel → Project → Settings → Environment Variables).',
};

// Handle missing keys gracefully by providing a dummy client or letting it fail safely when used
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: missingKeysError }),
          }),
        }),
      }),
      functions: {
        invoke: async () => ({ data: null, error: missingKeysError }),
      },
      channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    };

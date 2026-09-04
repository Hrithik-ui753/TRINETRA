import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabase: SupabaseClient;

try {
  supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} catch {
  // Fallback dummy client so the app doesn't crash if Supabase is misconfigured
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ error: { message: 'Supabase not configured' } }),
      signInWithOAuth: async () => {},
      signOut: async () => {},
    },
  } as unknown as SupabaseClient;
}

export { supabase };

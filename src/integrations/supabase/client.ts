
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://zgcsgwlggvjvvshhhcmb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY3Nnd2xnZ3ZqdnZzaGhoY21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NTAwMTUsImV4cCI6MjA1OTAyNjAxNX0.rquwTuuTUAVWbv9qD47dGDJ_5eRd1mZYHJqVFIzIDMs";

// Create a singleton instance to avoid multiple client warnings
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

// Get the Supabase client instance
export const supabase = (() => {
  if (supabaseInstance) return supabaseInstance;
  
  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: localStorage,
      detectSessionInUrl: true
    }
  });

  // Listen for auth changes and log them
  supabaseInstance.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event, session?.user?.email);
  });
  
  return supabaseInstance;
})();

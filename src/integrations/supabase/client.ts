
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://zgcsgwlggvjvvshhhcmb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY3Nnd2xnZ3ZqdnZzaGhoY21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NTAwMTUsImV4cCI6MjA1OTAyNjAxNX0.rquwTuuTUAVWbv9qD47dGDJ_5eRd1mZYHJqVFIzIDMs";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-client-info': 'lovable-web'
    }
  }
});

// Export a utility function to clean up auth state
export const cleanupAuthState = () => {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    console.log("Auth state cleanup completed");
  } catch (e) {
    console.error("Error cleaning up auth state:", e);
  }
};

// Helper function to check table data access
export const checkTableData = async (userId: string) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId);
      
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', userId);
      
    const { data: subsData, error: subsError } = await supabase
      .from('subscribers')
      .select('id')
      .eq('user_id', userId);
      
    const { data: limitsData, error: limitsError } = await supabase
      .from('job_posting_limits')
      .select('id')
      .eq('user_id', userId);
      
    const { data: prefsData, error: prefsError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId);
    
    return {
      profiles: {
        error: profileError?.message,
        count: profileData?.length || 0
      },
      jobs: {
        error: jobsError?.message,
        count: jobsData?.length || 0
      },
      subscribers: {
        error: subsError?.message,
        count: subsData?.length || 0
      },
      jobPostingLimits: {
        error: limitsError?.message,
        count: limitsData?.length || 0
      },
      userPreferences: {
        error: prefsError?.message,
        count: prefsData?.length || 0
      }
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Function to fix missing user data
export const fixCommonRlsIssues = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "No authenticated user found" };
    }
    
    let fixResults = {
      profilesFixed: false,
      preferencesFixed: false,
      subscribersFixed: false,
      limitsFixed: false
    };
    
    // Fix missing profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (!existingProfile) {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || 'unknown@example.com',
          role: 'company',
          company_name: 'Your Company'
        });
      fixResults.profilesFixed = !error;
    }
    
    // Fix missing preferences
    const { data: existingPrefs } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!existingPrefs) {
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id
        });
      fixResults.preferencesFixed = !error;
    }
    
    // Fix missing subscribers entry
    const { data: existingSub } = await supabase
      .from('subscribers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!existingSub) {
      const { error } = await supabase
        .from('subscribers')
        .insert({
          user_id: user.id,
          email: user.email || 'unknown@example.com',
          subscribed: false,
          subscription_tier: 'free'
        });
      fixResults.subscribersFixed = !error;
    }
    
    // Fix missing job posting limits
    const { data: existingLimits } = await supabase
      .from('job_posting_limits')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!existingLimits) {
      const { error } = await supabase
        .from('job_posting_limits')
        .insert({
          user_id: user.id,
          monthly_post_limit: 1,
          monthly_posts_used: 0,
          subscription_tier: 'free'
        });
      fixResults.limitsFixed = !error;
    }
    
    return {
      success: true,
      fixed: fixResults,
      user: user.id
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

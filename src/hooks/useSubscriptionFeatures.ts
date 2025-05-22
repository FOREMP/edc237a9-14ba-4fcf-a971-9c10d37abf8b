import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'free' | 'basic' | 'standard' | 'premium' | 'single';

export interface SubscriptionFeatures {
  monthlyPostLimit: number;
  monthlyPostsUsed: number; 
  hasBasicStats: boolean;
  hasJobViewStats: boolean; // Standard tier feature
  hasAdvancedStats: boolean; // Premium tier feature
  canBoostPosts: boolean;
  hasPrioritySupport: boolean;
  isActive: boolean;
  tier: SubscriptionTier;
  expiresAt: Date | null;
}

export const useSubscriptionFeatures = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [lastQueryTime, setLastQueryTime] = useState<number>(0);
  const [consecutiveRefreshCount, setConsecutiveRefreshCount] = useState(0);
  const [features, setFeatures] = useState<SubscriptionFeatures>({
    monthlyPostLimit: 1,
    monthlyPostsUsed: 0,
    hasBasicStats: false,
    hasJobViewStats: false,
    hasAdvancedStats: false,
    canBoostPosts: false,
    hasPrioritySupport: false,
    isActive: false,
    tier: 'free',
    expiresAt: null
  });

  const refreshSubscription = useCallback((forceRefresh = false) => {
    const now = Date.now();
    
    // More aggressive throttling to reduce API calls
    if (!forceRefresh) {
      // Increase basic throttling - prevent multiple refreshes within 1000ms (1 second)
      if (now - lastRefreshTime < 1000) {
        console.log("Throttling rapid subscription refresh attempts");
        return;
      }
      
      // Track consecutive refreshes within a longer time window
      if (now - lastRefreshTime < 5000) {
        setConsecutiveRefreshCount(prev => prev + 1);
      } else {
        setConsecutiveRefreshCount(1); // Reset if outside the window
      }
      
      // Apply more delay for rapid successive refreshes
      const refreshDelay = Math.min(consecutiveRefreshCount * 100, 2000);
      
      console.log(`Refreshing subscription data (delay: ${refreshDelay}ms)`);
      setLastRefreshTime(now);
      
      // Use setTimeout to apply the adaptive delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, refreshDelay);
    } else {
      // Even force refreshes should have minimal throttling
      if (now - lastRefreshTime < 500) {
        return;
      }
      console.log("Force refreshing subscription data");
      setLastRefreshTime(now);
      setRefreshTrigger(prev => prev + 1);
    }
  }, [lastRefreshTime, consecutiveRefreshCount]);

  // Function to fetch subscription status
  const fetchSubscriptionFeatures = useCallback(async () => {
    // Skip if no user is logged in
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Set loading state if we haven't queried recently
    const now = Date.now();
    const timeSinceLastQuery = now - lastQueryTime;
    if (timeSinceLastQuery > 2000) { // Only show loading state for "new" queries
      setLoading(true);
    }
    
    setLastQueryTime(now);

    try {
      console.log("Fetching subscription data for user:", user.id);
      
      // Force cache busting with a unique parameter
      const cacheBuster = now.toString();
      
      // First try to get from subscribers table directly with auth session
      // Using 'let' instead of 'const' since we might need to update this variable later
      let { data: subscriberData, error: subscriberError } = await supabase
        .from('subscribers')
        .select('subscription_tier, subscribed, subscription_end, updated_at, subscription_id, stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subscriberError) {
        console.error('Error fetching subscription data:', subscriberError);
      } else {
        console.log("Subscriber data fetched directly:", subscriberData);
      }

      // Get from job_posting_limits table
      const { data: limitsData, error: limitsError } = await supabase
        .from('job_posting_limits')
        .select('monthly_post_limit, monthly_posts_used, subscription_tier, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (limitsError) {
        console.error('Error fetching limits data:', limitsError);
      } else {
        console.log("Limits data fetched:", limitsData);
      }

      // If no subscriber data or subscription has expired, check with Stripe edge function
      // Only do this check once every 30 seconds to reduce load
      const shouldCheckWithStripe = 
        (!subscriberData || !subscriberData?.subscribed || 
        (subscriberData?.subscription_end && new Date(subscriberData.subscription_end) < new Date())) &&
        (now - lastRefreshTime > 30000 || forceRefresh);
        
      if (shouldCheckWithStripe) {
        console.log("Checking subscription status via edge function");
        
        try {
          // Call our edge function to check subscription status directly with Stripe
          const { data: stripeData, error: stripeError } = await supabase.functions.invoke('check-subscription', {
            body: { 
              timestamp: now,
              cache_buster: cacheBuster,
              force_fresh: true
            }
          });
          
          if (stripeError) {
            console.error('Error checking subscription with Stripe:', stripeError);
          } else if (stripeData) {
            console.log("Stripe subscription check result:", stripeData);
          }
        } catch (stripeCheckError) {
          console.error('Exception during Stripe subscription check:', stripeCheckError);
        }
        
        // Try fetching subscriber data again after the edge function updates
        // Make sure we include stripe_customer_id field in the SELECT query this time
        const { data: refreshedData, error: refreshError } = await supabase
          .from('subscribers')
          .select('subscription_tier, subscribed, subscription_end, updated_at, subscription_id, stripe_customer_id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (refreshError) {
          console.error('Error fetching refreshed subscriber data:', refreshError);
        } else if (refreshedData) {
          console.log("Refreshed subscriber data:", refreshedData);
        }
        
        // Use the refreshed data if available
        if (refreshedData) {
          subscriberData = refreshedData;
        }
      }

      // Determine active subscription status
      let isActive = subscriberData?.subscribed || false;
      
      // Get tier from subscriber data if available, otherwise from limits data
      let tier: SubscriptionTier = 'free';
      if (subscriberData?.subscription_tier) {
        tier = subscriberData.subscription_tier as SubscriptionTier;
      } else if (limitsData?.subscription_tier) {
        tier = limitsData.subscription_tier as SubscriptionTier;
      }
      
      // If subscription_end date is in the past, the subscription is no longer active
      const expiresAt = subscriberData?.subscription_end ? new Date(subscriberData.subscription_end) : null;
      if (expiresAt && expiresAt < new Date()) {
        console.log("Subscription expired at:", expiresAt);
        isActive = false;
        // If a subscription is expired, reset to free tier
        if (tier !== 'free' && tier !== 'single') {
          tier = 'free';
        }
      }
      
      // Set default post limit based on tier
      let monthlyPostLimit = 1;
      if (tier === 'basic') monthlyPostLimit = 5;
      else if (tier === 'standard') monthlyPostLimit = 15;
      else if (tier === 'premium') monthlyPostLimit = 999; // Effectively unlimited
      else if (tier === 'single') monthlyPostLimit = 1;

      // If we have explicit limits data, use that limit instead
      if (limitsData?.monthly_post_limit) {
        monthlyPostLimit = limitsData.monthly_post_limit;
      }

      // Get correct monthly posts used value
      const monthlyPostsUsed = limitsData?.monthly_posts_used || 0;

      // Only update features if they've actually changed to prevent unnecessary renders
      const updatedFeatures: SubscriptionFeatures = {
        isActive,
        tier,
        expiresAt,
        monthlyPostLimit,
        monthlyPostsUsed,
        // Basic tier and above has basic stats
        hasBasicStats: isActive && (tier === 'basic' || tier === 'standard' || tier === 'premium'),
        // Standard and Premium tiers have job view statistics
        hasJobViewStats: isActive && (tier === 'standard' || tier === 'premium'),
        // Only Premium tier has advanced stats
        hasAdvancedStats: isActive && tier === 'premium',
        // Only Premium can boost posts
        canBoostPosts: isActive && tier === 'premium',
        // Only Premium has priority support
        hasPrioritySupport: isActive && tier === 'premium'
      };

      // Only update state if something actually changed
      if (JSON.stringify(features) !== JSON.stringify(updatedFeatures)) {
        console.log("Setting updated features:", updatedFeatures);
        setFeatures(updatedFeatures);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in useSubscriptionFeatures:', error);
      setLoading(false);
    }
  }, [user?.id, lastQueryTime, lastRefreshTime]);

  // Initial fetch and refresh mechanism
  useEffect(() => {
    fetchSubscriptionFeatures();
  }, [fetchSubscriptionFeatures, refreshTrigger]);

  // Set up periodic refresh every 60 seconds (increased from 15 to reduce strain)
  useEffect(() => {
    if (!user?.id) return;
    
    const intervalId = setInterval(() => {
      console.log("Running periodic subscription check");
      fetchSubscriptionFeatures();
    }, 60000); // Check every 60 seconds instead of 15
    
    return () => clearInterval(intervalId);
  }, [user?.id, fetchSubscriptionFeatures]);

  // Add a special effect to refresh subscription data when the component mounts
  // and when the user changes
  useEffect(() => {
    if (user?.id) {
      console.log("User changed or component mounted, refreshing subscription");
      fetchSubscriptionFeatures();
    }
  }, [user?.id, fetchSubscriptionFeatures]);

  return { features, loading, refreshSubscription };
};

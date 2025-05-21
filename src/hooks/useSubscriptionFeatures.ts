
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

  const refreshSubscription = useCallback(() => {
    const now = Date.now();
    
    // Basic throttling - prevent multiple refreshes within 500ms
    if (now - lastRefreshTime < 500) {
      console.log("Throttling rapid subscription refresh attempts");
      return;
    }
    
    // Track consecutive refreshes within a short time window
    if (now - lastRefreshTime < 2000) {
      setConsecutiveRefreshCount(prev => prev + 1);
    } else {
      setConsecutiveRefreshCount(1); // Reset if outside the window
    }
    
    // Apply increasing delay for rapid successive refreshes to prevent hammering the API
    const refreshDelay = Math.min(consecutiveRefreshCount * 100, 1000);
    
    console.log(`Refreshing subscription data (delay: ${refreshDelay}ms)`);
    setLastRefreshTime(now);
    
    // Use setTimeout to apply the adaptive delay
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, refreshDelay);
    
  }, [lastRefreshTime, consecutiveRefreshCount]);

  // Function to fetch subscription status
  const fetchSubscriptionFeatures = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      console.log("Fetching subscription data for user:", user.id);
      
      // First try to get from subscribers table (Stripe subscription information)
      // Use a direct query with select count(*) to check if the record exists
      // before attempting to fetch it to avoid "no rows returned" error logging
      const { count: subscriberCount } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      let subscriberData = null;
      let subscriberError = null;
      
      if (subscriberCount && subscriberCount > 0) {
        const result = await supabase
          .from('subscribers')
          .select('subscription_tier, subscribed, subscription_end, updated_at, subscription_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        subscriberData = result.data;
        subscriberError = result.error;
      }

      // Then get from job_posting_limits table (actual feature limits and usage)
      // Same approach to avoid unnecessary error logs
      const { count: limitsCount } = await supabase
        .from('job_posting_limits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      let limitsData = null;
      let limitsError = null;
      
      if (limitsCount && limitsCount > 0) {
        const result = await supabase
          .from('job_posting_limits')
          .select('monthly_post_limit, monthly_posts_used, subscription_tier, current_period_end')
          .eq('user_id', user.id)
          .maybeSingle();
          
        limitsData = result.data;
        limitsError = result.error;
      }

      if (subscriberError && subscriberError.code !== 'PGRST116') {
        console.error('Error fetching subscription data:', subscriberError);
      }
      
      if (limitsError && limitsError.code !== 'PGRST116') {
        console.error('Error fetching limits data:', limitsError);
      }

      console.log("Subscription data:", subscriberData);
      console.log("Limits data:", limitsData);

      // Prioritize subscriber data for determining active status and tier
      let isActive = subscriberData?.subscribed || false;
      
      // Get tier from subscriber data if available, otherwise from limits data
      let tier: SubscriptionTier = 'free';
      if (subscriberData?.subscription_tier) {
        tier = subscriberData.subscription_tier as SubscriptionTier;
      } else if (limitsData?.subscription_tier) {
        tier = limitsData.subscription_tier as SubscriptionTier;
      }
      
      // Critical fix: If tier is 'standard' or 'premium', consider it active 
      // regardless of subscribed flag to handle cases where subscribed is incorrectly set
      if (tier === 'standard' || tier === 'premium') {
        isActive = true;
      }
      
      const expiresAt = subscriberData?.subscription_end ? new Date(subscriberData.subscription_end) : null;

      // Set default post limit based on tier
      let monthlyPostLimit = 1;
      if (tier === 'basic') monthlyPostLimit = 5;
      else if (tier === 'standard') monthlyPostLimit = 15;
      else if (tier === 'premium') monthlyPostLimit = 999; // Effectively unlimited
      else if (tier === 'single') monthlyPostLimit = 1;

      // If we have explicit limits data, use that limit instead
      if (limitsData?.monthly_post_limit) {
        // Only use if it matches the expected value for the tier, otherwise use the tier-based value
        const expectedLimit = 
          tier === 'basic' ? 5 :
          tier === 'standard' ? 15 :
          tier === 'premium' ? 999 :
          tier === 'single' ? 1 : 1;
          
        // If the limit in DB doesn't match what's expected for the tier, update it
        if (limitsData.monthly_post_limit !== expectedLimit) {
          console.log(`Fixing monthly post limit: ${limitsData.monthly_post_limit} → ${expectedLimit}`);
          
          // Update the limits data in the database
          await supabase
            .from('job_posting_limits')
            .update({ 
              monthly_post_limit: expectedLimit,
              subscription_tier: tier // Also update the tier to keep them in sync
            })
            .eq('user_id', user.id);
            
          monthlyPostLimit = expectedLimit;
        } else {
          monthlyPostLimit = limitsData.monthly_post_limit;
        }
      } else if (tier !== 'free') {
        // If we don't have limits data but we do have a subscription tier, create a limits record
        console.log(`Creating new job_posting_limits record for user with tier ${tier}`);
        await supabase
          .from('job_posting_limits')
          .insert({
            user_id: user.id,
            monthly_post_limit: monthlyPostLimit,
            monthly_posts_used: 0,
            subscription_tier: tier
          });
      }

      // Get correct monthly posts used value
      const monthlyPostsUsed = limitsData?.monthly_posts_used || 0;

      // Determine features based on subscription tier
      // Each tier includes features from lower tiers
      const updatedFeatures: SubscriptionFeatures = {
        isActive,
        tier,
        expiresAt,
        monthlyPostLimit,
        monthlyPostsUsed,
        // Basic tier has NO stats - only standard and premium
        hasBasicStats: false,  // No longer used
        // Standard and Premium tiers have job view statistics
        hasJobViewStats: ['standard', 'premium'].includes(tier) && isActive,
        // Only Premium tier has advanced stats
        hasAdvancedStats: tier === 'premium' && isActive,
        // Only Premium can boost posts
        canBoostPosts: tier === 'premium' && isActive,
        // Only Premium has priority support
        hasPrioritySupport: tier === 'premium' && isActive
      };

      // Check if period has expired and reset counter if needed
      if (limitsData?.current_period_end && new Date(limitsData.current_period_end) < new Date()) {
        console.log("Current period has expired, resetting counter");
        await supabase.rpc('reset_post_count', {
          user_id: user.id
        });
        updatedFeatures.monthlyPostsUsed = 0;
      }

      console.log("Setting updated features:", updatedFeatures);
      setFeatures(updatedFeatures);
    } catch (error) {
      console.error('Error in useSubscriptionFeatures:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch and refresh mechanism
  useEffect(() => {
    fetchSubscriptionFeatures();
  }, [fetchSubscriptionFeatures, refreshTrigger]);

  // Set up periodic refresh every 15 seconds to check for plan changes
  // but only if the user is authenticated
  useEffect(() => {
    if (!user?.id) return;
    
    const intervalId = setInterval(() => {
      console.log("Running periodic subscription check");
      fetchSubscriptionFeatures();
    }, 15000); // Check every 15 seconds
    
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

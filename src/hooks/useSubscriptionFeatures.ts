
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SubscriptionTier = 'free' | 'basic' | 'standard' | 'premium' | 'single';

export interface SubscriptionFeatures {
  monthlyPostLimit: number;
  monthlyPostsUsed: number; 
  hasBasicStats: boolean;
  hasJobViewStats: boolean;
  hasAdvancedStats: boolean;
  canBoostPosts: boolean;
  hasPrioritySupport: boolean;
  isActive: boolean;
  tier: SubscriptionTier;
  expiresAt: Date | null;
}

export const useSubscriptionFeatures = () => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [dataFetchError, setDataFetchError] = useState<string | null>(null);
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

  const refreshSubscription = useCallback((shouldForceRefresh = false) => {
    const now = Date.now();
    
    if (!shouldForceRefresh && now - lastRefreshTime < 1000) {
      console.log("Throttling rapid subscription refresh attempts");
      return;
    }
    
    console.log("Refreshing subscription data");
    setLastRefreshTime(now);
    setRefreshTrigger(prev => prev + 1);
  }, [lastRefreshTime]);

  const fetchSubscriptionFeatures = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      console.log("useSubscriptionFeatures: No authenticated user, setting free tier");
      setFeatures(prev => ({
        ...prev,
        isActive: false,
        tier: 'free',
        monthlyPostLimit: 1,
        monthlyPostsUsed: 0
      }));
      setLoading(false);
      return;
    }

    console.log("useSubscriptionFeatures: Fetching for user:", user.id, user.email);
    setLoading(true);
    setDataFetchError(null);

    try {
      // First verify we have a valid session
      const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!sessionCheck?.session) {
        throw new Error("No valid session found");
      }

      console.log("useSubscriptionFeatures: Valid session confirmed, fetching subscription data");

      // Fetch subscriber data
      const { data: subscriberData, error: subscriberError } = await supabase
        .from('subscribers')
        .select('subscription_tier, subscribed, subscription_end, updated_at, subscription_id, stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (subscriberError) {
        console.error('useSubscriptionFeatures: Subscribers table error:', subscriberError);
        setDataFetchError(`Subscribers table error: ${subscriberError.message}`);
      } else {
        console.log("useSubscriptionFeatures: Subscriber data:", subscriberData);
      }

      // Fetch limits data
      const { data: limitsData, error: limitsError } = await supabase
        .from('job_posting_limits')
        .select('monthly_post_limit, monthly_posts_used, subscription_tier, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (limitsError) {
        console.error('useSubscriptionFeatures: Limits table error:', limitsError);
        setDataFetchError(prev => prev ? `${prev}, Limits error: ${limitsError.message}` : `Limits error: ${limitsError.message}`);
      } else {
        console.log("useSubscriptionFeatures: Limits data:", limitsData);
      }

      // If we have subscriber data with an active subscription, use it
      let isActive = false;
      let tier: SubscriptionTier = 'free';
      let expiresAt: Date | null = null;
      
      if (subscriberData) {
        isActive = subscriberData.subscribed || false;
        tier = (subscriberData.subscription_tier as SubscriptionTier) || 'free';
        expiresAt = subscriberData.subscription_end ? new Date(subscriberData.subscription_end) : null;
        
        // Check if subscription has expired
        if (expiresAt && expiresAt < new Date()) {
          console.log("useSubscriptionFeatures: Subscription expired at:", expiresAt);
          isActive = false;
          tier = 'free';
        }
      }

      // If no subscriber data but we have limits data, fall back to that
      if (!subscriberData && limitsData?.subscription_tier) {
        tier = limitsData.subscription_tier as SubscriptionTier;
        // For limits data without subscriber record, assume active if not free
        isActive = tier !== 'free';
      }

      // Determine features based on tier
      let monthlyPostLimit = 1;
      if (tier === 'basic') monthlyPostLimit = 5;
      else if (tier === 'standard') monthlyPostLimit = 15;
      else if (tier === 'premium') monthlyPostLimit = 999;
      else if (tier === 'single') monthlyPostLimit = 1;

      // Override with actual limits if available
      if (limitsData?.monthly_post_limit) {
        monthlyPostLimit = limitsData.monthly_post_limit;
      }

      const monthlyPostsUsed = limitsData?.monthly_posts_used || 0;

      const updatedFeatures: SubscriptionFeatures = {
        isActive,
        tier,
        expiresAt,
        monthlyPostLimit,
        monthlyPostsUsed,
        hasBasicStats: isActive && (tier === 'basic' || tier === 'standard' || tier === 'premium'),
        hasJobViewStats: isActive && (tier === 'standard' || tier === 'premium'),
        hasAdvancedStats: isActive && tier === 'premium',
        canBoostPosts: isActive && tier === 'premium',
        hasPrioritySupport: isActive && tier === 'premium'
      };

      console.log("useSubscriptionFeatures: Final features calculated:", updatedFeatures);
      setFeatures(updatedFeatures);
      
      // If we have URL parameters indicating a recent payment, and the subscription isn't active yet,
      // trigger the check-subscription function to sync with Stripe
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status');
      const planFromUrl = urlParams.get('plan');
      
      if ((paymentStatus === 'pending' || paymentStatus === 'success') && planFromUrl && !isActive) {
        console.log("useSubscriptionFeatures: Payment detected but subscription not active, triggering Stripe sync");
        
        try {
          const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-subscription');
          
          if (checkError) {
            console.error("Failed to sync subscription with Stripe:", checkError);
          } else {
            console.log("Stripe sync result:", checkResult);
            // Trigger another refresh after a short delay
            setTimeout(() => {
              setRefreshTrigger(prev => prev + 1);
            }, 2000);
          }
        } catch (error) {
          console.error("Error calling check-subscription function:", error);
        }
      }
      
      setLoading(false);
      
    } catch (error) {
      console.error('useSubscriptionFeatures: Major error:', error);
      setDataFetchError(`Major error: ${error instanceof Error ? error.message : String(error)}`);
      setFeatures(prev => ({
        ...prev,
        isActive: false,
        tier: 'free'
      }));
      setLoading(false);
    }
  }, [user?.id, user?.email, isAuthenticated]);

  useEffect(() => {
    console.log("useSubscriptionFeatures: Effect triggered, user:", user?.id, "authenticated:", isAuthenticated);
    fetchSubscriptionFeatures();
  }, [fetchSubscriptionFeatures, refreshTrigger]);

  return { features, loading, dataFetchError, refreshSubscription };
};

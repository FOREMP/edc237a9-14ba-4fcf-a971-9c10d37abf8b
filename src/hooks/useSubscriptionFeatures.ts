
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
  planName: string;
  status: string;
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
    planName: 'free',
    status: 'inactive',
    expiresAt: null
  });

  const refreshSubscription = useCallback((shouldForceRefresh = false) => {
    const now = Date.now();
    
    if (!shouldForceRefresh && now - lastRefreshTime < 1000) {
      console.log("Throttling rapid subscription refresh attempts");
      return;
    }
    
    console.log("Refreshing subscription data, force:", shouldForceRefresh);
    setLastRefreshTime(now);
    setRefreshTrigger(prev => prev + 1);
  }, [lastRefreshTime]);

  const syncWithStripe = useCallback(async (forceRefresh = false) => {
    if (!user?.id || !isAuthenticated) {
      console.log("syncWithStripe: No authenticated user");
      return;
    }

    console.log("Syncing with Stripe for user:", user.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: { force_fresh: forceRefresh }
      });
      
      if (error) {
        console.error("Stripe sync error:", error);
        throw error;
      }
      
      console.log("Stripe sync successful:", data);
      
      // Force refresh local data after Stripe sync
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);
      
      return data;
    } catch (error) {
      console.error("Exception during Stripe sync:", error);
      throw error;
    }
  }, [user?.id, isAuthenticated]);

  const fetchSubscriptionFeatures = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      console.log("useSubscriptionFeatures: No authenticated user, setting free tier");
      setFeatures(prev => ({
        ...prev,
        isActive: false,
        tier: 'free',
        planName: 'free',
        status: 'inactive',
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

      // Determine subscription status
      let isActive = false;
      let tier: SubscriptionTier = 'free';
      let planName = 'free';
      let status = 'inactive';
      let expiresAt: Date | null = null;
      
      if (subscriberData) {
        isActive = subscriberData.subscribed || false;
        tier = (subscriberData.subscription_tier as SubscriptionTier) || 'free';
        planName = tier;
        status = isActive ? 'active' : 'inactive';
        expiresAt = subscriberData.subscription_end ? new Date(subscriberData.subscription_end) : null;
        
        // Check if subscription has expired
        if (expiresAt && expiresAt < new Date()) {
          console.log("useSubscriptionFeatures: Subscription expired at:", expiresAt);
          isActive = false;
          tier = 'free';
          planName = 'free';
          status = 'expired';
        }
      }

      // If no subscriber data but we have limits data, fall back to that
      if (!subscriberData && limitsData?.subscription_tier) {
        tier = limitsData.subscription_tier as SubscriptionTier;
        planName = tier;
        // For limits data without subscriber record, assume active if not free
        isActive = tier !== 'free';
        status = isActive ? 'active' : 'inactive';
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
        planName,
        status,
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
      
      // Check URL for payment parameters and sync if needed
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status');
      const paymentSuccess = urlParams.get('payment_success');
      const planFromUrl = urlParams.get('plan');
      
      if ((paymentStatus === 'pending' || paymentStatus === 'success' || paymentSuccess === 'true') && planFromUrl && !isActive) {
        console.log("useSubscriptionFeatures: Payment detected but subscription not active, triggering Stripe sync");
        
        // Don't await this to avoid blocking the UI
        syncWithStripe(true).catch(error => {
          console.error("Failed to sync subscription with Stripe:", error);
        });
      }
      
      setLoading(false);
      
    } catch (error) {
      console.error('useSubscriptionFeatures: Major error:', error);
      setDataFetchError(`Major error: ${error instanceof Error ? error.message : String(error)}`);
      setFeatures(prev => ({
        ...prev,
        isActive: false,
        tier: 'free',
        planName: 'free',
        status: 'error'
      }));
      setLoading(false);
    }
  }, [user?.id, user?.email, isAuthenticated, syncWithStripe]);

  useEffect(() => {
    console.log("useSubscriptionFeatures: Effect triggered, user:", user?.id, "authenticated:", isAuthenticated);
    fetchSubscriptionFeatures();
  }, [fetchSubscriptionFeatures, refreshTrigger]);

  return { 
    features, 
    loading, 
    dataFetchError, 
    refreshSubscription,
    syncWithStripe
  };
};

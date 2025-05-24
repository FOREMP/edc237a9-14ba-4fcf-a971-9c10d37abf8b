
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
  const { user } = useAuth();
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
    if (!user?.id) {
      console.log("useSubscriptionFeatures: No user, skipping fetch");
      setLoading(false);
      return;
    }

    console.log("useSubscriptionFeatures: Fetching for user:", user.id, user.email);
    setLoading(true);
    setDataFetchError(null);

    try {
      // Test session first
      const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!sessionCheck?.session) {
        throw new Error("No valid session found");
      }

      console.log("useSubscriptionFeatures: Session is valid, proceeding with queries");

      // Fetch subscriber data with error handling
      let subscriberData = null;
      try {
        const { data, error } = await supabase
          .from('subscribers')
          .select('subscription_tier, subscribed, subscription_end, updated_at, subscription_id, stripe_customer_id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error('useSubscriptionFeatures: Subscribers table error:', error);
          setDataFetchError(`Subscribers table error: ${error.message}`);
        } else {
          subscriberData = data;
          console.log("useSubscriptionFeatures: Subscriber data:", subscriberData);
        }
      } catch (err) {
        console.error('useSubscriptionFeatures: Exception fetching subscribers:', err);
        setDataFetchError(`Subscribers fetch exception: ${String(err)}`);
      }

      // Fetch limits data with error handling
      let limitsData = null;
      try {
        const { data, error } = await supabase
          .from('job_posting_limits')
          .select('monthly_post_limit, monthly_posts_used, subscription_tier, current_period_end')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error('useSubscriptionFeatures: Limits table error:', error);
          setDataFetchError(prev => prev ? `${prev}, Limits error: ${error.message}` : `Limits error: ${error.message}`);
        } else {
          limitsData = data;
          console.log("useSubscriptionFeatures: Limits data:", limitsData);
        }
      } catch (err) {
        console.error('useSubscriptionFeatures: Exception fetching limits:', err);
        setDataFetchError(prev => prev ? `${prev}, Limits exception: ${String(err)}` : `Limits exception: ${String(err)}`);
      }

      // Determine features based on fetched data
      let isActive = subscriberData?.subscribed || false;
      let tier: SubscriptionTier = 'free';
      
      if (subscriberData?.subscription_tier) {
        tier = subscriberData.subscription_tier as SubscriptionTier;
      } else if (limitsData?.subscription_tier) {
        tier = limitsData.subscription_tier as SubscriptionTier;
      }
      
      const expiresAt = subscriberData?.subscription_end ? new Date(subscriberData.subscription_end) : null;
      if (expiresAt && expiresAt < new Date()) {
        console.log("useSubscriptionFeatures: Subscription expired at:", expiresAt);
        isActive = false;
        if (tier !== 'free' && tier !== 'single') {
          tier = 'free';
        }
      }
      
      let monthlyPostLimit = 1;
      if (tier === 'basic') monthlyPostLimit = 5;
      else if (tier === 'standard') monthlyPostLimit = 15;
      else if (tier === 'premium') monthlyPostLimit = 999;
      else if (tier === 'single') monthlyPostLimit = 1;

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

      console.log("useSubscriptionFeatures: Final features:", updatedFeatures);
      setFeatures(updatedFeatures);
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
  }, [user?.id, user?.email]);

  useEffect(() => {
    console.log("useSubscriptionFeatures: Effect triggered, user:", user?.id);
    fetchSubscriptionFeatures();
  }, [fetchSubscriptionFeatures, refreshTrigger]);

  return { features, loading, dataFetchError, refreshSubscription };
};

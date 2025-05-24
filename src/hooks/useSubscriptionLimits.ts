
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PostingLimits {
  monthlyPostLimit: number;
  monthlyPostsUsed: number;
  subscriptionTier: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export const useSubscriptionLimits = () => {
  const [limits, setLimits] = useState<PostingLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLimits = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('job_posting_limits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching posting limits:', error);
      } else if (data) {
        setLimits(data);
      }
    } catch (error) {
      console.error('Error fetching posting limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPostingLimit = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('check_posting_limit', {
        user_id: user.id
      });

      if (error) {
        console.error('Error checking posting limit:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error checking posting limit:', error);
      return false;
    }
  };

  const incrementPostCount = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('increment_post_count', {
        user_id: user.id
      });

      if (error) {
        console.error('Error incrementing post count:', error);
        return false;
      }

      // Refresh limits after incrementing
      await fetchLimits();
      
      return data;
    } catch (error) {
      console.error('Error incrementing post count:', error);
      return false;
    }
  };

  const getRemainingJobSlots = async (): Promise<number | null> => {
    if (!user) return null;

    try {
      // First get the current limits
      const { data, error } = await supabase
        .from('job_posting_limits')
        .select('monthly_post_limit, monthly_posts_used, subscription_tier')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error getting remaining job slots:', error);
        return null;
      }

      if (data) {
        return Math.max(0, data.monthly_post_limit - data.monthly_posts_used);
      }

      return null;
    } catch (error) {
      console.error('Error getting remaining job slots:', error);
      return null;
    }
  };

  const updateSubscriptionTier = async (tier: string) => {
    if (!user) return;

    // Define limits based on tier
    let postLimit = 1; // Default for free
    
    switch (tier) {
      case 'basic':
        postLimit = 5;
        break;
      case 'standard':
        postLimit = 15;
        break;
      case 'premium':
        postLimit = 999; // Essentially unlimited
        break;
      case 'single':
        postLimit = 1;
        break;
    }

    try {
      await supabase.rpc('update_subscription_tier', {
        user_id: user.id,
        tier: tier,
        post_limit: postLimit
      });

      // Refresh limits after updating
      await fetchLimits();
    } catch (error) {
      console.error('Error updating subscription tier:', error);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, [user]);

  return {
    limits,
    loading,
    checkPostingLimit,
    incrementPostCount,
    getRemainingJobSlots,
    updateSubscriptionTier,
    refreshLimits: fetchLimits
  };
};

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscriptionFeatures } from './useSubscriptionFeatures';

export const useSubscriptionLimits = () => {
  const [isChecking, setIsChecking] = useState(false);
  const { user } = useAuth();
  const { features, refreshSubscription } = useSubscriptionFeatures();

  const checkPostingLimit = async () => {
    if (!user) {
      toast.error("Du måste vara inloggad för att lägga upp jobbannonser.");
      return false;
    }
    
    setIsChecking(true);
    try {
      console.log("Checking posting limit for user:", user.id);
      console.log("Current subscription features:", features);
      
      // Fixed logic: Allow users to post if they have a valid tier (basic, standard, premium, single)
      // and have remaining slots available
      if (!['basic', 'standard', 'premium', 'single'].includes(features.tier)) {
        toast.error("Ingen aktiv prenumeration hittades – vänligen välj ett paket för att använda denna funktion.", {
          action: {
            label: 'Välj paket',
            onClick: () => window.location.href = '/pricing'
          },
        });
        return false;
      }
      
      // Get current usage data from database
      const { data: limitData, error: limitError } = await supabase
        .from('job_posting_limits')
        .select('monthly_post_limit, monthly_posts_used, current_period_end, subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (limitError) {
        console.error('Error fetching limit data:', limitError);
        
        // If no data exists, create a post for the user
        if (limitError.code === 'PGRST116') {
          console.log('No limit data found, creating default entry based on subscription tier');
          // Create a post for the user with default values based on subscription tier
          const defaultLimit = features.tier === 'basic' ? 5 : 
                              features.tier === 'standard' ? 15 :
                              features.tier === 'premium' ? 999 : 1;

          await supabase.from('job_posting_limits').insert({
            user_id: user.id,
            monthly_post_limit: defaultLimit,
            monthly_posts_used: 0,
            subscription_tier: features.tier
          });
          
          // User has just started, so they can publish
          return true;
        }
        
        toast.error("Det gick inte att kontrollera din publiceringsgräns. Försök igen senare.");
        return false;
      }

      console.log('Retrieved limit data:', limitData);
      
      // Check if the subscription tier in the limit data doesn't match the current tier
      if (limitData.subscription_tier !== features.tier) {
        console.log(`Subscription tier mismatch: ${limitData.subscription_tier} vs ${features.tier}`);
        // Update the subscription tier and post limit in the database based on the current tier
        const correctLimit = features.tier === 'basic' ? 5 : 
                          features.tier === 'standard' ? 15 :
                          features.tier === 'premium' ? 999 : 1;
                          
        await supabase
          .from('job_posting_limits')
          .update({
            subscription_tier: features.tier,
            monthly_post_limit: correctLimit
          })
          .eq('user_id', user.id);
          
        // Reload the subscription data to reflect the changes
        refreshSubscription();
        
        // If the user is upgrading, they should be able to post
        if (correctLimit > limitData.monthly_post_limit) {
          return true;
        }
      }
      
      // Check if we need to reset the counter (if the period has expired)
      if (limitData.current_period_end && new Date(limitData.current_period_end) < new Date()) {
        console.log('Resetting counter because period has expired');
        
        await supabase.rpc('reset_post_count', {
          user_id: user.id
        });
        
        // After resetting, user can publish
        return true;
      }
      
      // Check if the user has reached their limit
      const hasReachedLimit = limitData.monthly_posts_used >= limitData.monthly_post_limit;
      
      if (hasReachedLimit) {
        let message = "Du har nått maxgränsen för antal annonser denna månad baserat på ditt abonnemang.";
        
        // Customize message based on subscription tier
        if (features.tier === 'free' || !features.isActive) {
          message += " Köp ett abonnemang för att lägga upp fler annonser.";
        } else if (features.tier === 'single') {
          message += " Köp ytterligare en annons eller uppgradera till en prenumeration.";
        } else if (features.tier === 'basic') {
          message += " Uppgradera till Standard eller Premium för fler annonser per månad.";
        } else if (features.tier === 'standard') {
          message += " Uppgradera till Premium för obegränsat antal annonser.";
        }

        toast.error(message, {
          action: {
            label: 'Uppgradera',
            onClick: () => window.location.href = '/pricing'
          },
        });
      }
      
      console.log('User has reached limit:', hasReachedLimit, 'Can post:', !hasReachedLimit);
      return !hasReachedLimit;
    } catch (error) {
      console.error('Error checking posting limit:', error);
      toast.error("Det gick inte att kontrollera din publiceringsgräns. Försök igen senare.");
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const incrementPostCount = async () => {
    if (!user) return false;
    
    try {
      console.log("Incrementing post count for user:", user.id);
      
      // Call the RPC function to increment the count
      const { data, error } = await supabase.rpc('increment_post_count', {
        user_id: user.id
      });

      if (error) {
        console.error('Error incrementing post count:', error);
        toast.error("Kunde inte uppdatera din användarstatistik.");
        return false;
      }
      
      console.log('Post count incremented successfully:', data);
      
      // Update the updated_at timestamp separately
      await supabase
        .from('job_posting_limits')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      // Update subscription data to refresh the user interface
      refreshSubscription();
      return true;
    } catch (error) {
      console.error('Error incrementing post count:', error);
      return false;
    }
  };

  // Function to get remaining job slots
  const getRemainingJobSlots = async (): Promise<number> => {
    if (!user) return 0;

    try {
      console.log('Fetching remaining job slots for user:', user.id);
      
      // Get the current job posting limit from limit table
      const { data, error } = await supabase
        .from('job_posting_limits')
        .select('monthly_post_limit, monthly_posts_used, current_period_end, subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error getting remaining job slots:', error);
        
        // If no record found, create one based on subscription tier
        if (error.code === 'PGRST116') {
          console.log('Creating new job posting limit record for user');
          const defaultLimit = features.tier === 'basic' ? 5 : 
                            features.tier === 'standard' ? 15 :
                            features.tier === 'premium' ? 999 : 1;
          
          // Create a new record
          await supabase
            .from('job_posting_limits')
            .insert({
              user_id: user.id,
              monthly_post_limit: defaultLimit,
              monthly_posts_used: 0,
              subscription_tier: features.tier
            });
          
          return defaultLimit;
        }
        
        return 0;
      }

      // If tier doesn't match current features tier, update it
      if (data && data.subscription_tier !== features.tier) {
        console.log(`Updating subscription tier from ${data.subscription_tier} to ${features.tier}`);
        
        const correctLimit = features.tier === 'basic' ? 5 :
                          features.tier === 'standard' ? 15 :
                          features.tier === 'premium' ? 999 : 1;
        
        // Update the subscription tier and post limit
        await supabase
          .from('job_posting_limits')
          .update({
            subscription_tier: features.tier,
            monthly_post_limit: correctLimit
          })
          .eq('user_id', user.id);
          
        // Return the corrected limit minus used posts
        return Math.max(0, correctLimit - (data?.monthly_posts_used || 0));
      }
      
      // Check if we need to reset the counter (if the period has expired)
      if (data && data.current_period_end && new Date(data.current_period_end) < new Date()) {
        console.log('Period has expired, resetting post count');
        
        await supabase.rpc('reset_post_count', {
          user_id: user.id
        });
        
        // Return the full limit after reset
        return data?.monthly_post_limit || 0;
      }
      
      // Normal case: calculate remaining slots
      const limit = data?.monthly_post_limit || 1;
      const used = data?.monthly_posts_used || 0;
      
      console.log('User has used', used, 'of', limit, 'job slots');
      return Math.max(0, limit - used);
    } catch (error) {
      console.error('Error calculating remaining job slots:', error);
      return 0;
    }
  };

  return { 
    checkPostingLimit, 
    incrementPostCount, 
    getRemainingJobSlots,
    isChecking 
  };
};

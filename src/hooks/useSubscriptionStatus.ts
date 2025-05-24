
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useSubscriptionFeatures } from './useSubscriptionFeatures';
import { supabase } from '@/integrations/supabase/client';

export const useSubscriptionStatus = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { features, loading, refreshSubscription } = useSubscriptionFeatures();
  const refreshTimeoutRef = useRef<number | null>(null);
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false);
  const [hasProcessedUpdate, setHasProcessedUpdate] = useState(false);
  const lastProcessedTimestamp = useRef<string | null>(null);
  const refreshAttempts = useRef<number>(0);
  const maxRefreshAttempts = 8;

  // Handle payment success and subscription updates with timestamp tracking
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success') === 'true';
    const paymentPending = searchParams.get('payment_status') === 'pending';
    const subscriptionUpdated = searchParams.get('subscription_updated') === 'true';
    const plan = searchParams.get('plan');
    const timestamp = searchParams.get('ts');
    
    // Skip processing if we've already processed this exact timestamp
    if (timestamp && lastProcessedTimestamp.current === timestamp) {
      console.log("Skipping duplicate event with timestamp:", timestamp);
      return;
    }
    
    // Handle payment success or pending payment
    if ((paymentSuccess || paymentPending) && plan && !hasProcessedPayment) {
      console.log("Processing payment event for plan:", plan, "status:", paymentSuccess ? 'success' : 'pending', "timestamp:", timestamp);
      
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      const statusMessage = paymentSuccess 
        ? `Din betalning för ${plan} har genomförts!` 
        : `Betalning för ${plan} bearbetas...`;
      
      toast.success(statusMessage, {
        description: "Vi synkroniserar din prenumeration med Stripe...",
        duration: 5000,
        id: `payment-${paymentSuccess ? 'success' : 'pending'}-${timestamp || Date.now()}`
      });
      
      // Mark this payment as processed
      setHasProcessedPayment(true);
      if (timestamp) {
        lastProcessedTimestamp.current = timestamp;
      }
      
      // Trigger Stripe synchronization immediately
      const syncWithStripe = async () => {
        try {
          console.log("Triggering Stripe synchronization via check-subscription function");
          const { data, error } = await supabase.functions.invoke('check-subscription');
          
          if (error) {
            console.error("Stripe sync error:", error);
            toast.error("Kunde inte synkronisera prenumeration med Stripe");
          } else {
            console.log("Stripe sync successful:", data);
            // Force refresh the subscription data
            refreshSubscription(true);
          }
        } catch (error) {
          console.error("Exception during Stripe sync:", error);
        }
      };
      
      // Start sync immediately
      syncWithStripe();
      
      // Clear URL parameters
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('payment_success');
      newSearchParams.delete('payment_status');
      newSearchParams.delete('plan');
      newSearchParams.delete('ts');
      setSearchParams(newSearchParams);
      
      // Reset refresh attempts counter
      refreshAttempts.current = 0;
      
      // Schedule refresh attempts with optimized timing
      const scheduleRefreshAttempts = () => {
        if (refreshAttempts.current < maxRefreshAttempts) {
          // Start with quick checks, then gradually increase delay
          const delay = refreshAttempts.current < 3 
            ? 1000 // First 3 checks at 1 second intervals
            : Math.min(5000, Math.pow(1.5, refreshAttempts.current - 3) * 1000); // Then exponential backoff up to 5 seconds
          
          console.log(`Scheduling refresh attempt ${refreshAttempts.current + 1}/${maxRefreshAttempts} after ${delay}ms`);
          
          refreshTimeoutRef.current = window.setTimeout(() => {
            console.log(`Executing refresh attempt ${refreshAttempts.current + 1}/${maxRefreshAttempts}`);
            refreshSubscription(true);
            refreshAttempts.current++;
            scheduleRefreshAttempts();
            refreshTimeoutRef.current = null;
          }, delay);
        } else {
          // Final status check
          console.log("Completed all scheduled refresh attempts");
          setTimeout(() => {
            if (features.isActive && features.tier !== 'free') {
              toast.success("Din prenumeration är nu aktiv!", {
                description: `Du har nu tillgång till ${features.tier} funktioner.`,
                duration: 5000
              });
            } else {
              toast.warning("Prenumerationen aktiveras fortfarande", {
                description: "Det kan ta upp till en minut. Prova att uppdatera sidan om problemet kvarstår.",
                duration: 8000
              });
            }
          }, 1000);
        }
      };
      
      scheduleRefreshAttempts();
    }
    
    // Handle subscription update from Stripe portal
    if (subscriptionUpdated && !hasProcessedUpdate) {
      console.log("Processing subscription update, timestamp:", timestamp);
      
      toast.success("Din prenumeration uppdateras...", {
        description: "Vi hämtar dina nya prenumerationsuppgifter.",
        duration: 5000,
        id: `subscription-updated-${timestamp || Date.now()}`
      });
      
      setHasProcessedUpdate(true);
      if (timestamp) {
        lastProcessedTimestamp.current = timestamp;
      }
      
      // Clear URL parameters
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('subscription_updated');
      newSearchParams.delete('ts');
      setSearchParams(newSearchParams);
      
      // Immediate refresh
      refreshSubscription(true);
    }
    
    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [searchParams, setSearchParams, refreshSubscription, hasProcessedPayment, hasProcessedUpdate, features.isActive, features.tier]);

  // Reset processed flags when navigating to a new page
  useEffect(() => {
    return () => {
      setHasProcessedPayment(false);
      setHasProcessedUpdate(false);
      lastProcessedTimestamp.current = null;
      refreshAttempts.current = 0;
    };
  }, [window.location.pathname]);

  // Force an immediate refresh when this hook mounts
  useEffect(() => {
    console.log("useSubscriptionStatus mounted - forcing initial refresh");
    refreshSubscription(true);
  }, [refreshSubscription]);

  return {
    features,
    loading,
    refreshSubscription
  };
};

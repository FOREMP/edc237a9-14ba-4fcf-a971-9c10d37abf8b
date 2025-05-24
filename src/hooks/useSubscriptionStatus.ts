
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useSubscriptionFeatures } from './useSubscriptionFeatures';

export const useSubscriptionStatus = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { features, loading, refreshSubscription, syncWithStripe } = useSubscriptionFeatures();
  const refreshTimeoutRef = useRef<number | null>(null);
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false);
  const [hasProcessedUpdate, setHasProcessedUpdate] = useState(false);
  const lastProcessedTimestamp = useRef<string | null>(null);
  const refreshAttempts = useRef<number>(0);
  const maxRefreshAttempts = 5; // Reduced for faster response

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
        duration: 6000,
        id: `payment-${paymentSuccess ? 'success' : 'pending'}-${timestamp || Date.now()}`
      });
      
      // Mark this payment as processed
      setHasProcessedPayment(true);
      if (timestamp) {
        lastProcessedTimestamp.current = timestamp;
      }
      
      // Clear URL parameters immediately to prevent reprocessing
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('payment_success');
      newSearchParams.delete('payment_status');
      newSearchParams.delete('plan');
      newSearchParams.delete('ts');
      setSearchParams(newSearchParams, { replace: true });
      
      // Trigger immediate Stripe synchronization
      const performStripeSync = async () => {
        try {
          console.log("Triggering immediate Stripe synchronization");
          await syncWithStripe(true);
          
          // After sync, refresh the subscription data
          refreshSubscription(true);
          
          // Show success message after a short delay
          setTimeout(() => {
            if (features.isActive && features.tier !== 'free') {
              toast.success("Din prenumeration är nu aktiv!", {
                description: `Du har nu tillgång till ${features.tier} funktioner.`,
                duration: 5000
              });
            }
          }, 2000);
          
        } catch (error) {
          console.error("Stripe sync error:", error);
          toast.error("Kunde inte synkronisera prenumeration med Stripe", {
            description: "Försök uppdatera sidan eller kontakta support.",
            duration: 8000
          });
        }
      };
      
      // Start sync immediately
      performStripeSync();
      
      // Reset refresh attempts counter
      refreshAttempts.current = 0;
      
      // Schedule additional refresh attempts with shorter intervals
      const scheduleRefreshAttempts = () => {
        if (refreshAttempts.current < maxRefreshAttempts) {
          const delay = Math.min(2000, Math.pow(1.3, refreshAttempts.current) * 500); // Faster intervals
          
          console.log(`Scheduling refresh attempt ${refreshAttempts.current + 1}/${maxRefreshAttempts} after ${delay}ms`);
          
          refreshTimeoutRef.current = window.setTimeout(() => {
            console.log(`Executing refresh attempt ${refreshAttempts.current + 1}/${maxRefreshAttempts}`);
            refreshSubscription(true);
            refreshAttempts.current++;
            scheduleRefreshAttempts();
            refreshTimeoutRef.current = null;
          }, delay);
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
      setSearchParams(newSearchParams, { replace: true });
      
      // Immediate sync and refresh
      syncWithStripe(true).then(() => {
        refreshSubscription(true);
      }).catch(error => {
        console.error("Error syncing subscription update:", error);
        toast.error("Kunde inte uppdatera prenumerationen");
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [searchParams, setSearchParams, refreshSubscription, syncWithStripe, hasProcessedPayment, hasProcessedUpdate, features.isActive, features.tier]);

  // Reset processed flags when navigating to a new page
  useEffect(() => {
    const handleBeforeUnload = () => {
      setHasProcessedPayment(false);
      setHasProcessedUpdate(false);
      lastProcessedTimestamp.current = null;
      refreshAttempts.current = 0;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  // Force an immediate refresh when this hook mounts
  useEffect(() => {
    console.log("useSubscriptionStatus mounted - forcing initial refresh");
    refreshSubscription(true);
  }, [refreshSubscription]);

  return {
    features,
    loading,
    refreshSubscription,
    syncWithStripe
  };
};

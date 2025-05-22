
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useSubscriptionFeatures } from './useSubscriptionFeatures';

export const useSubscriptionStatus = () => {
  const [searchParams] = useSearchParams();
  const { features, loading, refreshSubscription } = useSubscriptionFeatures();
  const refreshTimeoutRef = useRef<number | null>(null);
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false);
  const [hasProcessedUpdate, setHasProcessedUpdate] = useState(false);
  const lastProcessedTimestamp = useRef<string | null>(null);
  const refreshAttempts = useRef<number>(0);
  const maxRefreshAttempts = 10; // Increased for better reliability

  // Handle payment success and subscription updates with timestamp tracking
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success') === 'true';
    const subscriptionUpdated = searchParams.get('subscription_updated') === 'true';
    const plan = searchParams.get('plan');
    const timestamp = searchParams.get('ts');
    
    // Skip processing if we've already processed this exact timestamp
    if (timestamp && lastProcessedTimestamp.current === timestamp) {
      console.log("Skipping duplicate event with timestamp:", timestamp);
      return;
    }
    
    // Handle initial payment success
    if (paymentSuccess && plan && !hasProcessedPayment) {
      console.log("Processing payment success for plan:", plan, "timestamp:", timestamp);
      
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      toast.success(`Din betalning för ${plan} har genomförts!`, {
        description: "Dina prenumerationsuppgifter uppdateras...",
        duration: 5000,
        id: `payment-success-${timestamp || Date.now()}` // Add timestamp to ensure unique ID
      });
      
      // Mark this payment as processed to prevent duplicate toasts
      setHasProcessedPayment(true);
      if (timestamp) {
        lastProcessedTimestamp.current = timestamp;
      }
      
      // Clear the URL parameters without triggering a navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Reset refresh attempts counter
      refreshAttempts.current = 0;
      
      // Immediate refresh with force parameter to ensure backend data refresh
      refreshSubscription(true);
      
      // Schedule multiple refresh attempts with shorter initial delays for faster updates
      const scheduleNextRefresh = () => {
        if (refreshAttempts.current < maxRefreshAttempts) {
          // Optimized delay pattern: start with very quick checks, then increase the interval
          const delay = refreshAttempts.current < 3 
            ? 200 // First few checks very quick (200ms)
            : Math.pow(1.5, refreshAttempts.current - 3) * 300; // Then use exponential backoff
          
          console.log(`Scheduling refresh attempt ${refreshAttempts.current + 1}/${maxRefreshAttempts} after ${delay}ms`);
          
          refreshTimeoutRef.current = window.setTimeout(() => {
            console.log(`Executing refresh attempt ${refreshAttempts.current + 1}/${maxRefreshAttempts}`);
            refreshSubscription(true); // Pass true to force a fresh fetch
            refreshAttempts.current++;
            scheduleNextRefresh();
            refreshTimeoutRef.current = null;
          }, delay);
        } else {
          // Final check after all attempts
          console.log("Completed all scheduled refresh attempts. Final status check:");
          refreshSubscription(true);
          
          // Show a final status message based on subscription state
          setTimeout(() => {
            if (features.isActive && features.tier !== 'free') {
              toast.success("Din prenumeration är nu aktiv!", {
                description: `Du har nu tillgång till ${features.tier} paket.`,
                duration: 5000
              });
            } else {
              toast.error("Det verkar vara problem med att aktivera din prenumeration", {
                description: "Vänligen försök uppdatera din prenumerationsstatus eller kontakta support.",
                duration: 8000
              });
            }
          }, 800); // Shorter delay for final status message
        }
      };
      
      scheduleNextRefresh();
    }
    
    // Handle subscription update from Stripe portal
    if (subscriptionUpdated && !hasProcessedUpdate) {
      console.log("Processing subscription update, timestamp:", timestamp);
      
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      toast.success("Din prenumeration uppdateras...", {
        description: "Vi hämtar dina nya prenumerationsuppgifter.",
        duration: 5000,
        id: `subscription-updated-${timestamp || Date.now()}` // Add timestamp to ensure unique ID
      });
      
      // Mark this update as processed to prevent duplicate toasts
      setHasProcessedUpdate(true);
      if (timestamp) {
        lastProcessedTimestamp.current = timestamp;
      }
      
      // Clear the URL parameters without triggering a navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Reset refresh attempts counter
      refreshAttempts.current = 0;
      
      // Immediate refresh to get the latest data with force parameter
      refreshSubscription(true);
      
      // More aggressive refresh pattern for faster updates
      // Quick initial checks, then gradually increase interval
      const refreshDelays = [150, 300, 600, 1000, 2000, 3500, 5000]; 
      
      refreshDelays.forEach((delay, index) => {
        setTimeout(() => {
          console.log(`Additional refresh ${index + 1} after subscription update (${delay}ms)`);
          refreshSubscription(true);
        }, delay);
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [searchParams, refreshSubscription, hasProcessedPayment, hasProcessedUpdate, features.isActive, features.tier]);

  // Reset processed flags when URL changes completely (not just params)
  useEffect(() => {
    return () => {
      setHasProcessedPayment(false);
      setHasProcessedUpdate(false);
      lastProcessedTimestamp.current = null;
      refreshAttempts.current = 0;
    };
  }, [window.location.pathname]);

  // Periodic refresh for updated subscription status
  useEffect(() => {
    // Don't do periodic refresh during specific update operations
    if (hasProcessedPayment || hasProcessedUpdate) return;
    
    const intervalId = window.setInterval(() => {
      console.log("Running periodic subscription refresh check");
      refreshSubscription();
    }, 30000); // Check every 30 seconds during normal operation
    
    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshSubscription, hasProcessedPayment, hasProcessedUpdate]);

  // Force an immediate refresh when this hook mounts
  useEffect(() => {
    console.log("useSubscriptionStatus mounted - forcing refresh");
    refreshSubscription(true);
  }, [refreshSubscription]);

  return {
    features,
    loading,
    refreshSubscription
  };
};

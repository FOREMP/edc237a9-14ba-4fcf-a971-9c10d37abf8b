
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
  const maxRefreshAttempts = 5; // Maximum number of refresh attempts

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
        description: "Dina prenumerationsuppgifter har uppdaterats.",
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
      
      // Immediate refresh followed by multiple delayed ones to ensure backend has updated
      refreshSubscription();
      
      // Schedule multiple refresh attempts with increasing delays
      const scheduleNextRefresh = () => {
        if (refreshAttempts.current < maxRefreshAttempts) {
          const delay = Math.pow(2, refreshAttempts.current) * 500; // Exponential backoff
          console.log(`Scheduling refresh attempt ${refreshAttempts.current + 1} after ${delay}ms`);
          
          refreshTimeoutRef.current = window.setTimeout(() => {
            console.log(`Executing refresh attempt ${refreshAttempts.current + 1}`);
            refreshSubscription();
            refreshAttempts.current++;
            scheduleNextRefresh();
            refreshTimeoutRef.current = null;
          }, delay);
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
      
      toast.success("Din prenumeration har uppdaterats!", {
        description: "Dina nya prenumerationsuppgifter har laddats.",
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
      
      // Immediate refresh to get the latest data
      refreshSubscription();
      
      // Schedule multiple refresh attempts with increasing delays and frequency
      const refreshDelays = [500, 1000, 2000, 3000, 5000, 8000]; // Fibonacci-like sequence for more frequent early checks
      
      refreshDelays.forEach((delay, index) => {
        setTimeout(() => {
          console.log(`Additional refresh ${index + 1} after subscription update (${delay}ms)`);
          refreshSubscription();
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
  }, [searchParams, refreshSubscription, hasProcessedPayment, hasProcessedUpdate]);

  // Reset processed flags when URL changes completely (not just params)
  useEffect(() => {
    return () => {
      setHasProcessedPayment(false);
      setHasProcessedUpdate(false);
      lastProcessedTimestamp.current = null;
      refreshAttempts.current = 0;
    };
  }, [window.location.pathname]);

  // Add a periodic refresh to ensure subscription status is up-to-date
  // This helps catch any changes made outside the app's direct flow
  useEffect(() => {
    // Don't do periodic refresh during specific update operations
    if (hasProcessedPayment || hasProcessedUpdate) return;
    
    const intervalId = window.setInterval(() => {
      console.log("Running periodic subscription refresh check");
      refreshSubscription();
    }, 30000); // Check every 30 seconds
    
    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshSubscription, hasProcessedPayment, hasProcessedUpdate]);

  // Force an immediate refresh when this hook mounts
  useEffect(() => {
    console.log("useSubscriptionStatus mounted - forcing refresh");
    refreshSubscription();
  }, [refreshSubscription]);

  return {
    features,
    loading,
    refreshSubscription
  };
};

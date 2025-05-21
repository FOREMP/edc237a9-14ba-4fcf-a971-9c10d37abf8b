
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
      
      // Immediate refresh followed by a delayed one to ensure backend has updated
      refreshSubscription();
      
      refreshTimeoutRef.current = window.setTimeout(() => {
        console.log("Second refresh after successful payment");
        refreshSubscription();
        refreshTimeoutRef.current = null;
      }, 1500);
    }
    
    // Handle subscription update from Stripe portal
    if (subscriptionUpdated && !hasProcessedUpdate) {
      console.log("Processing subscription update, timestamp:", timestamp);
      
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
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
      
      // Immediate refresh followed by several delayed ones to ensure the backend has fully updated
      refreshSubscription();
      
      // Schedule multiple refreshes with increasing delays to catch any backend propagation delays
      const refreshDelays = [1000, 3000, 6000];
      
      refreshDelays.forEach((delay, index) => {
        setTimeout(() => {
          console.log(`Additional refresh ${index + 1} after subscription update`);
          refreshSubscription();
        }, delay);
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [searchParams, refreshSubscription, hasProcessedPayment, hasProcessedUpdate]);

  // Reset processed flags when URL changes completely (not just params)
  useEffect(() => {
    return () => {
      setHasProcessedPayment(false);
      setHasProcessedUpdate(false);
      lastProcessedTimestamp.current = null;
    };
  }, [window.location.pathname]);

  return {
    features,
    loading,
    refreshSubscription
  };
};

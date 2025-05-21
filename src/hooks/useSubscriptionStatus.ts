
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useSubscriptionFeatures } from './useSubscriptionFeatures';

export const useSubscriptionStatus = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
      
      // Refresh subscription data with a slight delay to ensure backend has updated
      refreshTimeoutRef.current = window.setTimeout(() => {
        console.log("Refreshing after successful payment");
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
      
      // Refresh subscription data with a slight delay to ensure backend has updated
      refreshTimeoutRef.current = window.setTimeout(() => {
        console.log("Refreshing after subscription update");
        refreshSubscription();
        refreshTimeoutRef.current = null;
      }, 1500);
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

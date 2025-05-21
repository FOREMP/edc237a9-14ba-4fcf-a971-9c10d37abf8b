
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

  // Handle payment success and refresh subscription data with debounce
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success') === 'true';
    const subscriptionUpdated = searchParams.get('subscription_updated') === 'true';
    const plan = searchParams.get('plan');
    
    // Handle initial payment success
    if (paymentSuccess && plan && !hasProcessedPayment) {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      
      toast.success(`Din betalning för ${plan} har genomförts!`, {
        description: "Dina prenumerationsuppgifter har uppdaterats.",
        duration: 5000,
        id: "payment-success" // Set unique ID to prevent duplicate toasts
      });
      
      // Mark this payment as processed to prevent duplicate toasts
      setHasProcessedPayment(true);
      
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
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      
      toast.success("Din prenumeration har uppdaterats!", {
        description: "Dina nya prenumerationsuppgifter har laddats.",
        duration: 5000,
        id: "subscription-updated" // Set unique ID to prevent duplicate toasts
      });
      
      // Mark this update as processed to prevent duplicate toasts
      setHasProcessedUpdate(true);
      
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

  return {
    features,
    loading,
    refreshSubscription
  };
};

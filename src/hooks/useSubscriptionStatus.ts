
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useSubscriptionFeatures } from './useSubscriptionFeatures';

export const useSubscriptionStatus = () => {
  const [searchParams] = useSearchParams();
  const { features, loading, refreshSubscription } = useSubscriptionFeatures();
  const refreshTimeoutRef = useRef<number | null>(null);
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false);

  // Handle payment success and refresh subscription data with debounce
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success') === 'true';
    const plan = searchParams.get('plan');
    
    if (paymentSuccess && plan && !hasProcessedPayment) {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      
      toast.success(`Din betalning för ${plan} har genomförts!`, {
        description: "Dina prenumerationsuppgifter har uppdaterats."
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
    
    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [searchParams, refreshSubscription, hasProcessedPayment]);

  return {
    features,
    loading,
    refreshSubscription
  };
};

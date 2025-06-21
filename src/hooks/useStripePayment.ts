
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

type PlanType = 'basic' | 'standard' | 'premium' | 'single';

export const useStripePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handlePayment = async (plan: PlanType) => {
    console.log('Payment attempt started for plan:', plan);
    console.log('Authentication status:', { isAuthenticated, userId: user?.id });
    
    if (!isAuthenticated || !user?.id) {
      toast.info("Du måste logga in för att köpa en prenumeration");
      navigate('/auth', { state: { from: '/pricing' } });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Initierar betalning för plan:', plan);
      
      const timestamp = Date.now();
      
      // Verify we have a valid session before proceeding
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('Session error:', sessionError);
        toast.error('Du behöver logga in på nytt för att fortsätta.');
        navigate('/auth');
        return;
      }
      
      // Store session info in localStorage to preserve it across redirect
      localStorage.setItem('supabase_session_backup', JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        user_id: user.id,
        timestamp: timestamp
      }));
      
      // Create checkout session with proper error handling
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan,
          test_mode: true,
          timestamp: timestamp,
          return_url: `${window.location.origin}/dashboard?payment_success=true&plan=${plan}&ts=${timestamp}&user_id=${user.id}`
        }
      });
      
      if (error) {
        console.error('Edge Function error:', error);
        
        // Handle specific error types
        if (error.message?.includes('Failed to fetch')) {
          toast.error('Kunde inte ansluta till betalningsgränssnittet. Kontrollera din internetanslutning och försök igen.');
        } else if (error.message?.includes('401') || error.message?.includes('Authentication')) {
          toast.error('Du behöver logga in på nytt för att fortsätta.');
          navigate('/auth');
        } else if (error.message?.includes('STRIPE_SECRET_KEY')) {
          toast.error('Betalningssystemet är inte korrekt konfigurerat. Kontakta administratören.');
        } else {
          toast.error(`Ett fel uppstod: ${error.message || 'Kunde inte skapa betalningssession'}`);
        }
        return;
      }
      
      if (!data || !data.url) {
        console.error('Inget data eller URL returnerades från betalningsfunktionen:', data);
        toast.error('Kunde inte skapa betalningslänk. Försök igen senare.');
        return;
      }
      
      if (data.error) {
        console.error('Betalningsfunktion returnerade fel:', data.error);
        
        if (data.error.includes('testnycklar') || data.error.includes('test mode')) {
          toast.error('Stripe är konfigurerad med en produktionsnyckel. Kontakta administratören för att byta till testnyckel.');
        } else if (data.error.includes('card declined')) {
          toast.error('Kortet avvisades. För testmode, använd kortnummer 4242 4242 4242 4242.');
        } else if (data.error.includes('customer')) {
          toast.error('Problem med kundkonto. Försök igen eller kontakta support.');
        } else {
          toast.error(`Betalningsfel: ${data.error}`);
        }
        return;
      }
      
      console.log('Betalningslänk skapad, omdirigerar till:', data.url);
      
      // Store the timestamp and plan in localStorage to verify when returning from Stripe
      localStorage.setItem('stripe_checkout_timestamp', timestamp.toString());
      localStorage.setItem('stripe_checkout_plan', plan);
      
      // Redirect to Stripe checkout
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Betalningsfel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
      console.error('Detaljerad felinformation:', errorMessage);
      
      // Handle network errors specifically
      if (errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
        toast.error('Nätverksfel. Kontrollera din internetanslutning och försök igen.');
      } else if (errorMessage.includes('timeout')) {
        toast.error('Begäran tog för lång tid. Försök igen.');
      } else {
        toast.error(`Ett fel uppstod vid betalning: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    handlePayment,
    isLoading
  };
};

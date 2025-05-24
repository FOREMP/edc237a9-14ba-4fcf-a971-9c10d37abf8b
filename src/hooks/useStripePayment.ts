
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
      
      const timestamp = Date.now(); // Unique timestamp for this payment attempt
      
      // Store session info in localStorage to preserve it across redirect
      const session = await supabase.auth.getSession();
      if (session.data.session) {
        localStorage.setItem('supabase_session_backup', JSON.stringify({
          access_token: session.data.session.access_token,
          refresh_token: session.data.session.refresh_token,
          user_id: user.id,
          timestamp: timestamp
        }));
      }
      
      // Add test mode parameter and timestamp to prevent caching
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan,
          test_mode: true, // Always use test mode in development
          timestamp: timestamp, // Prevent caching
          return_url: `${window.location.origin}/dashboard?payment_success=true&plan=${plan}&ts=${timestamp}&user_id=${user.id}`
        }
      });
      
      if (error) {
        console.error('Edge Function error:', error);
        
        if (error.message?.includes('Failed to fetch')) {
          toast.error('Kunde inte ansluta till betalningsgränssnittet. Kontrollera din internetanslutning och försök igen.');
        } else if (error.message?.includes('401')) {
          toast.error('Du behöver logga in på nytt för att fortsätta.');
          navigate('/auth');
        } else {
          toast.error(`Ett fel uppstod: ${error.message || 'Kunde inte skapa betalningssession'}`);
        }
        return;
      }
      
      if (!data) {
        console.error('Inget data returnerades från betalningsfunktionen');
        toast.error('Kunde inte skapa betalningslänk. Försök igen senare.');
        return;
      }
      
      if (data.error) {
        console.error('Betalningsfunktion returnerade fel:', data.error);
        
        if (data.error.includes('testnycklar')) {
          toast.error('Stripe är konfigurerad med en produktionsnyckel. Kontakta administratören för att byta till testnyckel.');
        } else if (data.error.includes('card declined')) {
          toast.error('Kortet avvisades. För testmode, använd kortnummer 4242 4242 4242 4242.');
        } else {
          toast.error(`Betalningsfel: ${data.error}`);
        }
        return;
      }
      
      if (data.url) {
        console.log('Betalningslänk skapad, omdirigerar till:', data.url);
        
        // Store the timestamp and plan in localStorage to verify when returning from Stripe
        localStorage.setItem('stripe_checkout_timestamp', timestamp.toString());
        localStorage.setItem('stripe_checkout_plan', plan);
        
        // Redirect to Stripe checkout (preserving session context)
        window.location.href = data.url;
      } else {
        console.error('Ingen URL returnerades:', data);
        toast.error('Kunde inte skapa betalningslänk. Försök igen senare.');
      }
    } catch (error) {
      console.error('Betalningsfel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
      console.error('Detaljerad felinformation:', errorMessage);
      toast.error('Ett fel uppstod vid betalning. Försök igen senare.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    handlePayment,
    isLoading
  };
};

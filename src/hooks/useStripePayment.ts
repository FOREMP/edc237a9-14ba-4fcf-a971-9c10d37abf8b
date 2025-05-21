
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

type PlanType = 'basic' | 'standard' | 'premium' | 'single';

export const useStripePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handlePayment = async (plan: PlanType) => {
    if (!isAuthenticated) {
      toast.info("Du måste logga in för att köpa en prenumeration");
      navigate('/auth', { state: { from: '/pricing' } });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Initierar betalning för plan:', plan);
      
      const timestamp = Date.now(); // Unique timestamp for this payment attempt
      
      // Add test mode parameter and timestamp to prevent caching
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan,
          test_mode: true, // Always use test mode in development
          timestamp: timestamp, // Prevent caching
          return_url: `${window.location.origin}/dashboard?payment_success=true&plan=${plan}&ts=${timestamp}`
        }
      });
      
      if (error) {
        console.error('Stripe funktionsfel:', error);
        
        if (error.message?.includes('Edge Function returned a non-2xx status code')) {
          toast.error('Ett fel uppstod vid anslutning till betalningsgränssnittet. Kontakta administratören.');
          console.error('Supabase funktionsfel: Edge Function returned a non-2xx status code');
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
        if (data.error.includes('testnycklar')) {
          toast.error('Stripe är konfigurerad med en produktionsnyckel. Kontakta administratören för att byta till testnyckel.');
          console.error('Stripe konfigurationsfel:', data.error);
        } else if (data.error.includes('card declined')) {
          toast.error('Kortet avvisades. För testmode, använd kortnummer 4242 4242 4242 4242.');
        } else {
          console.error('Betalningsfunktion returnerade fel:', data.error);
          toast.error(`Betalningsfel: ${data.error}`);
        }
        return;
      }
      
      if (data.url) {
        console.log('Betalningslänk skapad, omdirigerar till:', data.url);
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

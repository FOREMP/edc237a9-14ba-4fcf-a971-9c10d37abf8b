
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const CancelSubscription = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [remainingJobs, setRemainingJobs] = useState<number | null>(null);
  const { features, refreshSubscription } = useSubscriptionStatus();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  // Fetch remaining jobs when component loads
  useEffect(() => {
    const fetchRemainingJobs = async () => {
      try {
        if (!user?.id) return;
        
        const { data, error } = await supabase
          .from('job_posting_limits')
          .select('monthly_post_limit, monthly_posts_used')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!error && data) {
          setRemainingJobs(Math.max(0, data.monthly_post_limit - data.monthly_posts_used));
        }
      } catch (err) {
        console.error("Error fetching remaining jobs:", err);
      }
    };
    
    fetchRemainingJobs();
  }, [user, features]); // Also refresh when features change

  // Pre-fetch the customer portal URL when the component mounts
  useEffect(() => {
    const fetchPortalUrl = async () => {
      if (!features.isActive || !user?.id) return;
      
      try {
        // Include return URL that indicates subscription was updated with timestamp
        const timestamp = Date.now();
        const returnUrl = `${window.location.origin}/dashboard?subscription_updated=true&ts=${timestamp}`;
        
        const { data, error } = await supabase.functions.invoke('customer-portal', {
          body: { return_url: returnUrl }
        });
        
        if (error) {
          console.error('Error pre-fetching customer portal URL:', error);
          return;
        }
        
        if (data?.url) {
          setPortalUrl(data.url);
        }
      } catch (error) {
        console.error('Error pre-fetching portal URL:', error);
      }
    };
    
    fetchPortalUrl();
  }, [features.isActive, user?.id]);

  const handleManageSubscription = async () => {
    // If we already have the URL, use it directly
    if (portalUrl) {
      window.location.href = portalUrl;
      return;
    }
    
    // Otherwise generate it on demand
    setIsLoading(true);
    try {
      toast.info("Ansluter till kundportalen...");
      
      const timestamp = Date.now();
      const returnUrl = `${window.location.origin}/dashboard?subscription_updated=true&ts=${timestamp}`;
      
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { return_url: returnUrl }
      });
      
      if (error) {
        console.error('Error accessing customer portal:', error);
        toast.error('Kunde inte öppna kundportalen. Försök igen senare.');
        return;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        toast.error(`Kunde inte öppna kundportalen: ${data.error}`);
        console.error('Portal error details:', data);
      } else {
        toast.error('Kunde inte hämta portallänk. Försök igen senare.');
      }
    } catch (error) {
      console.error('Subscription management error:', error);
      toast.error('Ett fel uppstod. Försök igen senare.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const getPackageName = (tier: string) => {
    switch(tier) {
      case 'basic': return 'Bas';
      case 'standard': return 'Standard';
      case 'premium': return 'Premium';
      case 'single': return 'Enstaka annons';
      default: return 'Inget abonnemang';
    }
  };

  // Detect if the subscription is actually active
  const hasActiveSubscription = features.isActive && ['basic', 'standard', 'premium', 'single'].includes(features.tier);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hantera ditt abonnemang</CardTitle>
        <CardDescription>
          Här kan du hantera eller avsluta ditt nuvarande abonnemang
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Aktuellt paket: {' '}
              <span className="font-medium">
                {getPackageName(features.tier)}
              </span>
            </h3>
            
            {features.expiresAt && (
              <p className="text-sm text-muted-foreground">
                Förnyas: {new Date(features.expiresAt).toLocaleDateString('sv-SE')}
              </p>
            )}
            
            {hasActiveSubscription ? (
              <div className="mt-4">
                <p className="text-sm mb-2">
                  Jobbplatser: {remainingJobs !== null ? 
                    (features.tier === 'premium' ? 'Obegränsat' : 
                    `${remainingJobs} av ${features.monthlyPostLimit} återstår`) : 
                    'Laddar...'}
                </p>
                <p className="text-sm mb-4">
                  För att avsluta eller ändra ditt paket använder du Stripes kundportal nedan.
                  Där kan du:
                </p>
                <ul className="list-disc pl-5 text-sm mb-4 space-y-1">
                  <li>Avsluta ditt abonnemang</li>
                  <li>Byta betalningsmetod</li>
                  <li>Se faktureringshistorik</li>
                  <li>Ändra abonnemang</li>
                </ul>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm mb-4">
                  Du har för närvarande inget aktivt abonnemang. Uppgradera för att få tillgång till fler funktioner.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {hasActiveSubscription ? (
          <Button 
            onClick={handleManageSubscription} 
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Laddar...
              </>
            ) : "Avsluta eller hantera prenumeration"}
          </Button>
        ) : (
          <Button onClick={handleUpgrade}>
            Uppgradera
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default CancelSubscription;


import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, Loader2Icon, PieChart, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";

interface SubscriptionStatusCardProps {
  features: SubscriptionFeatures;
  remainingJobs: number | null;
  refreshSubscription: () => void;
}

const SubscriptionStatusCard = ({ features, remainingJobs, refreshSubscription }: SubscriptionStatusCardProps) => {
  const navigate = useNavigate();
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getPlanBadgeColor = (tier: string) => {
    switch (tier) {
      case 'basic': return 'bg-green-500 hover:bg-green-600';
      case 'standard': return 'bg-blue-500 hover:bg-blue-600';
      case 'premium': return 'bg-purple-500 hover:bg-purple-600';
      case 'single': return 'bg-orange-500 hover:bg-orange-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);
    try {
      toast.info("Ansluter till kundportalen...");
      const { data, error } = await supabase.functions.invoke('customer-portal', {});
      
      if (error) {
        console.error('Error accessing customer portal:', error);
        toast.error('Kunde inte öppna kundportalen. Försök igen senare.');
        return;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        toast.error(`Kunde inte öppna kundportalen: ${data.error}`);
        console.error('Portal error:', data.error, data.details);
      } else {
        toast.error('Kunde inte hämta portallänk. Försök igen senare.');
      }
    } catch (error) {
      console.error('Subscription management error:', error);
      toast.error('Ett fel uppstod. Försök igen senare.');
    } finally {
      setIsManagingSubscription(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setIsRefreshing(true);
    try {
      toast.info("Uppdaterar prenumerationsstatus...");
      refreshSubscription();
      setTimeout(() => {
        toast.success("Prenumerationsstatus uppdaterad");
        setIsRefreshing(false);
      }, 1500);
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Kunde inte uppdatera prenumerationsstatus');
      setIsRefreshing(false);
    }
  };

  // Calculate the used vs total jobs based on the subscription tier
  const usedJobs = features.monthlyPostsUsed || 0;
  const totalJobs = features.monthlyPostLimit;
  const availableJobs = Math.max(0, totalJobs - usedJobs);

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl">Ditt abonnemang</CardTitle>
          <CardDescription>Hantera din prenumeration och se dina förmåner</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={handleRefreshSubscription}
            disabled={isRefreshing}
            title="Uppdatera prenumerationsstatus"
          >
            {isRefreshing ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Badge className={getPlanBadgeColor(features.tier)}>
            {features.tier === 'free' ? 'Inget abonnemang' : 
             features.tier === 'basic' ? 'Bas' :
             features.tier === 'standard' ? 'Standard' :
             features.tier === 'premium' ? 'Premium' : 
             features.tier === 'single' ? 'Enstaka annons' : 'Okänd plan'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Jobbannonser</div>
            <div className="font-medium">
              {features.tier === 'premium' 
                ? 'Obegränsat antal' 
                : `${availableJobs} av ${totalJobs} återstår`}
            </div>
            {features.tier !== 'premium' && (
              <Progress 
                value={((totalJobs - availableJobs) / Math.max(1, totalJobs)) * 100} 
                className="mt-2 h-2" 
              />
            )}
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Statistik</div>
            <div className="font-medium">
              {features.hasAdvancedStats ? (
                <span className="flex items-center text-purple-600">
                  <Sparkles className="h-4 w-4 mr-1" /> Avancerad statistik
                </span>
              ) : features.hasJobViewStats ? (
                <span className="flex items-center text-blue-600">
                  <PieChart className="h-4 w-4 mr-1" /> Visningsstatistik
                </span>
              ) : (
                <span className="text-muted-foreground">Ej tillgängligt</span>
              )}
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Support</div>
            <div className="font-medium">
              {features.hasPrioritySupport ? (
                <span className="flex items-center text-purple-600">
                  <Award className="h-4 w-4 mr-1" /> Prioriterad support
                </span>
              ) : (
                <span>Standard support</span>
              )}
            </div>
          </div>
        </div>
        
        {features.expiresAt && (
          <p className="text-sm text-muted-foreground mb-2">
            Din prenumeration förnyas: {new Date(features.expiresAt).toLocaleDateString('sv-SE')}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button 
          variant="outline"
          onClick={() => navigate('/pricing')}
        >
          Se alla planer
        </Button>
        <Button 
          onClick={handleManageSubscription}
          disabled={isManagingSubscription || !features.isActive}
        >
          {isManagingSubscription ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Laddar...
            </>
          ) : "Hantera prenumeration"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionStatusCard;

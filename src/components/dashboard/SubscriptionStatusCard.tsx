
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, Loader2Icon, PieChart, Sparkles, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import JobBoostingCard from "./JobBoostingCard";

interface SubscriptionStatusCardProps {
  features: SubscriptionFeatures;
  remainingJobs: number | null;
  refreshSubscription: () => void;
}

const SubscriptionStatusCard = ({ features, remainingJobs, refreshSubscription }: SubscriptionStatusCardProps) => {
  const navigate = useNavigate();
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  // Pre-fetch portal URL for better user experience
  useEffect(() => {
    const fetchPortalUrl = async () => {
      if (!features.isActive) return;
      
      try {
        const timestamp = Date.now();
        const returnUrl = `${window.location.origin}/dashboard?subscription_updated=true&ts=${timestamp}`;
        
        const { data, error } = await supabase.functions.invoke('customer-portal', {
          body: { return_url: returnUrl }
        });
        
        if (error || !data?.url) {
          return;
        }
        
        setPortalUrl(data.url);
      } catch (error) {
        // Silent failure for portal URL pre-fetch
      }
    };
    
    if (features.isActive) {
      fetchPortalUrl();
    }
  }, [features.isActive]);

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
    if (portalUrl) {
      window.location.href = portalUrl;
      return;
    }
    
    setIsManagingSubscription(true);
    try {
      const timestamp = Date.now();
      const returnUrl = `${window.location.origin}/dashboard?subscription_updated=true&ts=${timestamp}`;
      
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { return_url: returnUrl }
      });
      
      if (error) {
        toast.error('Kunde inte öppna kundportalen. Försök igen senare.');
        return;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        toast.error(`Kunde inte öppna kundportalen: ${data.error}`);
      } else {
        toast.error('Kunde inte hämta portallänk. Försök igen senare.');
      }
    } catch (error) {
      toast.error('Ett fel uppstod. Försök igen senare.');
    } finally {
      setIsManagingSubscription(false);
    }
  };

  const handleStatisticsClick = () => {
    if (features.hasJobViewStats || features.hasAdvancedStats) {
      navigate('/statistics');
    }
  };

  // Calculate the used vs total jobs based on the subscription tier
  const usedJobs = features.monthlyPostsUsed || 0;
  const totalJobs = features.monthlyPostLimit;
  const availableJobs = Math.max(0, totalJobs - usedJobs);
  
  // Determine if subscription is actually active
  const hasActiveSubscription = features.isActive && ['basic', 'standard', 'premium', 'single'].includes(features.tier);

  const getStatisticsText = () => {
    if (features.tier === 'basic') {
      return 'Inte tillgänglig';
    } else if (features.tier === 'standard') {
      return 'Grundläggande statistik';
    } else if (features.tier === 'premium') {
      return 'Avancerad statistik';
    }
    return 'Inte tillgänglig';
  };

  const getStatisticsIcon = () => {
    if (features.hasAdvancedStats) {
      return <Sparkles className="h-4 w-4 mr-1" />;
    } else if (features.hasJobViewStats) {
      return <PieChart className="h-4 w-4 mr-1" />;
    }
    return null;
  };

  const canAccessStats = features.hasJobViewStats || features.hasAdvancedStats;

  return (
    <div className="mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl">Ditt abonnemang</CardTitle>
            <CardDescription>Hantera din prenumeration och se dina förmåner</CardDescription>
          </div>
          <Badge className={getPlanBadgeColor(features.tier)}>
            {features.tier === 'free' ? 'Gratis' : 
             features.tier === 'basic' ? 'Basic' :
             features.tier === 'standard' ? 'Standard' :
             features.tier === 'premium' ? 'Premium' : 
             features.tier === 'single' ? 'Enstaka annons' : 'Okänd plan'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-4 mb-4 ${features.tier === 'premium' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Jobbannonser</div>
              <div className="font-medium">
                {features.tier === 'premium' 
                  ? 'Unlimited' 
                  : `${availableJobs} av ${totalJobs} återstår`}
              </div>
              {features.tier !== 'premium' && (
                <Progress 
                  value={((totalJobs - availableJobs) / Math.max(1, totalJobs)) * 100} 
                  className="mt-2 h-2" 
                />
              )}
            </div>
            
            <div 
              className={`p-4 border rounded-lg ${canAccessStats ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={canAccessStats ? handleStatisticsClick : undefined}
            >
              <div className="text-sm text-muted-foreground mb-1">Statistik</div>
              <div className="font-medium">
                {canAccessStats ? (
                  <span className={`flex items-center ${features.hasAdvancedStats ? 'text-purple-600' : 'text-blue-600'}`}>
                    {getStatisticsIcon()} {getStatisticsText()}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{getStatisticsText()}</span>
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

            {features.tier === 'premium' && (
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Jobbboost</div>
                <div className="font-medium">
                  <span className="flex items-center text-purple-600">
                    <TrendingUp className="h-4 w-4 mr-1" /> Tillgänglig
                  </span>
                </div>
              </div>
            )}
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
          
          {hasActiveSubscription ? (
            <Button 
              onClick={handleManageSubscription}
              disabled={isManagingSubscription}
            >
              {isManagingSubscription ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Laddar...
                </>
              ) : "Hantera prenumeration"}
            </Button>
          ) : (
            <Button 
              onClick={() => navigate('/pricing')}
              variant="default"
            >
              Uppgradera abonnemang
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Job Boosting Card for Premium users */}
      {features.tier === 'premium' && (
        <JobBoostingCard />
      )}
    </div>
  );
};

export default SubscriptionStatusCard;

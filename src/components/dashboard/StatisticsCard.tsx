
import { PieChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const StatisticsCard = () => {
  const navigate = useNavigate();
  const { features } = useSubscriptionStatus();

  // Show for Standard or Premium plans (not basic or free)
  const canAccessStats = features.hasJobViewStats || features.hasAdvancedStats;

  return (
    <Card 
      className={`transition-all ${canAccessStats ? 'cursor-pointer hover:shadow-md' : 'opacity-60'}`}
      onClick={canAccessStats ? () => navigate('/statistics') : undefined}
    >
      <CardContent className="p-6 flex items-center space-x-4">
        <div className={`p-3 rounded-full ${canAccessStats ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <PieChart className={`h-6 w-6 ${canAccessStats ? 'text-blue-500' : 'text-gray-400'}`} />
        </div>
        <div>
          <h3 className="text-lg font-medium">Visningsstatistik</h3>
          <p className="text-muted-foreground">
            {canAccessStats 
              ? (features.hasAdvancedStats 
                  ? 'Se detaljerad statistik för dina annonser' 
                  : 'Se hur dina jobbannonser presterar')
              : 'Inte tillgänglig'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsCard;

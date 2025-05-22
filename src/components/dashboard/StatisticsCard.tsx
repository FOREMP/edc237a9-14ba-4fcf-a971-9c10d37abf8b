
import { PieChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const StatisticsCard = () => {
  const navigate = useNavigate();
  const { features } = useSubscriptionStatus();

  // Only show for Standard or Premium plans (not basic or free)
  if (!features.hasJobViewStats && !features.hasAdvancedStats) {
    return null;
  }

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md" 
      onClick={() => navigate('/statistics')}
    >
      <CardContent className="p-6 flex items-center space-x-4">
        <div className="bg-blue-100 p-3 rounded-full">
          <PieChart className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-medium">Visningsstatistik</h3>
          <p className="text-muted-foreground">
            {features.hasAdvancedStats 
              ? 'Se detaljerad statistik för dina annonser' 
              : 'Se hur dina jobbannonser presterar'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsCard;

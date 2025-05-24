
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointer } from "lucide-react";
import { useJobViewStats } from "@/hooks/useJobViewStats";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface JobViewsStatsProps {
  jobId: string;
}

const JobViewsStats = ({ jobId }: JobViewsStatsProps) => {
  const { stats, isLoading, error } = useJobViewStats(jobId);
  const { features } = useSubscriptionStatus();

  // Only show for Standard or Premium plans
  if (!features.hasJobViewStats && !features.hasAdvancedStats) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Statistik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-2">
            <div className="w-4 h-4 rounded-full border-2 border-t-primary border-primary/30 animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Statistik</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Kunde inte ladda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Statistik</CardTitle>
        <CardDescription className="text-xs">Visningar senaste 30 dagarna</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-blue-500" />
            <span className="text-xs">Visningar</span>
          </div>
          <span className="font-semibold text-sm">{stats.impressions}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MousePointer size={14} className="text-green-500" />
            <span className="text-xs">Klick</span>
          </div>
          <span className="font-semibold text-sm">{stats.detailViews}</span>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Totalt</span>
            <span className="font-bold text-sm">{stats.totalViews}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobViewsStats;

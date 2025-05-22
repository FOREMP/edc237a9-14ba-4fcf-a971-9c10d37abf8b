
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, MousePointer } from "lucide-react";
import { useJobViewsStats } from '@/hooks/useJobViews';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface JobViewsStatsProps {
  jobId: string;
}

const JobViewsStats = ({ jobId }: JobViewsStatsProps) => {
  const { features } = useSubscriptionStatus();
  const { impressions, detailViews, isLoading, error } = useJobViewsStats(jobId);
  
  // FIXED: Only show stats for Standard and Premium plans (not Basic)
  if (!features.hasJobViewStats && !features.hasAdvancedStats) {
    return null;
  }
  
  if (error) {
    return (
      <Card className="bg-red-50">
        <CardContent className="pt-6 text-center text-red-600">
          <p>Det gick inte att ladda visningsstatistik</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Visningsstatistik</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <MousePointer className="h-4 w-4 mr-2 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Impressioner</p>
                  <p className="text-xs text-muted-foreground">Job synligt i lista</p>
                </div>
              </div>
              <p className="text-2xl font-bold">{impressions}</p>
            </div>
            
            <div className="p-4 border rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-2 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Detaljvisningar</p>
                  <p className="text-xs text-muted-foreground">Klick för mer info</p>
                </div>
              </div>
              <p className="text-2xl font-bold">{detailViews}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobViewsStats;

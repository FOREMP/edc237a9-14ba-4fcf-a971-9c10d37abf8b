import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartLineIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useIsMobile } from "@/hooks/use-mobile";
import { ChartContainer } from "@/components/ui/chart";

interface TrendAnalysisProps {
  jobId?: string; // Optional - if provided, shows stats for a specific job only
}

interface ViewCount {
  date: string;
  impressions: number;
  detailViews: number;
}

interface TrendResult {
  percentChange: number;
  direction: 'up' | 'down' | 'neutral';
  text: string;
}

const TrendAnalysis = ({ jobId }: TrendAnalysisProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewData, setViewData] = useState<ViewCount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<'week' | 'month'>('week');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [impressionTrend, setImpressionTrend] = useState<TrendResult | null>(null);
  const [detailTrend, setDetailTrend] = useState<TrendResult | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchTrendData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Determine date ranges based on selected time frame
        const today = new Date();
        let startDate: Date;
        let previousStartDate: Date;
        let previousEndDate: Date;
        
        if (timeFrame === 'week') {
          startDate = startOfWeek(today, { weekStartsOn: 1 });
          previousStartDate = subWeeks(startDate, 1);
          previousEndDate = addDays(startDate, -1);
        } else { // month
          startDate = startOfMonth(today);
          previousStartDate = startOfMonth(subMonths(today, 1));
          previousEndDate = endOfMonth(subMonths(today, 1));
        }
        
        // Format dates for Postgres
        const startDateStr = startDate.toISOString();
        const previousStartDateStr = previousStartDate.toISOString();
        const previousEndDateStr = previousEndDate.toISOString();
        
        // Query for current period
        let currentQuery = supabase
          .from('job_views')
          .select('created_at, view_type')
          .gte('created_at', startDateStr);
        
        // Add job filter if provided
        if (jobId) {
          currentQuery = currentQuery.eq('job_id', jobId);
        }
        
        const { data: currentData, error: currentError } = await currentQuery;
        
        if (currentError) throw new Error(currentError.message);
        
        // Query for previous period
        let previousQuery = supabase
          .from('job_views')
          .select('created_at, view_type')
          .gte('created_at', previousStartDateStr)
          .lte('created_at', previousEndDateStr);
        
        if (jobId) {
          previousQuery = previousQuery.eq('job_id', jobId);
        }
        
        const { data: previousData, error: previousError } = await previousQuery;
        
        if (previousError) throw new Error(previousError.message);
        
        // Process current data
        const currentImpressionsCount = currentData.filter(item => item.view_type === 'impression').length;
        const currentDetailViewsCount = currentData.filter(item => item.view_type === 'detail').length;
        
        // Process previous data
        const previousImpressionsCount = previousData.filter(item => item.view_type === 'impression').length;
        const previousDetailViewsCount = previousData.filter(item => item.view_type === 'detail').length;
        
        // Calculate trends
        const calculateTrend = (current: number, previous: number): TrendResult => {
          if (previous === 0) {
            if (current === 0) {
              return { percentChange: 0, direction: 'neutral', text: 'Ingen förändring' };
            }
            return { percentChange: 100, direction: 'up', text: '100% ökning (0 → ' + current + ')' };
          }
          
          const percentChange = ((current - previous) / previous) * 100;
          let direction: 'up' | 'down' | 'neutral' = 'neutral';
          if (percentChange > 0) direction = 'up';
          else if (percentChange < 0) direction = 'down';
          
          return {
            percentChange: Math.abs(Math.round(percentChange)),
            direction,
            text: `${Math.abs(Math.round(percentChange))}% ${direction === 'up' ? 'ökning' : direction === 'down' ? 'minskning' : 'ingen förändring'}`
          };
        };
        
        setImpressionTrend(calculateTrend(currentImpressionsCount, previousImpressionsCount));
        setDetailTrend(calculateTrend(currentDetailViewsCount, previousDetailViewsCount));
        
        // Prepare chart data based on timeframe
        const chartData: ViewCount[] = [];
        let dateFormat = timeFrame === 'week' ? 'E' : 'd MMM';
        let increment = timeFrame === 'week' ? 1 : 2; // Daily for week, every other day for month
        let daysToShow = timeFrame === 'week' ? 7 : 30;
        
        // Group data by date
        const groupedData: Record<string, { impressions: number, detailViews: number }> = {};
        
        // Initialize all dates in range with zero counts
        for (let i = 0; i < daysToShow; i += increment) {
          const date = addDays(startDate, i);
          const formattedDate = format(date, dateFormat, { locale: sv });
          groupedData[formattedDate] = { impressions: 0, detailViews: 0 };
        }
        
        // Fill in actual counts
        currentData.forEach(item => {
          const date = new Date(item.created_at);
          const formattedDate = format(date, dateFormat, { locale: sv });
          
          if (groupedData[formattedDate]) {
            if (item.view_type === 'impression') {
              groupedData[formattedDate].impressions++;
            } else if (item.view_type === 'detail') {
              groupedData[formattedDate].detailViews++;
            }
          }
        });
        
        // Convert to array for chart
        Object.entries(groupedData).forEach(([date, counts]) => {
          chartData.push({
            date,
            impressions: counts.impressions,
            detailViews: counts.detailViews
          });
        });
        
        setViewData(chartData);
      } catch (err) {
        console.error('Error fetching trend data:', err);
        setError('Kunde inte ladda trenddata');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrendData();
  }, [jobId, timeFrame]);

  const renderTrendIcon = (trend: TrendResult | null) => {
    if (!trend) return <Minus className="h-5 w-5 text-gray-400" />;
    
    if (trend.direction === 'up') {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    } else if (trend.direction === 'down') {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    } else {
      return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-red-600">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Trendanalys</CardTitle>
            <CardDescription>
              Visningsstatistik över tid
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Button 
                variant={chartType === 'line' ? "default" : "outline"} 
                size="sm"
                onClick={() => setChartType('line')}
              >
                Linje
              </Button>
              <Button 
                variant={chartType === 'bar' ? "default" : "outline"} 
                size="sm"
                onClick={() => setChartType('bar')}
              >
                Stapel
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="week" onValueChange={(value) => setTimeFrame(value as 'week' | 'month')}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="week">Vecka</TabsTrigger>
              <TabsTrigger value="month">Månad</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                {renderTrendIcon(impressionTrend)}
                <span className="text-sm">
                  Listvisningar: <span className="font-medium">{impressionTrend?.text || 'N/A'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {renderTrendIcon(detailTrend)}
                <span className="text-sm">
                  Detaljvisningar: <span className="font-medium">{detailTrend?.text || 'N/A'}</span>
                </span>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="py-10 space-y-2">
              <Skeleton className="h-[250px] w-full" />
            </div>
          ) : (
            <div className="h-[350px]" style={{ width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={{}}>
                  {chartType === 'line' ? (
                    <LineChart
                      data={viewData}
                      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="impressions" 
                        name="Listvisningar" 
                        stroke="#4F46E5" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="detailViews" 
                        name="Detaljvisningar" 
                        stroke="#10B981" 
                      />
                    </LineChart>
                  ) : (
                    <BarChart
                      data={viewData}
                      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="impressions" 
                        name="Listvisningar" 
                        fill="#4F46E5" 
                      />
                      <Bar 
                        dataKey="detailViews" 
                        name="Detaljvisningar" 
                        fill="#10B981" 
                      />
                    </BarChart>
                  )}
                </ChartContainer>
              </ResponsiveContainer>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TrendAnalysis;

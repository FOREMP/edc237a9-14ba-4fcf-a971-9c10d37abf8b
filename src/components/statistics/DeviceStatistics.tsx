
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone, Tablet, Computer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface DeviceStatisticsProps {
  jobId?: string; // Optional - if provided, shows stats for a specific job only
}

interface DeviceData {
  name: string;
  value: number;
  icon: JSX.Element;
  color: string;
}

const DeviceStatistics = ({ jobId }: DeviceStatisticsProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchDeviceStatistics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Build the query
        let query = supabase
          .from('job_views')
          .select('device_type, view_type')
          .eq('view_type', 'detail');
        
        // Add job filter if provided
        if (jobId) {
          query = query.eq('job_id', jobId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw new Error(error.message);
        }
        
        // Group the data by device_type
        const counts: Record<string, number> = {};
        data?.forEach(row => {
          const deviceType = row.device_type || 'unknown';
          counts[deviceType] = (counts[deviceType] || 0) + 1;
        });
        
        // Convert to array of objects for the chart
        const deviceCounts = Object.entries(counts).map(([device_type, count]) => ({ 
          device_type, 
          count 
        }));
        
        // Transform data for the chart
        const formattedData: DeviceData[] = [
          {
            name: 'Mobil',
            value: deviceCounts.find(d => d.device_type === 'mobile')?.count || 0,
            icon: <Smartphone className="h-4 w-4" />,
            color: '#4F46E5' // indigo
          },
          {
            name: 'Surfplatta',
            value: deviceCounts.find(d => d.device_type === 'tablet')?.count || 0,
            icon: <Tablet className="h-4 w-4" />,
            color: '#10B981' // emerald
          },
          {
            name: 'Dator',
            value: deviceCounts.find(d => d.device_type === 'desktop')?.count || 0,
            icon: <Computer className="h-4 w-4" />,
            color: '#F59E0B' // amber
          },
          {
            name: 'Okänd',
            value: deviceCounts.find(d => (d.device_type === 'unknown' || d.device_type === null))?.count || 0,
            icon: <></>,
            color: '#9CA3AF' // gray
          }
        ];
        
        // Filter out zero values
        const filteredData = formattedData.filter(d => d.value > 0);
        
        // If no data found, add a placeholder
        if (filteredData.length === 0) {
          filteredData.push({
            name: 'Inga besök',
            value: 1,
            icon: <></>,
            color: '#E5E7EB' // light gray
          });
        }
        
        setDeviceData(filteredData);
      } catch (err) {
        console.error('Error fetching device statistics:', err);
        setError('Kunde inte ladda enhetsstatistik');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDeviceStatistics();
  }, [jobId]);

  // Calculate total views for percentage
  const totalViews = deviceData.reduce((sum, data) => sum + data.value, 0);
  
  // Calculate percentages and generate text representation
  const getDeviceBreakdown = () => {
    return deviceData
      .filter(d => d.name !== 'Inga besök' && d.name !== 'Okänd')
      .sort((a, b) => b.value - a.value)
      .map(d => `${d.name}: ${Math.round((d.value / totalViews) * 100)}%`)
      .join(', ');
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
      <CardHeader>
        <CardTitle className="text-lg">Enhetsfördelning</CardTitle>
        <CardDescription>
          {isLoading 
            ? 'Laddar enhetsstatistik...' 
            : getDeviceBreakdown() || 'Ingen data tillgänglig'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 space-y-2">
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : (
          <div className="h-[300px]" style={{ width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{}}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={!isMobile}
                    outerRadius={isMobile ? 80 : 100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => isMobile ? '' : `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeviceStatistics;

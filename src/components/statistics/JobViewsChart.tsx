
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface JobViewStat {
  id: string;
  title: string;
  impressions: number;
  detailViews: number;
}

interface JobViewsChartProps {
  jobStats: JobViewStat[];
}

const JobViewsChart = ({ jobStats }: JobViewsChartProps) => {
  // Prepare data for the chart, sort by total views and take top 10
  const chartData = jobStats
    .map(job => ({
      name: job.title.length > 20 ? job.title.substring(0, 20) + '...' : job.title,
      fullName: job.title,
      impressions: job.impressions,
      detailViews: job.detailViews,
      total: job.impressions + job.detailViews
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-blue-600">
            Listvisningar: <span className="font-medium">{data.impressions}</span>
          </p>
          <p className="text-green-600">
            Detaljvisningar: <span className="font-medium">{data.detailViews}</span>
          </p>
          <p className="text-gray-700">
            Totalt: <span className="font-medium">{data.total}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mest visade jobbannonser</CardTitle>
        <CardDescription>
          Jämförelse av visningar för dina olika jobbannonser (topp 10)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Ingen data att visa
          </div>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="impressions" 
                  fill="#3b82f6" 
                  name="Listvisningar"
                  radius={[0, 0, 4, 4]}
                />
                <Bar 
                  dataKey="detailViews" 
                  fill="#10b981" 
                  name="Detaljvisningar"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobViewsChart;

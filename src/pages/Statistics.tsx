import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { jobsServiceApi } from "@/services/jobs/jobs-api"; 
import { supabase } from "@/integrations/supabase/client";
import { Loader2Icon, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DeviceStatistics from "@/components/statistics/DeviceStatistics";
import TrendAnalysis from "@/components/statistics/TrendAnalysis";

interface JobViewStat {
  id: string;
  title: string;
  impressions: number;
  detailViews: number;
}

const Statistics = () => {
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const [jobStats, setJobStats] = useState<JobViewStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { features } = useSubscriptionStatus();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobStatistics = async () => {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      try {
        // Fetch all jobs for the current company using our API service
        const jobs = await jobsServiceApi.getCompanyJobs();
        
        if (!jobs || jobs.length === 0) {
          setIsLoading(false);
          return;
        }

        // For each job, get view statistics from job_views table
        const statsPromises = jobs.map(async (job) => {
          const { impressions, detailViews } = await fetchJobViewCounts(job.id);
          
          return {
            id: job.id,
            title: job.title,
            impressions,
            detailViews
          };
        });
        
        const results = await Promise.all(statsPromises);
        setJobStats(results);
        
        // Set first job as selected by default if we have jobs
        if (results.length > 0 && features.hasAdvancedStats) {
          setSelectedJobId(results[0].id);
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobStatistics();
  }, [isAuthenticated, features]);

  // Helper function to fetch view counts for a specific job
  const fetchJobViewCounts = async (jobId: string) => {
    try {
      // Get impression count
      const { data: impressionData, error: impressionError } = await supabase
        .from('job_views')
        .select('*', { count: 'exact' })
        .eq('job_id', jobId)
        .eq('view_type', 'impression');
      
      if (impressionError) {
        throw impressionError;
      }
      
      // Get detail view count
      const { data: detailData, error: detailError } = await supabase
        .from('job_views')
        .select('*', { count: 'exact' })
        .eq('job_id', jobId)
        .eq('view_type', 'detail');
      
      if (detailError) {
        throw detailError;
      }
      
      return {
        impressions: impressionData?.length || 0,
        detailViews: detailData?.length || 0
      };
    } catch (error) {
      console.error("Error fetching job view counts:", error);
      return { impressions: 0, detailViews: 0 };
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Check if user has access to statistics
  if (!features.hasJobViewStats && !features.hasAdvancedStats) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/dashboard" className="flex items-center">
                <ArrowLeft size={16} className="mr-2" />
                Tillbaka till dashboard
              </Link>
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Statistik inte tillgänglig</CardTitle>
              <CardDescription>
                Din nuvarande prenumeration inkluderar inte tillgång till statistik.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Uppgradera till Standard- eller Premium-paketet för att få tillgång till statistik för dina jobbannonser.</p>
              <Button asChild>
                <Link to="/pricing">Se prenumerationsalternativ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/dashboard" className="flex items-center">
              <ArrowLeft size={16} className="mr-2" />
              Tillbaka till dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Jobbstatistik</h1>
          <p className="text-muted-foreground">
            {features.hasAdvancedStats 
              ? 'Se detaljerad statistik för dina jobbannonser' 
              : 'Se hur dina jobbannonser presterar'}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Översikt av jobbannonser</CardTitle>
            <CardDescription>
              Antal visningar för dina aktiva jobbannonser
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableCaption>Statistik över dina jobbannonser</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Jobbtitel</TableHead>
                    <TableHead>Listvisningar</TableHead>
                    <TableHead>Detaljvisningar</TableHead>
                    <TableHead>Total</TableHead>
                    {features.hasAdvancedStats && (
                      <TableHead className="text-right">Åtgärd</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={features.hasAdvancedStats ? 5 : 4} className="text-center py-8">
                        Inga jobbannonser hittades
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobStats.map((job) => (
                      <TableRow key={job.id} className={selectedJobId === job.id ? "bg-muted/50" : ""}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{job.impressions}</TableCell>
                        <TableCell>{job.detailViews}</TableCell>
                        <TableCell>{job.impressions + job.detailViews}</TableCell>
                        {features.hasAdvancedStats && (
                          <TableCell className="text-right">
                            <Button 
                              variant={selectedJobId === job.id ? "default" : "outline"} 
                              size="sm"
                              onClick={() => setSelectedJobId(job.id)}
                            >
                              {selectedJobId === job.id ? "Vald" : "Välj"}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Premium Analytics Features */}
        {features.hasAdvancedStats && selectedJobId && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold mt-8">Premium analys</h2>
            <p className="text-muted-foreground mb-4">Detaljerad statistik för det valda jobbet</p>
            
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
              <DeviceStatistics jobId={selectedJobId} />
              <TrendAnalysis jobId={selectedJobId} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Statistics;

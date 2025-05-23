import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { jobsServiceApi } from "@/services/jobs/jobs-api"; 
import { supabase } from "@/integrations/supabase/client";
import { Loader2Icon, ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures"; // Changed from useSubscriptionStatus
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
import { toast } from "sonner";

interface JobViewStat {
  id: string;
  title: string;
  impressions: number;
  detailViews: number;
}

const Statistics = () => {
  const { isAuthenticated, isLoading: authLoading, isCompany, user, adminCheckComplete } = useRequireAuth();
  const [jobStats, setJobStats] = useState<JobViewStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const { features } = useSubscriptionFeatures(); // Changed from useSubscriptionStatus
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [hasCheckedJobAccess, setHasCheckedJobAccess] = useState(false);

  // Test job access directly to diagnose company user access issues
  const testCompanyJobsAccess = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return false;
    
    try {
      console.log("Statistics: Testing direct jobs table access for user", user.id);
      
      // First try direct query to jobs table
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('company_id', user.id)
        .limit(1);
      
      if (jobsError) {
        console.error("Statistics: Direct jobs access error:", jobsError);
        return false;
      }
      
      console.log("Statistics: Direct jobs access result:", jobsData);
      
      // Test job_views table access - this is critical for statistics
      const { error: viewsError } = await supabase
        .from('job_views')
        .select('count(*)')
        .eq('job_id', jobsData && jobsData.length > 0 ? jobsData[0].id : '')
        .limit(1);
        
      if (viewsError) {
        console.error("Statistics: Cannot access job_views:", viewsError);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Statistics: Exception during jobs access test:", err);
      return false;
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const checkJobAccess = async () => {
      if (!isAuthenticated || !user?.id || !isCompany) return;
      
      const hasAccess = await testCompanyJobsAccess();
      console.log("Statistics: Job access check result:", hasAccess);
      setHasCheckedJobAccess(true);
      
      if (!hasAccess) {
        setDataError("Det gick inte att komma åt dina jobbdata. Detta kan bero på ett behörighetsproblem.");
      }
    };
    
    if (isAuthenticated && !authLoading && isCompany && adminCheckComplete && !hasCheckedJobAccess) {
      checkJobAccess();
    }
  }, [isAuthenticated, authLoading, isCompany, user?.id, adminCheckComplete, hasCheckedJobAccess, testCompanyJobsAccess]);

  useEffect(() => {
    const fetchJobStatistics = async () => {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      setDataError(null);
      
      try {
        console.log("Statistics: Fetching job statistics for user", user?.id, "role:", user?.role);
        
        // Fetch all jobs for the current company using our API service
        const jobs = await jobsServiceApi.getCompanyJobs();
        
        if (!jobs || jobs.length === 0) {
          console.log("Statistics: No jobs found");
          setIsLoading(false);
          return;
        }

        console.log("Statistics: Found", jobs.length, "jobs");

        // For each job, get view statistics from job_views table
        const statsPromises = jobs.map(async (job) => {
          try {
            const { impressions, detailViews } = await fetchJobViewCounts(job.id);
            
            return {
              id: job.id,
              title: job.title,
              impressions,
              detailViews
            };
          } catch (error) {
            console.error("Error fetching stats for job", job.id, error);
            return {
              id: job.id,
              title: job.title,
              impressions: 0,
              detailViews: 0
            };
          }
        });
        
        const results = await Promise.all(statsPromises);
        setJobStats(results);
        
        // Set first job as selected by default if we have jobs
        if (results.length > 0 && features.hasAdvancedStats) {
          setSelectedJobId(results[0].id);
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
        setDataError("Det gick inte att hämta statistik. Kontrollera din internetanslutning och försök igen.");
        toast.error("Det gick inte att hämta statistik");
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch data if authentication is complete and user is logged in
    if (isAuthenticated && !authLoading && adminCheckComplete && hasCheckedJobAccess) {
      fetchJobStatistics();
    }
  }, [isAuthenticated, authLoading, features, user?.id, user?.role, adminCheckComplete, hasCheckedJobAccess]);

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
        console.error("Error fetching impression data:", impressionError);
        throw impressionError;
      }
      
      // Get detail view count
      const { data: detailData, error: detailError } = await supabase
        .from('job_views')
        .select('*', { count: 'exact' })
        .eq('job_id', jobId)
        .eq('view_type', 'detail');
      
      if (detailError) {
        console.error("Error fetching detail view data:", detailError);
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

  // Improved loading state with more information
  if (authLoading || !adminCheckComplete) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh] flex-col">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Verifierar användarens behörighet...</p>
        </div>
      </Layout>
    );
  }

  // Access verification for company users
  if (isAuthenticated && isCompany && !hasCheckedJobAccess) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh] flex-col">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Verifierar dataåtkomst...</p>
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
            ) : dataError ? (
              <div className="flex flex-col items-center py-8 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
                <p className="text-muted-foreground mb-4">{dataError}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Försök igen
                </Button>
                
                {/* Debug info for data access issues */}
                {user && (
                  <div className="mt-8 p-4 bg-muted rounded-lg max-w-lg w-full">
                    <h3 className="font-medium mb-2">Debug Information</h3>
                    <pre className="text-xs overflow-auto p-2 bg-slate-100 rounded">
                      {JSON.stringify({
                        userId: user.id,
                        email: user.email,
                        role: user.role,
                        isCompany,
                        hasCheckedJobAccess,
                        features: features || "No features data"
                      }, null, 2)}
                    </pre>
                  </div>
                )}
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
        {features.hasAdvancedStats && selectedJobId && !isLoading && !dataError && (
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

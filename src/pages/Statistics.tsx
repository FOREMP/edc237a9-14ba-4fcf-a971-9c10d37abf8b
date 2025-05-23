
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { jobsServiceApi } from "@/services/jobs/jobs-api"; 
import { supabase, diagCompanyAccess } from "@/integrations/supabase/client";
import { Loader2Icon, ArrowLeft, AlertTriangle, RefreshCw, Bug, Database } from "lucide-react";
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

// Define a proper return type for the testCompanyJobsAccess function
type TestAccessResult = 
  | { success: true; jobs: number; message: string; views?: number }
  | { success: false; error: string; step: string; jobId?: string }
  | false;

const Statistics = () => {
  const { isAuthenticated, isLoading: authLoading, isCompany, user, adminCheckComplete } = useRequireAuth();
  const [jobStats, setJobStats] = useState<JobViewStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const { features, dataFetchError } = useSubscriptionFeatures(); // Changed from useSubscriptionStatus
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [hasCheckedJobAccess, setHasCheckedJobAccess] = useState(false);
  const [debugMode, setDebugMode] = useState(true); // Enable debug mode by default for troubleshooting
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [runningDiagnosis, setRunningDiagnosis] = useState(false);

  // Run diagnostics function to help troubleshoot RLS issues
  const runDiagnostics = async () => {
    setRunningDiagnosis(true);
    try {
      const result = await diagCompanyAccess();
      setDiagnosisResult(result);
      console.log("Diagnosis result:", result);
      
      if (result.error) {
        toast.error(`Diagnosis found an error: ${result.error}`);
      } else {
        toast.success("Diagnosis completed");
      }
    } catch (error) {
      console.error("Error running diagnostics:", error);
      setDiagnosisResult({ error: String(error) });
    } finally {
      setRunningDiagnosis(false);
    }
  };

  // Test jobs access directly with detailed error logging
  const testCompanyJobsAccess = useCallback(async (): Promise<TestAccessResult> => {
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
        return {
          success: false,
          error: jobsError.message,
          step: 'jobs_table'
        };
      }
      
      console.log("Statistics: Direct jobs access result:", jobsData);
      
      // If no jobs found, that's fine but log it
      if (!jobsData || jobsData.length === 0) {
        console.log("Statistics: No jobs found for company");
        return {
          success: true, 
          jobs: 0,
          message: "No jobs found, but table access is working"
        };
      }
      
      // Test job_views table access - this is critical for statistics
      const { data: viewsData, error: viewsError } = await supabase
        .from('job_views')
        .select('job_id, view_type', { count: 'exact' })
        .eq('job_id', jobsData[0].id.toString())
        .limit(1);
        
      if (viewsError) {
        console.error("Statistics: Cannot access job_views:", viewsError);
        return {
          success: false,
          error: viewsError.message,
          step: 'job_views_table',
          jobId: jobsData[0].id
        };
      }
      
      return {
        success: true,
        jobs: jobsData.length,
        views: viewsData?.length || 0,
        message: "All tables accessible"
      };
    } catch (err) {
      console.error("Statistics: Exception during jobs access test:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        step: 'exception'
      };
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const checkJobAccess = async () => {
      if (!isAuthenticated || !user?.id || !isCompany) return;
      
      const accessResult = await testCompanyJobsAccess();
      console.log("Statistics: Job access check result:", accessResult);
      setHasCheckedJobAccess(true);
      
      // Fix: Check if accessResult is not false before accessing properties
      if (accessResult && typeof accessResult !== 'boolean') {
        // Further check if success is false before accessing error property
        if (!accessResult.success) {
          setDataError(`Det gick inte att komma åt dina jobbdata: ${accessResult.error}`);
        }
      }
    };
    
    if (isAuthenticated && !authLoading && isCompany && adminCheckComplete && !hasCheckedJobAccess) {
      checkJobAccess();
    }
  }, [isAuthenticated, authLoading, isCompany, user?.id, adminCheckComplete, hasCheckedJobAccess, testCompanyJobsAccess]);

  const refreshStatistics = useCallback(async () => {
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
        setJobStats([]);
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
  }, [isAuthenticated, features.hasAdvancedStats, user?.id, user?.role]);

  useEffect(() => {
    // Only fetch data if authentication is complete and user is logged in
    if (isAuthenticated && !authLoading && adminCheckComplete && hasCheckedJobAccess) {
      refreshStatistics();
    }
  }, [isAuthenticated, authLoading, adminCheckComplete, hasCheckedJobAccess, refreshStatistics]);

  // Helper function to fetch view counts for a specific job
  const fetchJobViewCounts = async (jobId: string) => {
    try {
      console.log("Fetching view counts for job:", jobId);
      
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
      
      console.log(`Job ${jobId} has ${impressionData?.length || 0} impressions and ${detailData?.length || 0} detail views`);
      
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

        {/* Debug Tools for Troubleshooting */}
        {debugMode && (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h3 className="font-medium text-lg mb-2 flex items-center">
              <Bug className="mr-2 text-slate-500" size={20} />
              Debug Tools
            </h3>
            <div className="flex space-x-2 mb-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshStatistics}
              >
                Refresh Statistics
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={runDiagnostics}
                disabled={runningDiagnosis}
              >
                {runningDiagnosis ? <Loader2Icon size={16} className="animate-spin mr-1" /> : null}
                Run Diagnostics
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  localStorage.removeItem('sb-zgcsgwlggvjvvshhhcmb-auth-token');
                  window.location.reload();
                }}
              >
                Clear Auth Cache
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <h4 className="text-sm font-medium mb-1">User and Auth State:</h4>
                <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-20">
                  {JSON.stringify({
                    userId: user?.id,
                    email: user?.email,
                    role: user?.role,
                    isCompany,
                    adminCheckComplete,
                    authLoading,
                    isAuthenticated
                  }, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Features:</h4>
                <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-20">
                  {JSON.stringify({
                    ...features,
                    dataFetchError
                  }, null, 2)}
                </pre>
              </div>
              {diagnosisResult && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Diagnosis Results:</h4>
                  <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(diagnosisResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

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
                  onClick={refreshStatistics} 
                  className="flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Försök igen
                </Button>
                
                {user && debugMode && (
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

        {/* Toggle Debug Mode */}
        <div className="text-center mt-16 text-sm text-slate-400">
          <button 
            onClick={() => setDebugMode(!debugMode)}
            className="inline-flex items-center hover:text-slate-600 transition-colors"
          >
            <Bug size={16} className="mr-1" />
            {debugMode ? "Hide" : "Show"} Debug Mode
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Statistics;

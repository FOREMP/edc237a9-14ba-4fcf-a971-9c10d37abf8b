
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import JobCard from "@/components/JobCard";
import JobFilter from "@/components/JobFilter";
import { Job, JobFilter as JobFilterType } from "@/types";
import { jobsService } from "@/services/jobs";
import { Loader2Icon, AlertCircle, RefreshCw } from "lucide-react";
import { useJobViews, DeviceType } from "@/hooks/useJobViews";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<JobFilterType>({});
  const { trackJobView } = useJobViews();

  // Function to ensure we have a valid session before fetching jobs
  const ensureSession = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        console.log("Refreshing session before job fetch");
        await supabase.auth.refreshSession();
      }
      return true;
    } catch (err) {
      console.log("Session refresh error, continuing:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filter]);

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Ensure session is valid before fetching
      await ensureSession();
      
      console.log("Fetching jobs with filter:", filter);
      // Only show approved jobs in the public jobs list
      const filteredJobs = await jobsService.getFilteredJobs({...filter, status: 'approved'});
      console.log("Fetched approved jobs:", filteredJobs.length);
      
      // Add more clear logging
      if (filteredJobs.length === 0) {
        console.log("No jobs matched the filter criteria");
      } else {
        console.log("First job in results:", filteredJobs[0]);
      }
      
      setJobs(filteredJobs);
      
      // Track impressions for these jobs when they appear in the job listing
      // Also track device type
      const deviceType = getDeviceType();
      filteredJobs.forEach(job => {
        trackJobView(job.id, 'impression', deviceType);
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setError("Kunde inte hämta jobb");
      toast.error("Kunde inte hämta jobb");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to determine device type
  const getDeviceType = (): DeviceType => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  };

  const handleFilterChange = (newFilter: JobFilterType) => {
    console.log("Filter changed:", newFilter);
    setFilter(newFilter);
  };

  const handleRetry = async () => {
    console.log("Retrying job fetch...");
    // Force session refresh and try again
    await supabase.auth.refreshSession();
    fetchJobs();
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Hitta jobb</h1>
          <p className="text-muted-foreground">
            Bläddra bland tillgängliga jobb och hitta din nästa karriärmöjlighet
          </p>
        </div>

        <JobFilter onFilterChange={handleFilterChange} initialFilter={filter} />

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            {isLoading ? "Söker jobb..." : `${jobs.length} lediga tjänster`}
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <div className="flex flex-col items-center gap-2 mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
                <h3 className="text-xl font-semibold">{error}</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Ett fel uppstod vid hämtning av jobb. Vänligen försök igen.
              </p>
              <button 
                onClick={handleRetry}
                className="px-4 py-2 flex items-center gap-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Försök igen
              </button>
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Inga jobbannonser matchar dina kriterier</h3>
              <p className="text-muted-foreground">
                Försök att ändra dina sökkriterier för att hitta fler jobbalternativ.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Jobs;


import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import JobCard from "@/components/JobCard";
import JobFilter from "@/components/JobFilter";
import { Job, JobFilter as JobFilterType } from "@/types";
import { jobsService } from "@/services/jobs";
import { Loader2Icon } from "lucide-react";
import { useJobViews, DeviceType } from "@/hooks/useJobViews";

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<JobFilterType>({});
  const { trackJobView } = useJobViews();

  useEffect(() => {
    fetchJobs();
  }, [filter]);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      // Only show approved jobs in the public jobs list
      const filteredJobs = await jobsService.getFilteredJobs({...filter, status: 'approved'});
      console.log("Fetched approved jobs:", filteredJobs.length);
      setJobs(filteredJobs);
      
      // Track impressions for these jobs when they appear in the job listing
      // Also track device type
      const deviceType = getDeviceType();
      filteredJobs.forEach(job => {
        trackJobView(job.id, 'impression', deviceType);
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);
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

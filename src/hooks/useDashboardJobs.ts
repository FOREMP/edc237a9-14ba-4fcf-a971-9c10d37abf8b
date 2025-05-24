
import { useState, useEffect } from "react";
import { Job, JobFormData } from "@/types";
import { jobsService } from "@/services/jobs";
import { toast } from "sonner";
import { useSubscriptionFeatures } from "./useSubscriptionFeatures";
import { useSubscriptionLimits } from "./useSubscriptionLimits";
import { useNavigate } from "react-router-dom";

export const useDashboardJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const { features, refreshSubscription } = useSubscriptionFeatures();
  const { incrementPostCount, checkPostingLimit, getRemainingJobSlots } = useSubscriptionLimits();
  const [remainingJobs, setRemainingJobs] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      let companyJobs: Job[] = [];
      
      // Fetch appropriate jobs based on the active tab
      if (activeTab === "expired") {
        console.log("Fetching expired jobs");
        companyJobs = await jobsService.getExpiredJobs();
      } else {
        // Hämta alla företagsjobb (non-expired by default)
        companyJobs = await jobsService.getCompanyJobs();
        console.log("Fetched company jobs:", companyJobs);
      }
      
      // Filtrera jobb baserat på aktiv flik
      let filteredJobs = companyJobs;
      if (activeTab === "pending") {
        console.log("Filtering for pending jobs");
        filteredJobs = companyJobs.filter(job => job.status === "pending");
      } else if (activeTab === "approved") {
        filteredJobs = companyJobs.filter(job => job.status === "approved");
      } else if (activeTab === "rejected") {
        filteredJobs = companyJobs.filter(job => job.status === "rejected");
      }
      // For "expired" tab, we already fetched the right jobs
      // For "all" tab, we include all non-expired jobs
      
      console.log("Filtered jobs for tab", activeTab, ":", filteredJobs);
      setJobs(filteredJobs);
      
      // Hämta återstående jobbplatser från Supabase
      const remaining = await getRemainingJobSlots();
      setRemainingJobs(remaining);
      console.log("Remaining job slots:", remaining);
      
    } catch (error) {
      console.error("Error fetching company jobs:", error);
      toast.error("Kunde inte hämta jobb");
    } finally {
      setIsLoading(false);
    }
  };

  const createJob = async (formData: JobFormData): Promise<boolean> => {
    try {
      console.log("Checking posting limit before creating job");
      // Kontrollera först om användaren kan publicera (har inte nått gränsen)
      const canPost = await checkPostingLimit();
      if (!canPost) {
        console.log("User has reached their posting limit");
        return false;
      }
      
      console.log("Creating job with data:", formData);
      const newJob = await jobsService.createJob(formData);
      
      if (newJob) {
        console.log("Job created successfully:", newJob);
        
        // Uppdatera jobblistan med det nya jobbet
        setJobs(prev => [newJob, ...prev]);
        
        // Öka antalsräknaren och uppdatera prenumerationsdata
        const incrementResult = await incrementPostCount();
        console.log("Increment post count result:", incrementResult);
        
        // Uppdatera återstående jobbplatser
        const remaining = await getRemainingJobSlots();
        setRemainingJobs(remaining);
        
        // Signalera framgång
        toast.success("Jobbannonsen har skapats och väntar på godkännande.");
        return true;
      } else {
        console.error("Failed to create job, no job returned");
        toast.error("Det gick inte att skapa jobbannonsen.");
        return false;
      }
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Det gick inte att skapa jobbannonsen.");
      return false;
    }
  };

  const deleteJob = async (jobId: string): Promise<boolean> => {
    try {
      const success = await jobsService.deleteJob(jobId);
      if (success) {
        setJobs(prev => prev.filter(job => job.id !== jobId));
        toast.success("Jobbet har tagits bort");
        
        // Uppdatera prenumerationsdata för att uppdatera UI om det behövs
        refreshSubscription();
        
        // Uppdatera återstående jobbplatser
        const remaining = await getRemainingJobSlots();
        setRemainingJobs(remaining);
        
        return true;
      } else {
        toast.error("Kunde inte ta bort jobbet");
        return false;
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Kunde inte ta bort jobbet");
      return false;
    }
  };

  const handleEdit = (job: Job) => {
    navigate(`/edit-job/${job.id}`);
  };

  const handleDelete = async (jobId: string) => {
    await deleteJob(jobId);
  };

  const handleCreateJob = async (formData: JobFormData) => {
    setIsCreating(true);
    try {
      const success = await createJob(formData);
      return success;
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [activeTab]);

  return {
    jobs,
    isLoading,
    activeTab,
    setActiveTab,
    handleEdit,
    handleDelete,
    handleCreateJob,
    isCreating,
    createJob,
    deleteJob,
    refreshJobs: fetchJobs,
    remainingJobs
  };
};

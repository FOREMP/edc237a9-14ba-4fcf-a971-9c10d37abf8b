
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
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
        // Fetch all company jobs (non-expired by default)
        companyJobs = await jobsService.getCompanyJobs();
        console.log("Fetched company jobs:", companyJobs);
      }
      
      // Filter jobs based on active tab
      let filteredJobs = companyJobs;
      if (activeTab === "pending") {
        console.log("Filtering for pending jobs");
        filteredJobs = companyJobs.filter(job => job.status === "pending");
      } else if (activeTab === "approved") {
        filteredJobs = companyJobs.filter(job => job.status === "approved");
      } else if (activeTab === "rejected") {
        filteredJobs = companyJobs.filter(job => job.status === "rejected");
      }
      
      console.log("Filtered jobs for tab", activeTab, ":", filteredJobs);
      setJobs(filteredJobs);
      
      // Get remaining job slots from Supabase
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
      // First check if user can post (hasn't reached limit)
      const canPost = await checkPostingLimit();
      if (!canPost) {
        console.log("User has reached their posting limit");
        return false;
      }
      
      console.log("Creating job with data:", formData);
      const newJob = await jobsService.createJob(formData);
      
      if (newJob) {
        console.log("Job created successfully:", newJob);
        
        // Update job list with the new job
        setJobs(prev => [newJob, ...prev]);
        
        // Increment count and update subscription data
        const incrementResult = await incrementPostCount();
        console.log("Increment post count result:", incrementResult);
        
        // Update remaining job slots
        const remaining = await getRemainingJobSlots();
        setRemainingJobs(remaining);
        
        // Close the dialog
        setIsDialogOpen(false);
        
        // Signal success
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
        
        // Update subscription data to refresh UI if needed
        refreshSubscription();
        
        // Update remaining job slots
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

  const handleDelete = (jobId: string) => {
    setJobToDelete(jobId);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (jobToDelete) {
      await deleteJob(jobToDelete);
      setJobToDelete(null);
      setIsAlertOpen(false);
    }
  };

  const handleCreateClick = () => {
    setIsDialogOpen(true);
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
    handleCreateClick,
    handleDeleteConfirm,
    isCreating,
    isDialogOpen,
    setIsDialogOpen,
    isAlertOpen,
    setIsAlertOpen,
    jobToDelete,
    createJob,
    deleteJob,
    refreshJobs: fetchJobs,
    remainingJobs
  };
};

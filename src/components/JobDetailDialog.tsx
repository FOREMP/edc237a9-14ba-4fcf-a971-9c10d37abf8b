
import { useState, useEffect } from "react";
import { jobsService } from "@/services/jobs";
import { Job } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useJobViews, DeviceType } from "@/hooks/useJobViews";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  JobDetailLoading,
  JobDetailError,
  JobDetailView
} from "./job-detail";

interface JobDetailDialogProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JobDetailDialog = ({ jobId, open, onOpenChange }: JobDetailDialogProps) => {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trackJobView } = useJobViews();
  const { user, isAdmin } = useAuth();
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Add debug logging - this is useful for troubleshooting
  useEffect(() => {
    if (open && jobId) {
      console.log("JobDetailDialog opened for job ID:", jobId);
    }
  }, [open, jobId]);

  useEffect(() => {
    // Reset state when dialog is closed
    if (!open) {
      setJob(null);
      setError(null);
      setFetchAttempted(false);
      setIsLoading(false);
      return;
    }
    
    // Skip fetch if no jobId or dialog not open
    if (!jobId || !open) {
      return;
    }

    let isMounted = true;
    
    const fetchJob = async () => {
      if (!isMounted) return;
      
      // Only change state if component is still mounted
      setIsLoading(true);
      setError(null);
      setFetchAttempted(false);
      // Important: don't reset job here to prevent flickering
      
      try {
        console.log("JobDetailDialog: Fetching job details for ID:", jobId);
        
        // Try to refresh session before fetching
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          console.log("JobDetailDialog: Auth state before job fetch:", {
            hasSession: !!sessionData.session,
            userId: sessionData.session?.user?.id || 'none'
          });
        } catch (err) {
          console.log("JobDetailDialog: Session check error:", err);
        }
        
        // Fetch job data
        const jobData = await jobsService.getJobById(jobId);
        
        // Guard against component unmounting during async operation
        if (!isMounted) return;
        
        if (!jobData) {
          console.error("JobDetailDialog: No job data returned for ID:", jobId);
          setError("Jobbet kunde inte hittas");
          toast.error("Jobbet kunde inte hittas");
          setJob(null); // Clear job data if not found
        } else {
          console.log("JobDetailDialog: Job data retrieved successfully:", jobData);
          
          // Important: Set job data before setting loading to false
          setJob(jobData);
          
          // Track this as a job detail view
          const deviceType = getDeviceType();
          trackJobView(jobId, 'detail', deviceType);
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error("JobDetailDialog: Error fetching job:", error);
        setError("Ett fel uppstod vid hämtning av jobbet");
        toast.error("Kunde inte ladda jobbinformation");
        setJob(null); // Clear job data on error
      } finally {
        if (isMounted) {
          setFetchAttempted(true);
          setIsLoading(false);
        }
      }
    };
    
    fetchJob();
    
    // Cleanup function to handle component unmounting
    return () => {
      isMounted = false;
    };
  }, [jobId, open, trackJobView]);

  // Helper function to determine device type
  const getDeviceType = (): DeviceType => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|mini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  };

  const handleRetryFetch = () => {
    if (jobId) {
      console.log("JobDetailDialog: Retrying fetch for job ID:", jobId);
      setError(null);
      setIsLoading(true);
      setFetchAttempted(false);
      setJob(null);
    }
  };

  // Render loading state - simplified to prevent flickering
  if (isLoading && !job) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <JobDetailLoading />
      </Dialog>
    );
  }

  // Render error state or no job found state
  if ((error || !job) && fetchAttempted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <JobDetailError 
          error={error} 
          onRetry={handleRetryFetch} 
          onClose={() => onOpenChange(false)} 
        />
      </Dialog>
    );
  }

  // If we have no job data and haven't attempted to fetch yet, show minimal loading
  if (!job && !fetchAttempted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <JobDetailLoading />
      </Dialog>
    );
  }

  // At this point, we should have valid job data
  if (!job) {
    console.error("Unexpected state: No job data but not in loading or error state");
    return null;
  }

  const formattedDate = format(new Date(job.createdAt), 'PPP', { locale: sv });
  
  // Format for job type
  const jobTypeText = {
    fulltime: "Heltid",
    parttime: "Deltid",
    internship: "Praktik",
    freelance: "Frilans"
  }[job.jobType];

  // Check if the current user is the owner of this job
  const isOwner = user && job && user.id === job.companyId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <JobDetailView 
          job={job}
          formattedDate={formattedDate}
          jobTypeText={jobTypeText}
          isOwner={isOwner}
          isAdmin={isAdmin}
        />
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailDialog;

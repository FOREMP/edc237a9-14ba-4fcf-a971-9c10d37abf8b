
import { useState, useEffect } from "react";
import { jobsService } from "@/services/jobs";
import { Job } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  MapPin,
  Calendar,
  GraduationCap,
  Banknote,
  Mail,
  Phone,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useJobViews, DeviceType } from "@/hooks/useJobViews";
import JobViewsStats from "@/components/JobViewsStats";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogClose className="absolute right-4 top-4" />
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-t-primary border-primary/30 animate-spin"></div>
            <span className="ml-3 text-muted-foreground">Hämtar jobbinformation...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render error state or no job found state
  if ((error || !job) && fetchAttempted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {error || "Jobbet hittades inte"}
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4" />
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              {error ? error : "Jobbet kan ha tagits bort eller är inte längre tillgängligt."}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Stäng
              </Button>
              <Button 
                variant="default" 
                onClick={handleRetryFetch}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Försök igen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If we have no job data and haven't attempted to fetch yet, show minimal loading
  if (!job && !fetchAttempted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogClose className="absolute right-4 top-4" />
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-t-primary border-primary/30 animate-spin"></div>
            <span className="ml-3 text-muted-foreground">Laddar...</span>
          </div>
        </DialogContent>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogClose className="absolute right-4 top-4" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">{job.title}</h1>
                  <p className="text-lg text-muted-foreground">{job.companyName}</p>
                </div>
                <Badge variant="outline" className="text-sm font-medium">
                  {jobTypeText}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-muted-foreground" />
                  <span>{job.location}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span>Publicerad: {formattedDate}</span>
                </div>
                
                {job.salary && (
                  <div className="flex items-center gap-2">
                    <Banknote size={16} className="text-muted-foreground" />
                    <span>{job.salary}</span>
                  </div>
                )}
                
                {job.educationRequired && (
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-muted-foreground" />
                    <span>Utbildning krävs</span>
                  </div>
                )}
              </div>

              <Separator />
              
              <div>
                <h2 className="text-lg font-semibold mb-2">Jobbeskrivning</h2>
                <div className="whitespace-pre-line text-muted-foreground">
                  {job.description}
                </div>
              </div>
              
              {job.requirements && (
                <>
                  <Separator />
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Kvalifikationer</h2>
                    <div className="whitespace-pre-line text-muted-foreground">
                      {job.requirements}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Kontakt</h3>
              <div className="space-y-2">
                {job.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-muted-foreground" />
                    <a href={`mailto:${job.email}`} className="text-primary hover:underline">
                      {job.email}
                    </a>
                  </div>
                )}
                
                {job.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-muted-foreground" />
                    <a href={`tel:${job.phone}`} className="text-primary hover:underline">
                      {job.phone}
                    </a>
                  </div>
                )}
                
                <Button className="w-full mt-2 bg-white text-primary border-primary font-semibold hover:bg-white hover:text-primary" asChild>
                  <a href={`mailto:${job.email || ''}`}>
                    Kontakta arbetsgivaren
                  </a>
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">{job.companyName}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-muted-foreground" />
                  <span>Rekryterar: {jobTypeText}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-muted-foreground" />
                  <span>{job.location}</span>
                </div>
              </div>
            </div>
            
            {/* Stats for job owners only */}
            {(isOwner || isAdmin) && job.id && (
              <div className="mt-4">
                <JobViewsStats jobId={job.id} />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailDialog;

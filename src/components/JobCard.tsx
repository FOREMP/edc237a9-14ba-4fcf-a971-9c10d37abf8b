
import { Job } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, GraduationCap, Banknote } from "lucide-react";
import JobTypeTag from "./JobTypeTag";
import JobStatusBadge from "./JobStatusBadge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useJobViews, DeviceType } from "@/hooks/useJobViews"; 
import JobDetailDialog from "./JobDetailDialog";

interface JobCardProps {
  job: Job;
  showActions?: boolean;
  onEdit?: (job: Job) => void;
  onDelete?: (jobId: string) => void;
  onApprove?: (jobId: string) => void;
  onReject?: (jobId: string) => void;
}

const JobCard = ({ 
  job, 
  showActions = false, 
  onEdit, 
  onDelete,
  onApprove,
  onReject 
}: JobCardProps) => {
  const { id, title, companyName, location, jobType, educationRequired, salary, description, createdAt, status } = job;
  const { isAdmin } = useAuth();
  const { trackJobView } = useJobViews();
  const [showJobDetail, setShowJobDetail] = useState(false);

  const typeClassNames: Record<typeof jobType, string> = {
    fulltime: "job-card-fulltime",
    parttime: "job-card-parttime",
    internship: "job-card-internship",
    freelance: "job-card-freelance"
  };

  const dateFormatted = format(new Date(createdAt), 'PPP', { locale: sv });

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

  // Track job impression when card is rendered using Intersection Observer
  useEffect(() => {
    // Create a unique key for localStorage to track whether this job has been viewed in this session
    const sessionViewKey = `job_impression_${id}`;
    
    // If we've already tracked this impression in this session, don't track again
    if (localStorage.getItem(sessionViewKey)) {
      return;
    }
    
    // Use Intersection Observer to track when job cards come into view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Only track the view once when it comes into view
          const deviceType = getDeviceType();
          trackJobView(id, 'impression', deviceType);
          
          // Mark this impression as tracked for this session
          localStorage.setItem(sessionViewKey, 'true');
          
          // Disconnect the observer after tracking
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 }); // Element is at least 50% visible
    
    // Get a reference to the current element
    const element = document.getElementById(`job-card-${id}`);
    
    if (element) {
      observer.observe(element);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [id, trackJobView]);

  // Function to handle job detail view tracking and open the dialog
  const handleJobDetailClick = () => {
    console.log("Opening job detail dialog for job:", id);
    const deviceType = getDeviceType();
    trackJobView(id, 'detail', deviceType);
    setShowJobDetail(true);
  };

  return (
    <>
      <Card className={cn("job-card", typeClassNames[jobType])} id={`job-card-${id}`}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-semibold">{title}</CardTitle>
              <CardDescription className="text-base">{companyName}</CardDescription>
            </div>
            <div className="flex gap-2">
              <JobTypeTag jobType={jobType} />
              {(showActions || isAdmin) && <JobStatusBadge status={status} />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin size={16} />
              <span>{location}</span>
            </div>
            
            {salary && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Banknote size={16} />
                <span>{salary}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar size={16} />
              <span>Publicerad: {dateFormatted}</span>
            </div>
            
            {educationRequired && (
              <div className="flex items-center space-x-2 text-sm">
                <GraduationCap size={16} />
                <span>Utbildning krävs</span>
              </div>
            )}
            
            <div className="mt-4">
              <p className="text-sm line-clamp-3">{description}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            className="bg-white text-primary border-primary font-semibold hover:bg-white hover:text-primary"
            onClick={handleJobDetailClick}
          >
            Visa mer
          </Button>
          
          {showActions && (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => onEdit && onEdit(job)}
              >
                Redigera
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => onDelete && onDelete(id)}
              >
                Ta bort
              </Button>
            </div>
          )}

          {isAdmin && status === 'pending' && (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                onClick={() => onApprove && onApprove(id)}
              >
                Godkänn
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => onReject && onReject(id)}
              >
                Neka
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
      
      <JobDetailDialog 
        jobId={id}
        open={showJobDetail}
        onOpenChange={setShowJobDetail}
      />
    </>
  );
};

export default JobCard;


import { Job } from "@/types";
import { Loader2Icon } from "lucide-react";
import AdminJobCard from "@/components/dashboard/AdminJobCard";
import { useEffect, useState } from "react";

interface AdminJobListProps {
  jobs: Job[];
  isLoading: boolean;
  status: string;
  onApprove: (jobId: string) => void;
  onReject: (jobId: string) => void;
}

const AdminJobList = ({ jobs, isLoading, status, onApprove, onReject }: AdminJobListProps) => {
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  
  useEffect(() => {
    // Filter jobs based on the status
    const filtered = jobs.filter(job => job.status === status);
    console.log(`Filtered jobs for status "${status}":`, filtered.length);
    
    // Detailed logging of filtered jobs for debugging
    if (filtered.length > 0) {
      console.log(`First 3 jobs with status "${status}":`, 
        filtered.slice(0, 3).map(job => ({
          id: job.id,
          title: job.title,
          company: job.companyName,
          createdAt: job.createdAt
        }))
      );
    }
    
    setFilteredJobs(filtered);
  }, [jobs, status]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Laddar jobb...</span>
      </div>
    );
  }

  if (filteredJobs.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Inga jobbannonser</h3>
        <p className="text-muted-foreground">
          {status === 'pending' 
            ? "Det finns inga annonser som väntar på godkännande." 
            : status === 'approved' 
              ? "Det finns inga godkända annonser." 
              : "Det finns inga nekade annonser."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {filteredJobs.map(job => (
        <AdminJobCard 
          key={job.id} 
          job={job}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  );
};

export default AdminJobList;

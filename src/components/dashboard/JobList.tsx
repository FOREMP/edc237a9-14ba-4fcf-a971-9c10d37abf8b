
import { Job } from "@/types";
import JobCard from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Loader2Icon, PlusIcon } from "lucide-react";

interface JobListProps {
  jobs: Job[];
  isLoading: boolean;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  onCreateClick: () => void;
  tabValue: string;
}

const JobList = ({ jobs, isLoading, onEdit, onDelete, onCreateClick, tabValue }: JobListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Inga jobbannonser än</h3>
        <p className="text-muted-foreground mb-4">
          {tabValue === 'all' 
            ? "Skapa din första jobbannons för att börja rekrytera."
            : tabValue === 'pending'
              ? "Du har inga annonser som väntar på godkännande."
              : tabValue === 'approved'
                ? "Du har inga godkända annonser ännu."
                : tabValue === 'expired'
                  ? "Du har inga utgångna annonser."
                  : "Du har inga nekade annonser."}
        </p>
        {(tabValue === 'all' || tabValue === 'pending' || tabValue === 'approved') && (
          <Button onClick={onCreateClick}>
            <PlusIcon size={16} className="mr-2" />
            Skapa jobb
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {jobs.map(job => (
        <JobCard 
          key={job.id} 
          job={job} 
          showActions 
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default JobList;

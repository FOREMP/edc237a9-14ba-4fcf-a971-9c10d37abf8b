
import { JobType } from "@/types";
import { cn } from "@/lib/utils";

interface JobTypeTagProps {
  jobType: JobType;
  className?: string;
}

const JobTypeTag = ({ jobType, className }: JobTypeTagProps) => {
  const typeLabels: Record<JobType, string> = {
    fulltime: "Heltid",
    parttime: "Deltid",
    internship: "Praktik",
    freelance: "Freelance"
  };

  const typeClasses: Record<JobType, string> = {
    fulltime: "badge-fulltime",
    parttime: "badge-parttime",
    internship: "badge-internship",
    freelance: "badge-freelance"
  };

  return (
    <span className={cn(typeClasses[jobType], className)}>
      {typeLabels[jobType]}
    </span>
  );
};

export default JobTypeTag;

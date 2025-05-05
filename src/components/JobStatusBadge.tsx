
import { Badge } from "@/components/ui/badge";
import { JobStatus } from "@/types";

interface JobStatusBadgeProps {
  status: JobStatus;
}

const JobStatusBadge = ({ status }: JobStatusBadgeProps) => {
  const statusConfig = {
    pending: {
      label: "Under granskning",
      variant: "outline" as const
    },
    approved: {
      label: "Godkänd",
      variant: "success" as const
    },
    rejected: {
      label: "Nekad",
      variant: "destructive" as const
    }
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>{config.label}</Badge>
  );
};

export default JobStatusBadge;

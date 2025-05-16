
import { Briefcase, MapPin } from "lucide-react";

interface JobCompanyInfoProps {
  companyName: string;
  location: string;
  jobTypeText: string;
}

const JobCompanyInfo = ({ companyName, location, jobTypeText }: JobCompanyInfoProps) => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold">{companyName}</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-muted-foreground" />
          <span>Rekryterar: {jobTypeText}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-muted-foreground" />
          <span>{location}</span>
        </div>
      </div>
    </div>
  );
};

export default JobCompanyInfo;

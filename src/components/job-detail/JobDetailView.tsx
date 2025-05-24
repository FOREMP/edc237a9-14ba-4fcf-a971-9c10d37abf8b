
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, Banknote, GraduationCap, Clock } from "lucide-react";
import { Job } from "@/types";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import JobContactInfo from "./JobContactInfo";
import JobCompanyInfo from "./JobCompanyInfo";
import JobViewsStats from "@/components/JobViewsStats";
import JobViewsStatsTable from "@/components/JobViewsStatsTable";

interface JobDetailViewProps {
  job: Job;
  formattedDate: string;
  jobTypeText: string;
  isOwner: boolean;
  isAdmin: boolean;
}

const JobDetailView = ({ job, formattedDate, jobTypeText, isOwner, isAdmin }: JobDetailViewProps) => {
  // Check if job has expired
  const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{job.title}</h1>
                {isExpired && (
                  <Badge variant="outline" className="text-rose-500 border-rose-200 bg-rose-50">
                    Utgången
                  </Badge>
                )}
              </div>
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
            
            {isExpired ? (
              <div className="flex items-center gap-2 text-rose-500">
                <Clock size={16} />
                <span>Utgått: {format(new Date(job.expiresAt), 'PPP', { locale: sv })}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" />
                <span>Utgår: {format(new Date(job.expiresAt), 'PPP', { locale: sv })}</span>
              </div>
            )}
            
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

        {/* Stats table for job owners - show below job details on mobile/tablet */}
        {(isOwner || isAdmin) && job.id && (
          <div className="md:hidden">
            <JobViewsStatsTable jobId={job.id} jobTitle={job.title} />
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <JobContactInfo email={job.email} phone={job.phone} />
        <JobCompanyInfo 
          companyName={job.companyName} 
          location={job.location} 
          jobTypeText={jobTypeText} 
        />
        
        {/* Stats for job owners - compact version for sidebar */}
        {(isOwner || isAdmin) && job.id && (
          <div className="hidden md:block">
            <JobViewsStats jobId={job.id} />
          </div>
        )}

        {/* Stats table for job owners - detailed version for desktop */}
        {(isOwner || isAdmin) && job.id && (
          <div className="hidden md:block">
            <JobViewsStatsTable jobId={job.id} jobTitle={job.title} />
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetailView;


import { Job } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, GraduationCap, Banknote, Check, X } from "lucide-react";
import JobTypeTag from "../JobTypeTag";
import JobStatusBadge from "../JobStatusBadge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface AdminJobCardProps {
  job: Job;
  onApprove: (jobId: string) => void;
  onReject: (jobId: string) => void;
}

const AdminJobCard = ({ job, onApprove, onReject }: AdminJobCardProps) => {
  const { id, title, companyName, location, jobType, educationRequired, salary, description, requirements, createdAt, status } = job;

  const dateFormatted = format(new Date(createdAt), 'PPP', { locale: sv });

  return (
    <Card className="admin-job-card">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            <CardDescription className="text-base">{companyName}</CardDescription>
          </div>
          <div className="flex gap-2">
            <JobTypeTag jobType={jobType} />
            <JobStatusBadge status={status} />
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
          
          <div className="mt-2">
            <h4 className="font-medium mb-1">Beskrivning:</h4>
            <p className="text-sm">{description}</p>
          </div>
          
          <div className="mt-2">
            <h4 className="font-medium mb-1">Krav:</h4>
            <p className="text-sm">{requirements}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 flex items-center gap-2"
          onClick={() => onApprove(id)}
        >
          <Check size={16} />
          Godkänn
        </Button>
        <Button 
          variant="outline" 
          className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 flex items-center gap-2"
          onClick={() => onReject(id)}
        >
          <X size={16} />
          Neka
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AdminJobCard;

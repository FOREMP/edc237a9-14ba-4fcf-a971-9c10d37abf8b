
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "@/services/jobs";
import { Job } from "@/types";
import { 
  ArrowLeft, 
  Briefcase, 
  MapPin, 
  Calendar, 
  GraduationCap, 
  Banknote, 
  Mail, 
  Phone,
  LinkIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useJobViews, DeviceType } from "@/hooks/useJobViews";
import JobViewsStats from "@/components/JobViewsStats";
import { useAuth } from "@/hooks/useAuth";

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { trackJobView } = useJobViews();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    async function fetchJob() {
      if (!id) return;
      
      setIsLoading(true);
      try {
        console.log("Fetching job details for ID:", id);
        const jobData = await jobsService.getJobById(id);
        
        if (!jobData) {
          console.error("No job data returned for ID:", id);
          navigate("/jobs", { replace: true });
          return;
        }
        
        console.log("Job data retrieved:", jobData);
        setJob(jobData);
        
        // Track this as a job detail view
        const deviceType = getDeviceType();
        trackJobView(id, 'detail', deviceType);
      } catch (error) {
        console.error("Error fetching job:", error);
        navigate("/jobs", { replace: true });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchJob();
  }, [id, navigate, trackJobView]);

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

  // Check if the current user is the owner of this job
  const isOwner = user && job && user.id === job.companyId;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="w-8 h-8 rounded-full border-4 border-t-primary border-primary/30 animate-spin"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Jobbet hittades inte</h2>
            <p className="text-muted-foreground mb-6">Jobbet kan ha tagits bort eller är inte längre tillgängligt.</p>
            <Button asChild className="bg-white text-primary font-semibold hover:bg-white hover:text-primary">
              <Link to="/jobs">Tillbaka till jobblistan</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
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
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/jobs" className="flex items-center">
              <ArrowLeft size={16} className="mr-2" />
              Tillbaka till jobblistan
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">{job.title}</h1>
                  <p className="text-xl text-muted-foreground">{job.companyName}</p>
                </div>
                <Badge variant="outline" className="text-sm font-medium">
                  {jobTypeText}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-muted-foreground" />
                  <span>{job.location}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-muted-foreground" />
                  <span>Publicerad: {formattedDate}</span>
                </div>
                
                {job.salary && (
                  <div className="flex items-center gap-2">
                    <Banknote size={18} className="text-muted-foreground" />
                    <span>{job.salary}</span>
                  </div>
                )}
                
                {job.educationRequired && (
                  <div className="flex items-center gap-2">
                    <GraduationCap size={18} className="text-muted-foreground" />
                    <span>Utbildning krävs</span>
                  </div>
                )}
              </div>

              <Separator />
              
              <div>
                <h2 className="text-xl font-semibold mb-3">Jobbeskrivning</h2>
                <div className="whitespace-pre-line text-muted-foreground">
                  {job.description}
                </div>
              </div>
              
              {job.requirements && (
                <>
                  <Separator />
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Kvalifikationer</h2>
                    <div className="whitespace-pre-line text-muted-foreground">
                      {job.requirements}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Stats for job owners only */}
            {(isOwner || isAdmin) && job.id && (
              <div className="mt-4">
                <JobViewsStats jobId={job.id} />
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kontakt</CardTitle>
                <CardDescription>Kontakta företaget om tjänsten</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={20} className="text-muted-foreground" />
                    <a href={`mailto:${job.email}`} className="text-primary hover:underline">
                      {job.email}
                    </a>
                  </div>
                )}
                
                {job.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={20} className="text-muted-foreground" />
                    <a href={`tel:${job.phone}`} className="text-primary hover:underline">
                      {job.phone}
                    </a>
                  </div>
                )}
                
                <Button className="w-full mt-4 bg-white text-primary font-semibold hover:bg-white hover:text-primary" asChild>
                  <a href={`mailto:${job.email || ''}`}>
                    Kontakta arbetsgivaren
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{job.companyName}</CardTitle>
                <CardDescription>Företagsinformation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Briefcase size={20} className="text-muted-foreground" />
                  <span>Rekryterar: {jobTypeText}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={20} className="text-muted-foreground" />
                  <span>{job.location}</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Edit button for owner */}
            {isOwner && (
              <Button variant="outline" className="w-full bg-white text-primary font-semibold hover:bg-white hover:text-primary" asChild>
                <Link to={`/dashboard/edit/${job.id}`}>Redigera jobbannons</Link>
              </Button>
            )}
            
            {/* Admin actions */}
            {isAdmin && job.status === 'pending' && (
              <div className="space-y-3">
                <Button variant="default" className="w-full bg-green-600 hover:bg-green-700">
                  Godkänn jobbannons
                </Button>
                <Button variant="destructive" className="w-full">
                  Neka jobbannons
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default JobDetail;

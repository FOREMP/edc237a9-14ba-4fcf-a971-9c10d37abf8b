import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Job, JobFormData } from "@/types";
import { jobsService } from "@/services/jobs";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import JobForm from "@/components/JobForm";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

const EditJob = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth("/dashboard");
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchJob();
    }
  }, [isAuthenticated, id]);

  const fetchJob = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const jobData = await jobsService.getJobById(id);
      setJob(jobData);
    } catch (error) {
      console.error("Error fetching job:", error);
      toast.error("Kunde inte hämta jobbet");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateJob = async (formData: JobFormData): Promise<boolean> => {
    if (!id) return false;

    try {
      const updatedJob = await jobsService.updateJob(id, formData);
      if (updatedJob) {
        toast.success("Jobbet har uppdaterats");
        navigate("/dashboard");
        return true;
      } else {
        toast.error("Kunde inte uppdatera jobbet");
        return false;
      }
    } catch (error) {
      console.error("Error updating job:", error);
      toast.error("Kunde inte uppdatera jobbet");
      return false;
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 size={30} className="animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Jobbet kunde inte hittas</h1>
          <p className="mb-6">Jobbet du försöker redigera finns inte eller tillhör inte ditt företag.</p>
          <Button asChild>
            <a href="/dashboard">Tillbaka till dashboard</a>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/dashboard")} 
          className="mb-6 flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" />
          Tillbaka till dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Redigera jobbannons</CardTitle>
          </CardHeader>
          <CardContent>
            <JobForm 
              initialData={job} 
              onSubmit={handleUpdateJob} 
              onCancel={() => navigate("/dashboard")}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EditJob;

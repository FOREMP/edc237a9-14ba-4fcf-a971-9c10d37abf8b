
import { Job, JobFormData, JobStatus, JobType } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Core JobService class with basic job management functionality
class JobsServiceCore {
  // Get all jobs
  async getAllJobs(): Promise<Job[]> {
    try {
      console.log("JobsServiceCore: Getting all approved jobs");
      // For public view, only return approved jobs
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'approved');
        
      if (error) {
        console.error("Error fetching jobs:", error);
        toast.error("Kunde inte hämta jobb");
        return [];
      }

      console.log("Fetched all approved jobs:", data?.length || 0);

      // Convert Supabase data to match our Job type
      return data.map(job => this.mapDbJobToJobType(job));
    } catch (error) {
      console.error("Error fetching all jobs:", error);
      toast.error("Ett fel uppstod vid hämtning av jobb");
      return [];
    }
  }

  // Get a single job by ID
  async getJobById(id: string): Promise<Job | null> {
    try {
      console.log("JobsServiceCore: Fetching job with ID:", id);
      if (!id) {
        console.error("getJobById called with empty or null ID");
        toast.error("Ogiltigt jobb-ID");
        return null;
      }
      
      // Using maybeSingle instead of single to avoid error when no record is found
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching job by ID:", error);
        toast.error("Kunde inte hämta jobbinformation");
        return null;
      }
      
      if (!data) {
        console.error("No job found with ID:", id);
        toast.error("Jobbet kunde inte hittas");
        return null;
      }
      
      console.log("JobsServiceCore: Successfully fetched job by ID:", id);
      console.log("Job data:", data);
      
      // Convert database job to our Job type
      return this.mapDbJobToJobType(data);
    } catch (error) {
      console.error("Error fetching job by ID:", error);
      toast.error("Ett fel uppstod vid hämtning av jobbinformation");
      return null;
    }
  }
  
  // Delete a job
  async deleteJob(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting job:", error);
        toast.error("Kunde inte ta bort jobbet");
        return false;
      }
      
      console.log("Job deleted successfully:", id);
      toast.success("Jobbet har tagits bort");
      return true;
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Ett fel uppstod vid borttagning av jobbet");
      return false;
    }
  }

  // Helper method to map database job record to our Job type
  protected mapDbJobToJobType(job: any): Job {
    if (!job) {
      console.error("Attempted to map null or undefined job object");
      throw new Error("Invalid job data received from database");
    }
    
    try {
      // Log the job object we're attempting to map
      console.log("Mapping job object:", job);
      
      const mappedJob: Job = {
        id: job.id,
        companyId: job.company_id,
        title: job.title,
        description: job.description,
        requirements: job.requirements || '',
        jobType: job.job_type as JobType,
        educationRequired: job.education_required,
        location: job.location,
        salary: job.salary || '',
        email: job.email || '',
        phone: job.phone || '',
        createdAt: new Date(job.created_at),
        updatedAt: new Date(job.updated_at),
        companyName: job.company_name,
        status: job.status as JobStatus
      };
      
      console.log("Successfully mapped job:", mappedJob.id, mappedJob.title);
      return mappedJob;
    } catch (error) {
      console.error("Error mapping job data:", error, job);
      throw new Error("Failed to process job data from database");
    }
  }
}

export { JobsServiceCore };

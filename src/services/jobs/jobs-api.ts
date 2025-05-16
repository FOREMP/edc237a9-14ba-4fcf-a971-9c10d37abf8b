
import { JobsManagementService } from "./jobs-management";
import { JobsFilterService } from "./jobs-filter";
import { Job, JobFilter, JobFormData, JobStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Main API class that combines all job service functionality
class JobsServiceApi {
  private managementService: JobsManagementService;
  private filterService: JobsFilterService;

  constructor() {
    this.managementService = new JobsManagementService();
    this.filterService = new JobsFilterService();
  }

  // Proxy all methods from management service
  async getAllJobs(): Promise<Job[]> {
    // Make sure session is valid before getting jobs
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        await supabase.auth.refreshSession();
      }
    } catch (err) {
      console.log("Session refresh attempt failed, continuing with fetch", err);
    }
    
    return this.managementService.getAllJobs();
  }
  
  async getJobById(id: string): Promise<Job | null> {
    console.log("JobsServiceApi: Getting job by ID:", id);
    if (!id) {
      console.error("Invalid job ID provided:", id);
      return null;
    }
    
    try {
      // Use the enhanced method from JobsFilterService which handles both authenticated and public access
      const job = await this.filterService.getJobById(id);
      if (job) {
        console.log("JobsServiceApi: Successfully retrieved job:", job.id);
      } else {
        console.log("JobsServiceApi: No job found with ID:", id);
      }
      return job;
    } catch (error) {
      console.error("JobsServiceApi: Error getting job by ID:", error);
      return null;
    }
  }
  
  async getCompanyJobs(): Promise<Job[]> {
    // Try to refresh session before getting company jobs
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        await supabase.auth.refreshSession();
      }
    } catch (err) {
      console.log("Session refresh attempt failed, continuing with fetch", err);
    }
    
    return this.managementService.getCompanyJobs();
  }
  
  async getPendingJobs(): Promise<Job[]> {
    // Try to refresh session before getting pending jobs
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        await supabase.auth.refreshSession();
      }
    } catch (err) {
      console.log("Session refresh attempt failed, continuing with fetch", err);
    }
    
    return this.managementService.getPendingJobs();
  }
  
  async createJob(jobData: JobFormData): Promise<Job | null> {
    // Ensure session is valid before creating jobs
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        console.error("No active session found when trying to create job");
        return null;
      }
      await supabase.auth.refreshSession();
    } catch (err) {
      console.log("Session refresh attempt failed before job creation", err);
    }
    
    return this.managementService.createJob(jobData);
  }
  
  async updateJob(id: string, jobData: JobFormData): Promise<Job | null> {
    return this.managementService.updateJob(id, jobData);
  }
  
  async updateJobStatus(id: string, status: JobStatus): Promise<Job | null> {
    return this.managementService.updateJobStatus(id, status);
  }
  
  async deleteJob(id: string): Promise<boolean> {
    return this.managementService.deleteJob(id);
  }
  
  // Filter jobs using the filter service
  async getFilteredJobs(filter: JobFilter): Promise<Job[]> {
    return this.filterService.getFilteredJobs(filter);
  }
}

// Export the API implementation to be used throughout the app
export const jobsServiceApi = new JobsServiceApi();

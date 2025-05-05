
import { JobsManagementService } from "./jobs-management";
import { JobsFilterService } from "./jobs-filter";
import { Job, JobFilter, JobFormData, JobStatus } from "@/types";

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
    return this.managementService.getAllJobs();
  }
  
  async getJobById(id: string): Promise<Job | null> {
    return this.managementService.getJobById(id);
  }
  
  async getCompanyJobs(): Promise<Job[]> {
    return this.managementService.getCompanyJobs();
  }
  
  async getPendingJobs(): Promise<Job[]> {
    return this.managementService.getPendingJobs();
  }
  
  async createJob(jobData: JobFormData): Promise<Job | null> {
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

import { Job, JobFormData, JobStatus, JobType } from "@/types";
import { authService } from "../auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { JobsServiceCore } from "./jobs-core";
import { isAdminEmail } from "@/utils/adminEmails";

// List of admin emails for consistent reference
const ADMIN_EMAILS = ['eric@foremp.se', 'kontakt@skillbaseuf.se'];

// JobService class focused on job management functionality
export class JobsManagementService extends JobsServiceCore {
  // Get jobs for the current logged-in company
  async getCompanyJobs(): Promise<Job[]> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      console.error("No authenticated user found");
      return [];
    }

    try {
      // For both admins and companies, explicitly log the current query status
      console.log("getCompanyJobs for user:", {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role
      });

      // First refresh session to ensure we have the latest token
      try {
        await supabase.auth.refreshSession();
        console.log("Session refreshed before job fetch");
      } catch (refreshError) {
        console.log("Session refresh failed, continuing with job fetch");
      }

      // Enhanced admin check - check both role AND email
      const isAdmin = currentUser.role === 'admin' || (currentUser.email && isAdminEmail(currentUser.email));
      
      console.log("getCompanyJobs checking admin status:", { 
        email: currentUser.email,
        role: currentUser.role,
        isAdmin,
        isAdminByEmail: currentUser.email ? isAdminEmail(currentUser.email) : false
      });
      
      // For admin users, directly query all jobs without filters
      if (isAdmin) {
        console.log("User is admin - fetching ALL jobs without company_id filter");
        
        // Direct database query that avoids potential RLS issues
        const { data, error } = await supabase
          .from('jobs')
          .select('*');
        
        if (error) {
          console.error("Error fetching all jobs as admin:", error);
          
          // If there's an auth error, try to refresh the session and try again
          if (error.message.includes("JWT")) {
            console.log("JWT issue detected, refreshing session and trying again");
            await supabase.auth.refreshSession();
            
            // Try again after refresh
            const retryResult = await supabase.from('jobs').select('*');
            
            if (retryResult.error) {
              console.error("Error still persists after session refresh:", retryResult.error);
              return [];
            }
            
            console.log("Retry successful, got jobs after session refresh:", retryResult.data?.length || 0);
            return retryResult.data?.map(job => this.mapDbJobToJobType(job)) || [];
          }
          
          return [];
        }
        
        console.log("Got all jobs from Supabase as admin:", data?.length || 0);
        return data?.map(job => this.mapDbJobToJobType(job)) || [];
      }
      
      // For non-admin companies, only return their own jobs
      console.log("Filtering jobs by company_id:", currentUser.id);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', currentUser.id);
      
      if (error) {
        console.error("Error fetching company jobs:", error);
        return [];
      }
      
      console.log("Got company jobs from Supabase:", data?.length || 0);
      
      // Convert data to our Job type
      return data?.map(job => this.mapDbJobToJobType(job)) || [];
    } catch (error) {
      console.error("Error fetching company jobs:", error);
      return [];
    }
  }

  // Get pending jobs for admin approval
  async getPendingJobs(): Promise<Job[]> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return [];

    // Check if user is admin (either by role or special email)
    const isAdmin = currentUser.role === 'admin' || isAdminEmail(currentUser.email);
    
    console.log("getPendingJobs checking admin status:", { 
      email: currentUser.email,
      role: currentUser.role,
      isAdmin 
    });
      
    if (!isAdmin) {
      console.log("User is not admin, returning empty array");
      return [];
    }

    try {
      console.log("Fetching pending jobs as admin:", currentUser.email);
      
      // Try to refresh session first to avoid auth issues
      await supabase.auth.refreshSession();
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'pending');
      
      if (error) {
        console.error("Error fetching pending jobs:", error);
        return [];
      }
      
      console.log("Got pending jobs from Supabase:", data?.length || 0);
      
      // Convert data to our Job type
      return data?.map(job => this.mapDbJobToJobType(job)) || [];
    } catch (error) {
      console.error("Error fetching pending jobs:", error);
      return [];
    }
  }

  // Create a new job
  async createJob(jobData: JobFormData): Promise<Job | null> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;

    try {
      console.log("Starting job creation process for user:", currentUser.id);
      
      // Convert JobFormData to database structure (snake_case)
      const jobRecord = {
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements,
        company_id: currentUser.id,
        company_name: currentUser.companyName || '',
        location: jobData.location,
        salary: jobData.salary,
        job_type: jobData.jobType,
        education_required: jobData.educationRequired,
        email: jobData.email,
        phone: jobData.phone,
        status: 'pending' as JobStatus
      };

      console.log("Creating job record:", jobRecord);

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobRecord)
        .select()
        .single();

      if (error) {
        console.error("Error creating job:", error);
        return null;
      }
      
      console.log("Job created successfully:", data);
      
      // Convert to our Job type
      return this.mapDbJobToJobType(data);
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Det gick inte att skapa jobbannonsen.");
      return null;
    }
  }

  // Update an existing job
  async updateJob(id: string, jobData: JobFormData): Promise<Job | null> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;

    try {
      // Convert JobFormData to database structure (snake_case)
      const jobUpdate = {
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements,
        location: jobData.location,
        salary: jobData.salary,
        job_type: jobData.jobType,
        education_required: jobData.educationRequired,
        email: jobData.email,
        phone: jobData.phone,
        updated_at: new Date().toISOString(),
        // Reset status to pending if a company is updating their job
        status: currentUser.role === 'company' ? 'pending' as JobStatus : undefined
      };

      const { data, error } = await supabase
        .from('jobs')
        .update(jobUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating job:", error);
        return null;
      }
      
      // Convert to our Job type
      return this.mapDbJobToJobType(data);
    } catch (error) {
      console.error("Error updating job:", error);
      return null;
    }
  }

  // Update the job status (for admin approval)
  async updateJobStatus(id: string, status: JobStatus): Promise<Job | null> {
    const currentUser = authService.getCurrentUser();
    
    if (!currentUser) {
      console.error("No authenticated user found");
      return null;
    }
    
    // Enhanced admin check - check both role AND email
    const isAdmin = currentUser.role === 'admin' || 
                   (currentUser.email && isAdminEmail(currentUser.email));
                   
    if (!isAdmin) {
      console.error("Not authorized to update job status - user is not admin");
      return null;
    }

    try {
      console.log(`Updating job ${id} status to ${status} by admin ${currentUser.email}`);
      
      // Check session first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log("Session missing, refreshing before job status update");
        await supabase.auth.refreshSession();
      }
      
      const { data, error } = await supabase
        .from('jobs')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating job status:", error);
        return null;
      }
      
      console.log("Job status updated successfully:", data);
      
      // Convert to our Job type
      return this.mapDbJobToJobType(data);
    } catch (error) {
      console.error("Error updating job status:", error);
      return null;
    }
  }
}

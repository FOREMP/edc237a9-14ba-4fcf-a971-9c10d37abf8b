// Create a more comprehensive and debuggable jobs API service

import { Job, JobFormData, JobFilter, JobStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Helper function to map database fields to frontend Job type
const mapDbJobToFrontend = (dbJob: any): Job => {
  return {
    id: dbJob.id,
    companyId: dbJob.company_id,
    title: dbJob.title,
    description: dbJob.description,
    requirements: dbJob.requirements || "",
    jobType: dbJob.job_type,
    educationRequired: dbJob.education_required,
    location: dbJob.location,
    salary: dbJob.salary,
    phone: dbJob.phone,
    email: dbJob.email,
    createdAt: new Date(dbJob.created_at),
    updatedAt: new Date(dbJob.updated_at),
    companyName: dbJob.company_name,
    status: dbJob.status,
    expiresAt: new Date(dbJob.expires_at)
  };
};

// Helper function to convert frontend job data to database format
const mapFrontendJobToDb = (job: JobFormData, companyId: string, companyName: string) => {
  // Calculate expiry date - default to 30 days from now
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);

  return {
    company_id: companyId,
    company_name: companyName,
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    job_type: job.jobType,
    education_required: job.educationRequired,
    location: job.location,
    salary: job.salary,
    phone: job.phone,
    email: job.email,
    expires_at: expiryDate.toISOString(),
    status: "pending" as JobStatus
  };
};

/**
 * Jobs service API implementation
 */
export const jobsServiceApi = {
  /**
   * Fetch company jobs with improved error handling and debugging
   */
  getCompanyJobs: async (): Promise<Job[]> => {
    try {
      console.log("JobsAPI: Fetching company jobs");
      
      // Get current user for diagnostic purposes
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("JobsAPI: No authenticated user found when trying to fetch company jobs");
        return [];
      }
      
      console.log("JobsAPI: Authenticated as user:", user.id, user.email);
      
      // First try an explicit query to verify the company ID matches
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, company_name')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        console.error("JobsAPI: Error fetching profile:", profileError);
        // Continue anyway to see if jobs query works
      } else {
        console.log("JobsAPI: Profile data:", profileData);
      }
      
      // Get all active jobs for the company
      console.log("JobsAPI: Querying jobs table with company_id =", user.id);
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', user.id)
        .is('expired', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("JobsAPI: Failed to fetch company jobs:", error);
        throw error;
      }
      
      console.log(`JobsAPI: Found ${jobs?.length || 0} jobs for company ${user.id}`);
      
      // If we found no jobs, try one more query without the is('expired', null) filter
      // to see if this is the issue
      if (!jobs || jobs.length === 0) {
        console.log("JobsAPI: No jobs found with expired=null, trying without that filter");
        
        const { data: allJobs, error: allJobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('company_id', user.id)
          .order('created_at', { ascending: false });
          
        if (allJobsError) {
          console.error("JobsAPI: Failed to fetch all company jobs:", allJobsError);
        } else {
          console.log(`JobsAPI: Found ${allJobs?.length || 0} total jobs (including expired)`);
          
          // If we found jobs here but not in the first query, it means all jobs are expired
          if (allJobs && allJobs.length > 0) {
            console.log("JobsAPI: All jobs appear to be marked as expired");
            
            // Return these anyway for diagnostic purposes
            return allJobs.map(job => mapDbJobToFrontend(job));
          }
        }
      }

      // Return jobs or empty array
      return jobs ? jobs.map(job => mapDbJobToFrontend(job)) : [];
    } catch (error) {
      console.error("JobsAPI: Exception fetching company jobs:", error);
      return [];
    }
  },
  
  /**
   * Get expired jobs with improved debugging
   */
  getExpiredJobs: async (): Promise<Job[]> => {
    try {
      console.log("JobsAPI: Fetching expired company jobs");
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("JobsAPI: No authenticated user found when trying to fetch expired jobs");
        return [];
      }

      // Get jobs that have expired (expires_at < now)
      console.log("JobsAPI: Querying expired jobs with company_id =", user.id);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', user.id)
        .filter('expires_at', 'lt', new Date().toISOString())
        .order('expires_at', { ascending: false });

      if (error) {
        console.error("JobsAPI: Failed to fetch expired jobs:", error);
        throw error;
      }

      console.log(`JobsAPI: Found ${data?.length || 0} expired jobs for company ${user.id}`);
      return data ? data.map(job => mapDbJobToFrontend(job)) : [];
    } catch (error) {
      console.error("JobsAPI: Exception fetching expired jobs:", error);
      return [];
    }
  },
  
  /**
   * Get all jobs (for public listing)
   */
  getAllJobs: async (filters?: JobFilter): Promise<Job[]> => {
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          profiles!jobs_company_id_fkey(company_name)
        `)
        .eq('status', 'approved');

      // Add current date filter to only show non-expired jobs
      const now = new Date().toISOString();
      query = query.gt('expires_at', now);

      // Apply filters
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%, description.ilike.%${filters.search}%, company_name.ilike.%${filters.search}%`);
      }

      if (filters?.jobType && filters.jobType.length > 0) {
        query = query.in('job_type', filters.jobType);
      }

      if (filters?.educationRequired !== null && filters?.educationRequired !== undefined) {
        query = query.eq('education_required', filters.educationRequired);
      }

      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Apply sorting - boosted jobs first, then by boost date (most recent first), then by creation date
      const sortBy = filters?.sortBy || 'newest';
      if (sortBy === 'newest') {
        query = query.order('boosted_at', { ascending: false, nullsLast: true })
                    .order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('boosted_at', { ascending: false, nullsLast: true })
                    .order('created_at', { ascending: true });
      } else if (sortBy === 'relevant') {
        // For relevance, still prioritize boosted jobs but then sort by relevance score
        query = query.order('boosted_at', { ascending: false, nullsLast: true })
                    .order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching jobs:', error);
        throw error;
      }

      // Map the data to include company_name from the joined profiles table
      return (data || []).map(job => ({
        ...job,
        company_name: job.profiles?.company_name || job.company_name,
        createdAt: new Date(job.created_at),
        updatedAt: new Date(job.updated_at),
        expiresAt: new Date(job.expires_at)
      }));
    } catch (error) {
      console.error('Error in getAllJobs:', error);
      throw error;
    }
  },
  
  /**
   * Get filtered jobs based on criteria
   */
  getFilteredJobs: async (filter: JobFilter): Promise<Job[]> => {
    try {
      console.log("JobsAPI: Fetching filtered jobs with filter:", filter);
      
      // Start with a base query
      let query = supabase
        .from('jobs')
        .select('*');
      
      // Apply status filter if provided
      if (filter.status) {
        query = query.eq('status', filter.status);
      } else {
        // Default to approved jobs for public listing
        query = query.eq('status', 'approved');
      }
      
      // Filter by expired/not expired
      if (filter.showExpired === false) {
        query = query.filter('expires_at', 'gt', new Date().toISOString());
      } else if (filter.showExpired === true) {
        query = query.filter('expires_at', 'lt', new Date().toISOString());
      }
      
      // Apply job type filter if provided
      if (filter.jobType && filter.jobType.length > 0) {
        query = query.in('job_type', filter.jobType);
      }
      
      // Apply education filter if provided
      if (filter.educationRequired !== null && filter.educationRequired !== undefined) {
        query = query.eq('education_required', filter.educationRequired);
      }
      
      // Apply location filter if provided
      if (filter.location) {
        query = query.ilike('location', `%${filter.location}%`);
      }
      
      // Apply search filter if provided
      if (filter.search) {
        query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
      }
      
      // Apply sorting
      if (filter.sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else {
        // Default to newest first
        query = query.order('created_at', { ascending: false });
      }
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) {
        console.error("JobsAPI: Failed to fetch filtered jobs:", error);
        throw error;
      }
      
      console.log(`JobsAPI: Found ${data?.length || 0} filtered jobs`);
      return data ? data.map(job => mapDbJobToFrontend(job)) : [];
    } catch (error) {
      console.error("JobsAPI: Exception fetching filtered jobs:", error);
      return [];
    }
  },
  
  /**
   * Get job by ID
   */
  getJobById: async (jobId: string): Promise<Job | null> => {
    try {
      console.log("JobsAPI: Fetching job by ID:", jobId);
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error) {
        console.error("JobsAPI: Failed to fetch job by ID:", error);
        throw error;
      }
      
      if (!data) {
        console.log("JobsAPI: No job found with ID:", jobId);
        return null;
      }
      
      console.log("JobsAPI: Found job:", data.title);
      return mapDbJobToFrontend(data);
    } catch (error) {
      console.error("JobsAPI: Exception fetching job by ID:", error);
      return null;
    }
  },
  
  /**
   * Create a new job
   */
  createJob: async (jobData: JobFormData): Promise<Job | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("JobsAPI: No authenticated user found when trying to create job");
        throw new Error("Authentication required");
      }
      
      console.log("JobsAPI: Creating job for company:", user.id);
      
      // Get company name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .single();
      
      // Prepare job data for database
      const dbJobData = mapFrontendJobToDb(
        jobData, 
        user.id, 
        profile?.company_name || ""
      );
      
      // Insert the job
      const { data, error } = await supabase
        .from('jobs')
        .insert([dbJobData])
        .select()
        .single();
      
      if (error) {
        console.error("JobsAPI: Failed to create job:", error);
        throw error;
      }
      
      console.log("JobsAPI: Job created successfully:", data);
      return data ? mapDbJobToFrontend(data) : null;
    } catch (error) {
      console.error("JobsAPI: Exception creating job:", error);
      return null;
    }
  },
  
  /**
   * Update an existing job
   */
  updateJob: async (jobId: string, jobData: JobFormData): Promise<Job | null> => {
    try {
      console.log("JobsAPI: Updating job:", jobId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("JobsAPI: No authenticated user found when trying to update job");
        throw new Error("Authentication required");
      }
      
      // Verify this user owns the job first
      const { data: existingJob, error: checkError } = await supabase
        .from('jobs')
        .select('company_id, company_name')
        .eq('id', jobId)
        .eq('company_id', user.id)
        .single();
        
      if (checkError || !existingJob) {
        console.error("JobsAPI: Job ownership check failed or job not found:", checkError);
        throw new Error("Job not found or you don't have permission to update it");
      }
      
      // Update job with new data
      const updateData = {
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements,
        job_type: jobData.jobType,
        education_required: jobData.educationRequired,
        location: jobData.location,
        salary: jobData.salary,
        phone: jobData.phone,
        email: jobData.email,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single();
      
      if (error) {
        console.error("JobsAPI: Failed to update job:", error);
        throw error;
      }
      
      console.log("JobsAPI: Job updated successfully:", data);
      return data ? mapDbJobToFrontend(data) : null;
    } catch (error) {
      console.error("JobsAPI: Exception updating job:", error);
      return null;
    }
  },

  /**
   * Update job status (for admin)
   */
  updateJobStatus: async (jobId: string, status: JobStatus): Promise<boolean> => {
    try {
      console.log(`JobsAPI: Updating job ${jobId} status to ${status}`);
      
      const { error } = await supabase
        .from('jobs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', jobId);
      
      if (error) {
        console.error("JobsAPI: Failed to update job status:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("JobsAPI: Exception updating job status:", error);
      return false;
    }
  },
  
  /**
   * Delete a job
   */
  deleteJob: async (jobId: string): Promise<boolean> => {
    try {
      console.log("JobsAPI: Deleting job:", jobId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("JobsAPI: No authenticated user found when trying to delete job");
        throw new Error("Authentication required");
      }
      
      // Verify ownership before deleting
      const { data: jobCheck, error: checkError } = await supabase
        .from('jobs')
        .select('id, company_id')
        .eq('id', jobId)
        .eq('company_id', user.id)
        .single();
        
      if (checkError) {
        console.error("JobsAPI: Job ownership check failed:", checkError);
        return false;
      }
      
      if (!jobCheck) {
        console.error("JobsAPI: No job found or user does not own this job");
        return false;
      }
      
      // Delete the job
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);
      
      if (error) {
        console.error("JobsAPI: Failed to delete job:", error);
        return false;
      }
      
      console.log("JobsAPI: Job deleted successfully:", jobId);
      return true;
    } catch (error) {
      console.error("JobsAPI: Exception deleting job:", error);
      return false;
    }
  },
};

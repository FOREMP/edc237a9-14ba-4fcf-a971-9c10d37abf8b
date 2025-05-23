// Create a more comprehensive and debuggable jobs API service

import { Job, JobFormData } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
            return allJobs as Job[];
          }
        }
      }

      // Return jobs or empty array
      return jobs as Job[] || [];
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
      return data as Job[] || [];
    } catch (error) {
      console.error("JobsAPI: Exception fetching expired jobs:", error);
      return [];
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
      
      // Prepare job data with company info
      const newJobData = {
        ...jobData,
        company_id: user.id,
        company_name: profile?.company_name || jobData.company_name || "",
        status: "pending"
      };
      
      // Insert the job
      const { data, error } = await supabase
        .from('jobs')
        .insert([newJobData])
        .select()
        .single();
      
      if (error) {
        console.error("JobsAPI: Failed to create job:", error);
        throw error;
      }
      
      console.log("JobsAPI: Job created successfully:", data);
      return data as Job;
    } catch (error) {
      console.error("JobsAPI: Exception creating job:", error);
      return null;
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

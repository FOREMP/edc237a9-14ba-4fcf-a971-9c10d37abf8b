import { Job, JobFilter, JobType, JobStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export class JobsFilterService {
  async getFilteredJobs(filter: JobFilter): Promise<Job[]> {
    try {
      console.log("JobsFilterService: Getting filtered jobs with filter:", filter);
      
      // First ensure we have a valid session before attempting to query
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log("Found active session, refreshing before job fetch");
          await supabase.auth.refreshSession();
        } else {
          console.log("No active session found for job fetch, continuing as public");
        }
      } catch (err) {
        console.log("Session check error, continuing with job fetch:", err);
      }
      
      // Always try a direct query first for efficiency
      try {
        // Start with a base query
        let query = supabase.from('jobs').select('*');
        
        // Apply status filter if provided
        if (filter.status) {
          query = query.eq('status', filter.status);
        }
        
        // Apply search filter if provided
        if (filter.search && filter.search.trim()) {
          const searchTerm = `%${filter.search.trim()}%`;
          query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},company_name.ilike.${searchTerm}`);
        }
        
        // Apply job type filter if provided
        if (filter.jobType && filter.jobType.length > 0) {
          query = query.in('job_type', filter.jobType);
        }
        
        // Apply education required filter if provided
        if (filter.educationRequired !== null && filter.educationRequired !== undefined) {
          query = query.eq('education_required', filter.educationRequired);
        }
        
        // Apply location filter if provided
        if (filter.location && filter.location.trim()) {
          const locationTerm = `%${filter.location.trim()}%`;
          query = query.ilike('location', locationTerm);
        }
        
        // Apply sorting
        if (filter.sortBy === 'newest') {
          query = query.order('created_at', { ascending: false });
        } else if (filter.sortBy === 'oldest') {
          query = query.order('created_at', { ascending: true });
        } else {
          // Default to newest
          query = query.order('created_at', { ascending: false });
        }
        
        // Execute the query
        const { data, error } = await query;
        
        if (error) {
          console.error("Error with standard query:", error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          console.log("No jobs found with the current filter");
          return [];
        }
        
        console.log(`JobsFilterService: Found ${data.length} jobs after filtering`);
        
        // Map the data to our Job type with proper type casting
        return data.map(job => this.mapJobData(job));
      } catch (queryError) {
        console.error("Error with standard query:", queryError);
        throw queryError;
      }
    } catch (error) {
      console.error("Error filtering jobs:", error);
      return [];
    }
  }
  
  /**
   * Get a specific job by ID
   */
  async getJobById(id: string): Promise<Job | null> {
    try {
      console.log("JobsFilterService: Getting job with ID:", id);
      
      // First ensure we have a valid session before attempting to query
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log("Found active session, refreshing before job detail fetch");
          await supabase.auth.refreshSession();
        } else {
          console.log("No active session found, continuing as public");
        }
      } catch (err) {
        console.log("Session check error, continuing with job detail fetch:", err);
      }
      
      // Try the authenticated query first which can access all jobs the user has permission for
      try {
        console.log(`Attempting to fetch job with ID: ${id} (authenticated or public)`);
        
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error("Error fetching job by ID:", error);
          
          // If there's a problem with the query itself (not RLS), throw the error
          if (error.code !== 'PGRST116') {
            throw error;
          }
          
          // Otherwise, try the public fallback approach
          console.log("Attempting fallback for public job access");
        } else if (data) {
          console.log("Successfully retrieved job data:", data.id);
          return this.mapJobData(data);
        }
      } catch (queryError) {
        console.error("Error with authenticated query:", queryError);
      }
      
      // Fallback for public access - explicitly filter for approved jobs
      console.log("Trying public fallback query for job ID:", id);
      const { data: publicData, error: publicError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .single();
        
      if (publicError) {
        console.error("Failed to fetch job with public access:", publicError);
        return null;
      }
      
      if (!publicData) {
        console.log("No job found with ID:", id);
        return null;
      }
      
      console.log("Successfully retrieved job via public access:", publicData.id);
      return this.mapJobData(publicData);
    } catch (error) {
      console.error("Error getting job by ID:", error);
      return null;
    }
  }
  
  private mapJobData(jobData: any): Job {
    return {
      id: jobData.id,
      companyId: jobData.company_id,
      title: jobData.title,
      description: jobData.description,
      requirements: jobData.requirements || '',
      jobType: jobData.job_type as JobType,
      educationRequired: jobData.education_required,
      location: jobData.location,
      salary: jobData.salary || '',
      email: jobData.email || '',
      phone: jobData.phone || '',
      createdAt: new Date(jobData.created_at),
      updatedAt: new Date(jobData.updated_at),
      companyName: jobData.company_name,
      status: jobData.status as JobStatus
    };
  }
}


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
        
        if (!error && data && data.length > 0) {
          console.log(`JobsFilterService: Found ${data.length} jobs after filtering`);
          
          // Map the data to our Job type with proper type casting
          return data.map(job => ({
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
          }));
        } else if (error) {
          console.error("Error with standard query:", error);
          // Continue to fallback
        }
      } catch (queryError) {
        console.error("Error with standard query:", queryError);
        // Continue to fallback
      }
      
      // If standard query failed, try a more direct approach that might bypass RLS
      console.log("Attempting RPC fallback query for jobs...");
      
      // Create dummy data for testing if all else fails
      const dummyJobs: Job[] = [];
      
      // Try to load real data from the database
      // FIX: Remove the RPC call that doesn't exist in the database
      try {
        // Instead of calling a non-existent RPC function, just count the jobs directly
        const { count, error } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true });
          
        console.log("Total jobs in database:", count);
        
        // If we can get a count but not the actual data, at least we know something's there
        if (count && count > 0) {
          console.log("Jobs exist but couldn't be fetched - returning empty array");
        } else {
          console.log("No jobs found in database");
        }
      } catch (countError) {
        console.error("Error getting job count:", countError);
      }
      
      console.log("JobsFilterService: Returning jobs:", dummyJobs.length);
      return dummyJobs;
      
    } catch (error) {
      console.error("Error filtering jobs:", error);
      return [];
    }
  }
}

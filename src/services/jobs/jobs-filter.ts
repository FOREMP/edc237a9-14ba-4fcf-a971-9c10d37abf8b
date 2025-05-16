
import { Job, JobFilter, JobType, JobStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export class JobsFilterService {
  async getFilteredJobs(filter: JobFilter): Promise<Job[]> {
    try {
      console.log("JobsFilterService: Getting filtered jobs with filter:", filter);
      
      // Ensure authenticated session is active and refreshed
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          console.log("Found active session, refreshing before job fetch");
          await supabase.auth.refreshSession();
        } else {
          console.log("No active session found for job fetch");
        }
      } catch (err) {
        console.log("Session check error, continuing with job fetch:", err);
      }
      
      // Start with a base query
      let query = supabase.from('jobs').select('*');
      
      // Apply status filter (default to approved for public listing)
      query = query.eq('status', filter.status || 'approved');

      // Apply search filter
      if (filter.search && filter.search.trim()) {
        const searchTerm = `%${filter.search.trim()}%`;
        query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},company_name.ilike.${searchTerm}`);
      }
      
      // Apply job type filter
      if (filter.jobType && filter.jobType.length > 0) {
        query = query.in('job_type', filter.jobType);
      }
      
      // Apply education required filter
      if (filter.educationRequired !== null && filter.educationRequired !== undefined) {
        query = query.eq('education_required', filter.educationRequired);
      }
      
      // Apply location filter
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
        console.error("Error filtering jobs:", error);
        return [];
      }
      
      console.log(`JobsFilterService: Found ${data?.length || 0} jobs after filtering`);
      
      // Convert to our Job type with proper mapping
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
        status: job.status as JobStatus // Explicitly cast status to JobStatus type
      }));
    } catch (error) {
      console.error("Error filtering jobs:", error);
      return [];
    }
  }
}

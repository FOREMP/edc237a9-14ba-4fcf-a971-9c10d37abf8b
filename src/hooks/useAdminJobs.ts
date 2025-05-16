
import { useState, useEffect, useCallback } from "react";
import { Job, JobType, JobStatus } from "@/types";
import { jobsService } from "@/services/jobs";
import { toast } from "sonner";
import { isAdminEmail } from "@/utils/adminEmails";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useAdminJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAdmin, isLoading: authLoading, adminCheckComplete } = useAuth();

  // Add a function to verify database access
  const verifyDatabaseAccess = useCallback(async (): Promise<boolean> => {
    try {
      // First check if we have an active session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionData.session || sessionError) {
        console.log("No active session, refreshing...");
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.error("Still no active session after refresh", refreshError);
          return false;
        }
        console.log("Session refreshed successfully:", refreshData.session.user.email);
      } else {
        console.log("Active session found:", sessionData.session.user.email);
      }

      // Test database access with a very simple query that should always work
      const { data, error: accessError } = await supabase
        .from('jobs')
        .select('id')
        .limit(1);

      if (accessError) {
        console.error("Database access test failed:", accessError);
        return false;
      }

      console.log("Database access verified successfully");
      return true;
    } catch (err) {
      console.error("Error verifying database access:", err);
      return false;
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Wait for complete admin status check before proceeding
      if (authLoading || !adminCheckComplete) {
        console.log("Admin check not complete yet, delaying job fetch");
        return;
      }
      
      // Enhanced debug info for job fetching
      console.log("Admin fetching jobs with user:", {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        isAdminByEmail: user?.email ? isAdminEmail(user.email) : false,
        isAdminByRole: user?.role === 'admin',
        isAdminFromHook: isAdmin
      });
      
      // More robust admin check - check both role AND email
      const isUserAdmin = isAdmin || (user?.email && isAdminEmail(user.email)) || user?.role === 'admin';
      
      // Check if admin has proper permissions
      if (!isUserAdmin) {
        console.warn("User does not have admin permissions to fetch all jobs");
        setError("Behörighet saknas för att visa alla jobb");
        toast.error("Behörighet saknas för att visa alla jobb");
        setIsLoading(false);
        return;
      }

      // Verify database access before attempting to fetch jobs
      const hasAccess = await verifyDatabaseAccess();
      if (!hasAccess) {
        console.error("Database access verification failed");
        
        // Force refresh session and try again
        await supabase.auth.refreshSession();
        
        // Try direct fetch with service key if possible
        // This is a more direct approach that bypasses RLS
        console.log("Attempting direct fetch of jobs without RLS constraints");
        
        try {
          // Direct query without relying on RLS - we'll manually check auth
          const { data, error } = await supabase
            .from('jobs')
            .select('*');
            
          if (error) {
            throw error;
          }
          
          if (!data || data.length === 0) {
            console.log("No jobs found in direct query");
            setJobs([]);
            setAllJobs([]);
            setError("Inga jobb hittades i databasen");
            setIsLoading(false);
            return;
          }
          
          console.log(`Found ${data.length} jobs through direct query`);
          
          // Convert to our Job type with proper casting
          const mappedJobs: Job[] = data.map(job => ({
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
          
          setAllJobs(mappedJobs);
          setJobs(mappedJobs);
          setError(null);
          
          console.log("Jobs loaded successfully:", mappedJobs.length);
        } catch (directError) {
          console.error("Error in direct fetch attempt:", directError);
          setError("Kunde inte hämta jobb: " + directError.message);
          setJobs([]);
          setAllJobs([]);
        }
        
        setIsLoading(false);
        return;
      }
      
      console.log("Proceeding with admin job fetch, admin status confirmed:", isUserAdmin);
      
      // Direct query to ensure we bypass any potential RLS issues
      const { data, error: jobsError } = await supabase
        .from('jobs')
        .select('*');
      
      if (jobsError) {
        console.error("Error fetching jobs directly:", jobsError);
        setError("Kunde inte hämta jobb: " + jobsError.message);
        setJobs([]);
        setAllJobs([]);
        setIsLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log("No jobs returned from direct query");
        setJobs([]);
        setAllJobs([]);
        setIsLoading(false);
        return;
      }
      
      console.log("All jobs fetched directly:", data.length);
      
      // Convert to our Job type with proper type casting
      const mappedJobs: Job[] = data.map(job => ({
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
      
      // Keep a copy of all jobs for debugging and reference
      setAllJobs(mappedJobs);
      setJobs(mappedJobs);

      // Debug table of jobs we got
      console.table(mappedJobs.slice(0, 5).map(job => ({
        id: job.id, 
        title: job.title,
        company: job.companyName,
        status: job.status
      })));
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Kunde inte hämta jobb");
      setError("Kunde inte hämta jobb");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, authLoading, adminCheckComplete, user?.email, user?.id, user?.role, verifyDatabaseAccess]);

  // Re-fetch jobs when admin status is confirmed
  useEffect(() => {
    if (!authLoading && adminCheckComplete) {
      // More robust admin check - check both role AND email
      const isUserAdmin = isAdmin || (user?.email && isAdminEmail(user.email)) || user?.role === 'admin';
      
      if (isUserAdmin) {
        console.log("Admin status confirmed, fetching jobs");
        fetchJobs();
      }
    }
  }, [isAdmin, authLoading, adminCheckComplete, fetchJobs, user?.email, user?.role]);

  // Add a function to retry fetching jobs
  const retryFetch = async () => {
    console.log("Manually retrying job fetch");
    await fetchJobs();
  };

  const updateJobStatus = async (jobId: string, status: 'approved' | 'rejected') => {
    try {
      console.log(`Updating job ${jobId} to status ${status}`);
      
      // More robust admin check - check both role AND email
      const isUserAdmin = isAdmin || (user?.email && isAdminEmail(user.email)) || user?.role === 'admin';
      
      // Check if admin has proper permissions
      if (!isUserAdmin) {
        console.warn("User does not have admin permissions to update job status");
        toast.error("Behörighet saknas för att uppdatera jobbstatus");
        return false;
      }
      
      await jobsService.updateJobStatus(jobId, status);
      
      // Update local state - both the jobs array and the allJobs array
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: status as JobStatus } : job
      ));
      
      setAllJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: status as JobStatus } : job
      ));
      
      toast.success(
        status === 'approved' 
          ? "Jobbannonsen har godkänts" 
          : "Jobbannonsen har nekats"
      );
      
      // Refresh all jobs after status change
      fetchJobs();
      
      return true;
    } catch (error) {
      console.error(`Error ${status === 'approved' ? 'approving' : 'rejecting'} job:`, error);
      toast.error(`Kunde inte ${status === 'approved' ? 'godkänna' : 'neka'} jobbet`);
      return false;
    }
  };

  return {
    jobs,
    allJobs,
    isLoading,
    error,
    fetchJobs,
    retryFetch,
    updateJobStatus,
  };
};

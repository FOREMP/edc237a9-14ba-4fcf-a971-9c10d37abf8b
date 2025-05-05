import { useState, useEffect, useCallback } from "react";
import { Job } from "@/types";
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
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log("No active session, refreshing...");
        await supabase.auth.refreshSession();
        
        // Check again after refresh
        const { data: refreshedSession } = await supabase.auth.getSession();
        if (!refreshedSession.session) {
          console.error("Still no active session after refresh");
          return false;
        }
      }

      // Test database access with a simple query that should work
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });

      if (testError) {
        console.error("Database access test failed:", testError);
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
        setError("Databasåtkomst nekad. Kontrollera att du är inloggad som administratör.");
        toast.error("Databasåtkomst nekad. Försöker igen...");
        
        // Try to refresh the session as a last attempt
        console.log("Attempting session refresh as recovery action");
        await supabase.auth.refreshSession();
        setIsLoading(false);
        return;
      }
      
      console.log("Proceeding with admin job fetch, admin status confirmed:", isUserAdmin);
      
      // Use the jobsService to get all jobs
      const allJobsData = await jobsService.getCompanyJobs();
      
      if (!allJobsData || allJobsData.length === 0) {
        console.log("No jobs returned from jobsService");
        setJobs([]);
        setAllJobs([]);
        setIsLoading(false);
        return;
      }
      
      console.log("All jobs fetched:", allJobsData.length);
      
      // Keep a copy of all jobs for debugging and reference
      setAllJobs(allJobsData);
      setJobs(allJobsData);

      // Debug table of jobs we got
      console.table(allJobsData.slice(0, 5).map(job => ({
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
        job.id === jobId ? { ...job, status } : job
      ));
      
      setAllJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status } : job
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

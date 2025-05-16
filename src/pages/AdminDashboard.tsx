
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2Icon, RefreshCcwIcon } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import the components and hooks
import AdminJobList from "@/components/admin/AdminJobList";
import JobActionDialog from "@/components/admin/JobActionDialog";
import AdminDebugInfo from "@/components/admin/AdminDebugInfo";
import { useAdminJobs } from "@/hooks/useAdminJobs";
import { isAdminEmail } from "@/utils/adminEmails";

const AdminDashboard = () => {
  const { isAuthenticated, isLoading: authLoading, hasAdminAccess, user, isAdmin, adminCheckComplete } = useRequireAuth();
  const { jobs, allJobs, isLoading, error, fetchJobs, retryFetch, updateJobStatus } = useAdminJobs();
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [permissionIssue, setPermissionIssue] = useState(false);
  const [sessionRefreshing, setSessionRefreshing] = useState(false);
  const [currentAction, setCurrentAction] = useState<{ 
    type: 'approve' | 'reject', 
    jobId: string | null,
    jobTitle?: string 
  }>({ 
    type: 'approve', 
    jobId: null 
  });
  
  const navigate = useNavigate();

  // Verify database session and access rights
  const verifySession = async () => {
    setSessionRefreshing(true);
    setPermissionIssue(false);
    
    try {
      // Force session refresh
      console.log("Forcing session refresh...");
      await supabase.auth.refreshSession();
      
      // Check if session is valid
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error("Session verification failed:", sessionError);
        setPermissionIssue(true);
        toast.error("Session verification failed. Please try logging in again.");
        return false;
      }
      
      console.log("Session verified successfully:", {
        userId: sessionData.session.user.id,
        email: sessionData.session.user.email
      });
      
      // Test access with a simple query
      const { data, error } = await supabase
        .from('jobs')
        .select('id')
        .limit(1);
        
      if (error) {
        console.error("Database access test failed:", error);
        setPermissionIssue(true);
        toast.error("Databasåtkomst nekad: " + error.message);
        return false;
      }
      
      console.log("Database access verified successfully");
      setPermissionIssue(false);
      return true;
    } catch (error) {
      console.error("Error during session verification:", error);
      setPermissionIssue(true);
      toast.error("Kunde inte verifiera session");
      return false;
    } finally {
      setSessionChecked(true);
      setSessionRefreshing(false);
    }
  };

  // Verify access to jobs
  useEffect(() => {
    if (isAuthenticated && user?.id && adminCheckComplete) {
      verifySession().then((success) => {
        if (success) {
          fetchJobs();
        }
      });
    }
  }, [isAuthenticated, user?.id, adminCheckComplete, fetchJobs]);

  // Enhanced logging
  useEffect(() => {
    console.log("AdminDashboard: Auth status -", { 
      isAuthenticated, 
      authLoading,
      hasAdminAccess,
      isAdmin,
      adminCheckComplete,
      email: user?.email,
      isAdminByEmail: user?.email ? isAdminEmail(user.email) : false,
      role: user?.role,
      permissionIssue,
      jobsCount: allJobs.length
    });
  }, [isAuthenticated, hasAdminAccess, isAdmin, authLoading, adminCheckComplete, user, permissionIssue, allJobs.length]);

  // Make sure only admins can access this page
  useEffect(() => {
    if (!authLoading && adminCheckComplete) {
      const isUserAdmin = isAdmin || hasAdminAccess || 
                         (user?.email && isAdminEmail(user.email)) || 
                         user?.role === 'admin';
      
      if (!isUserAdmin) {
        console.log("User lacks admin access, redirecting to home");
        toast.error("Du måste vara administratör för att se denna sida");
        navigate("/");
      }
    }
  }, [hasAdminAccess, isAdmin, authLoading, adminCheckComplete, navigate, user]);

  const handleApprove = (jobId: string, jobTitle?: string) => {
    setCurrentAction({ type: 'approve', jobId, jobTitle });
    setIsAlertOpen(true);
  };

  const handleReject = (jobId: string, jobTitle?: string) => {
    setCurrentAction({ type: 'reject', jobId, jobTitle });
    setIsAlertOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!currentAction.jobId) return;
    
    const success = await updateJobStatus(
      currentAction.jobId, 
      currentAction.type === 'approve' ? 'approved' : 'rejected'
    );
    
    if (success) {
      setIsAlertOpen(false);
      setCurrentAction({ type: 'approve', jobId: null });
    }
  };

  const handleManualRefresh = async () => {
    setSessionRefreshing(true);
    try {
      // First refresh the session
      await supabase.auth.refreshSession();
      toast.info("Session refreshed, retrying...");
      
      // Then retry fetching jobs
      await verifySession();
      await fetchJobs();
      
      toast.success("Data uppdaterad");
    } catch (error) {
      console.error("Manual refresh failed:", error);
      toast.error("Kunde inte uppdatera");
    } finally {
      setSessionRefreshing(false);
    }
  };

  if (authLoading || !adminCheckComplete) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh] flex-col">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary mb-4" />
          <div className="text-center">Kontrollerar behörighet...</div>
        </div>
      </Layout>
    );
  }

  // Filter jobs based on the active tab for current count
  const filteredJobs = jobs.filter(job => job.status === activeTab);

  // Get robust admin check result for UI
  const isUserAdmin = isAdmin || hasAdminAccess || 
                     (user?.email && isAdminEmail(user.email)) || 
                     user?.role === 'admin';
  const isSpecialAdminEmail = user?.email && isAdminEmail(user.email);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Hantera jobbannonser som väntar på godkännande</p>
          
          {/* Show permission error if detected */}
          {(error || permissionIssue) && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex justify-between items-center">
                <div>
                  {error || "Databasåtkomst nekad. Kontrollera att du är inloggad som administratör."}
                  {isSpecialAdminEmail && " Du använder ett registrerat admin-konto."}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleManualRefresh}
                  disabled={sessionRefreshing}
                >
                  {sessionRefreshing ? (
                    <>
                      <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      Uppdaterar...
                    </>
                  ) : (
                    <>
                      <RefreshCcwIcon className="w-4 h-4 mr-2" />
                      Uppdatera
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* User status information */}
          <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
            <p className="text-green-800 font-medium">
              Inloggad som: {user?.email} 
              {isUserAdmin && <span className="ml-2 font-bold">(Admin)</span>}
            </p>
          </div>
          
          {/* Debug info component with enhanced data */}
          <AdminDebugInfo 
            allJobsCount={allJobs.length}
            currentJobs={{
              tab: activeTab,
              count: filteredJobs.length
            }}
          />
        </div>

        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">Väntar på godkännande</TabsTrigger>
            <TabsTrigger value="approved">Godkända</TabsTrigger>
            <TabsTrigger value="rejected">Nekade</TabsTrigger>
          </TabsList>
          
          {['pending', 'approved', 'rejected'].map((status) => (
            <TabsContent key={status} value={status}>
              <AdminJobList 
                jobs={jobs}
                isLoading={isLoading || sessionRefreshing || !sessionChecked}
                status={status}
                onApprove={(jobId) => {
                  const job = jobs.find(j => j.id === jobId);
                  handleApprove(jobId, job?.title);
                }}
                onReject={(jobId) => {
                  const job = jobs.find(j => j.id === jobId);
                  handleReject(jobId, job?.title);
                }}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Job action confirmation dialog */}
        <JobActionDialog 
          isOpen={isAlertOpen}
          onOpenChange={setIsAlertOpen}
          actionType={currentAction.type}
          onConfirm={handleConfirmAction}
          jobTitle={currentAction.jobTitle}
        />
      </div>
    </Layout>
  );
};

export default AdminDashboard;

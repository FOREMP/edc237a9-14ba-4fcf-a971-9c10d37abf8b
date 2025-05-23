import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loader2Icon, AlertTriangle, Bug } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ApprovalProcessBanner from "@/components/dashboard/ApprovalProcessBanner";
import JobDialogs from "@/components/dashboard/JobDialogs";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import { useDashboardJobs } from "@/hooks/useDashboardJobs";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { toast } from "sonner";
import SubscriptionStatusCard from "@/components/dashboard/SubscriptionStatusCard";
import StatisticsCard from "@/components/dashboard/StatisticsCard";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { isAuthenticated, isLoading: authLoading, isAdmin, preferences, dismissApprovalProcess, user, isCompany, adminCheckComplete } = useRequireAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showApprovalMessage, setShowApprovalMessage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const navigate = useNavigate();

  // Use our custom hook for job management
  const { jobs, isLoading: jobsLoading, createJob, deleteJob, refreshJobs, remainingJobs } = useDashboardJobs(activeTab);
  
  // Use our subscription limits hook
  const { checkPostingLimit } = useSubscriptionLimits();

  // Use our subscription features hook - fix here: use "loading" instead of "isLoading"
  const { features, loading: featuresLoading, refreshSubscription } = useSubscriptionFeatures();

  // Verify profile access - debug for RLS issues
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !isCompany) return;
    
    // Explicitly test profile access for company users
    const testProfileAccess = async () => {
      try {
        console.log("Dashboard: Testing profile access for user", user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("RLS ERROR: Cannot access profile data:", error);
          setProfileError(`Database permission error: ${error.message}`);
          toast.error("Cannot load your profile data. This is likely an RLS permission issue.");
          return;
        }
        
        console.log("Dashboard: Successfully retrieved profile data:", data);
        setProfileData(data);
        
        // Also check for preferences access
        const { error: prefError } = await supabase
          .from('user_preferences')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (prefError) {
          console.error("RLS ERROR: Cannot access preferences:", prefError);
          setProfileError(prev => prev ? `${prev} and preferences` : `Database permission error: ${prefError.message}`);
        }
        
        // Test access to subscribers table
        const { error: subError } = await supabase
          .from('subscribers')
          .select('id, email, subscribed, subscription_tier')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (subError) {
          console.error("RLS ERROR: Cannot access subscribers:", subError);
          setProfileError(prev => prev ? `${prev} and subscribers` : `Database permission error: ${subError.message}`);
        }
        
        // Test access to job_posting_limits table
        const { error: limitsError } = await supabase
          .from('job_posting_limits')
          .select('id, monthly_post_limit, monthly_posts_used')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (limitsError) {
          console.error("RLS ERROR: Cannot access job_posting_limits:", limitsError);
          setProfileError(prev => prev ? `${prev} and job_posting_limits` : `Database permission error: ${limitsError.message}`);
        }
        
      } catch (err) {
        console.error("Dashboard: Exception during profile check:", err);
        setProfileError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    testProfileAccess();
  }, [isAuthenticated, user?.id, isCompany]);

  // Set showApprovalMessage based on user preferences
  useEffect(() => {
    if (preferences) {
      setShowApprovalMessage(!preferences.approvalProcessDismissed);
    }
  }, [preferences]);

  // Redirect admin to admin dashboard
  useEffect(() => {
    console.log("Dashboard auth check", { 
      isAdmin, 
      authLoading, 
      adminCheckComplete,
      isCompany,
      role: user?.role 
    });
    
    // Only redirect if auth check is complete and user is definitely an admin
    if (adminCheckComplete && !authLoading && isAdmin && user?.role === 'admin') {
      console.log("Redirecting admin to admin dashboard");
      navigate("/admin");
    }
  }, [isAdmin, authLoading, navigate, user, adminCheckComplete]);

  // Enhanced logging for debugging company user issues
  useEffect(() => {
    console.log("Dashboard component user state:", {
      isAuthenticated,
      isLoading: authLoading,
      adminCheckComplete,
      isAdmin, 
      isCompany,
      role: user?.role,
      email: user?.email,
      hasPreferences: !!preferences,
      hasFeatures: !!features,
      loadError,
      profileError,
      hasProfileData: !!profileData
    });
    
    // Check for potential rendering issues
    if (adminCheckComplete && !authLoading && isAuthenticated && isCompany && user?.role === 'company') {
      console.log("Company user should see dashboard now");
    }
  }, [
    isAuthenticated, 
    authLoading, 
    isAdmin, 
    isCompany, 
    user, 
    adminCheckComplete, 
    preferences, 
    features, 
    loadError, 
    profileData, 
    profileError
  ]);

  const handleCreateJob = async (formData) => {
    console.log("Starting job creation process");
    
    try {
      // First check if the user has hit their posting limit
      const canPost = await checkPostingLimit();
      console.log("Check posting limit result:", canPost);
      
      if (!canPost) {
        console.log("User has reached their posting limit");
        toast.error("Du har nått din månatliga gräns för jobbannonser.");
        return false;
      }

      // If they can post, create the job
      const success = await createJob(formData);
      if (success) {
        setIsDialogOpen(false);
        
        // Toast notification with success message
        toast.success("Jobbannonsen har skapats och väntar på godkännande.");
      } else {
        toast.error("Det gick inte att skapa jobbannonsen.");
      }
      return !!success;
    } catch (error) {
      console.error("Error in job creation:", error);
      toast.error("Ett fel uppstod när jobbannonsen skulle skapas.");
      return false;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    try {
      await deleteJob(jobToDelete);
      setJobToDelete(null);
      setIsAlertOpen(false);
      toast.success("Jobbannonsen har tagits bort.");
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Det gick inte att ta bort jobbannonsen.");
    }
  };

  const handleDeleteClick = (jobId) => {
    setJobToDelete(jobId);
    setIsAlertOpen(true);
  };

  const handleEditJob = (job) => {
    navigate(`/dashboard/edit/${job.id}`);
  };

  const handleDismissApprovalMessage = async () => {
    setShowApprovalMessage(false);
    try {
      const success = await dismissApprovalProcess();
      if (!success) {
        console.error("Failed to update user preferences");
      }
    } catch (error) {
      console.error("Error dismissing approval message:", error);
    }
  };

  // Show loading spinner while auth state is initializing or admin check is not complete
  if (authLoading || !adminCheckComplete) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh] flex-col">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Laddar användarinformation...</p>
        </div>
      </Layout>
    );
  }

  // Show error state if there's a loading error
  if (loadError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="flex justify-center items-center flex-col">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-4" />
            <p className="text-lg font-medium mb-2">Ett fel uppstod</p>
            <p className="text-muted-foreground">{loadError}</p>
            <button 
              className="mt-4 text-primary hover:underline" 
              onClick={() => window.location.reload()}
            >
              Försök igen
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Verify access before rendering dashboard content
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Åtkomst nekad</h2>
            <p className="mb-4">Du måste vara inloggad för att visa denna sida.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show RLS permission error if we detected one
  if (isCompany && profileError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Databas åtkomst problem</h2>
            <p className="mb-4">Du har inte åtkomst till profildata som behövs för att visa denna sida.</p>
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-lg mx-auto">
              <p className="text-amber-800 text-sm mb-2 font-medium">Teknisk information:</p>
              <p className="text-amber-800 text-sm">{profileError}</p>
              <p className="text-amber-800 text-sm mt-2">Detta är troligtvis ett RLS-policyfel i databasen.</p>
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <button 
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80" 
                onClick={() => window.location.reload()}
              >
                Försök igen
              </button>
              <button 
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300" 
                onClick={() => setDebugMode(!debugMode)}
              >
                {debugMode ? "Dölj" : "Visa"} teknisk info
              </button>
            </div>
            {debugMode && (
              <div className="mt-8 border border-slate-200 rounded-lg p-4 max-w-xl mx-auto bg-slate-50">
                <h3 className="text-left font-medium mb-2">Debug Information</h3>
                <pre className="text-left text-xs whitespace-pre-wrap overflow-auto p-2 bg-slate-100 rounded">
                  {JSON.stringify({
                    userId: user?.id,
                    email: user?.email,
                    role: user?.role,
                    isCompany,
                    hasProfileAccess: !!profileData,
                    error: profileError
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Company user dashboard - render this when user is a company
  if (isCompany || (!isAdmin && user?.role === 'company')) {
    console.log("Rendering company dashboard for user:", user?.email);
    
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <DashboardHeader onCreateClick={() => setIsDialogOpen(true)} />

          {showApprovalMessage && (
            <ApprovalProcessBanner onDismiss={handleDismissApprovalMessage} />
          )}

          {/* Subscription Status Card */}
          <SubscriptionStatusCard 
            features={features}
            remainingJobs={remainingJobs}
            refreshSubscription={refreshSubscription}
          />

          {/* Statistics Card */}
          <div className="mb-8">
            <StatisticsCard />
          </div>

          <div className="mb-8">
            <DashboardTabs 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              jobs={jobs}
              isLoading={jobsLoading}
              handleEditJob={handleEditJob}
              handleDeleteClick={handleDeleteClick}
              onCreateClick={() => setIsDialogOpen(true)}
            />
          </div>

          <JobDialogs 
            isDialogOpen={isDialogOpen}
            isAlertOpen={isAlertOpen}
            jobToDelete={jobToDelete}
            setIsDialogOpen={setIsDialogOpen}
            setIsAlertOpen={setIsAlertOpen}
            handleCreateJob={handleCreateJob}
            handleDeleteConfirm={handleDeleteConfirm}
          />
        </div>
      </Layout>
    );
  }

  // If we get here, user is authenticated but isn't a company or admin
  // This is a fallback in case a user has no role assigned
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Välkommen!</h2>
          <p className="mb-4">Din användarroll är inte konfigurerad. Kontakta administratören.</p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
            <p>Debug info: Authenticated but role detection failed.</p>
            <p className="text-sm mt-2">User: {user ? JSON.stringify({
              email: user.email,
              role: user.role,
              isCompany,
              isAdmin
            }, null, 2) : "No user data"}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

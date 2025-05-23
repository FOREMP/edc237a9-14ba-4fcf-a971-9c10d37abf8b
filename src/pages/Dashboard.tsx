
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loader2Icon, AlertTriangle } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ApprovalProcessBanner from "@/components/dashboard/ApprovalProcessBanner";
import JobDialogs from "@/components/dashboard/JobDialogs";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import { useDashboardJobs } from "@/hooks/useDashboardJobs";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { toast } from "sonner";
import SubscriptionStatusCard from "@/components/dashboard/SubscriptionStatusCard";
import StatisticsCard from "@/components/dashboard/StatisticsCard";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const Dashboard = () => {
  const { isAuthenticated, isLoading: authLoading, isAdmin, preferences, dismissApprovalProcess, user, isCompany, adminCheckComplete } = useRequireAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showApprovalMessage, setShowApprovalMessage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Use our custom hook for job management
  const { jobs, isLoading, createJob, deleteJob, refreshJobs, remainingJobs } = useDashboardJobs(activeTab);
  
  // Use our subscription limits hook
  const { checkPostingLimit } = useSubscriptionLimits();

  // Use our subscription status hook
  const { features, refreshSubscription } = useSubscriptionStatus();

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
      loadError
    });
    
    // Check for potential rendering issues
    if (adminCheckComplete && !authLoading && isAuthenticated && isCompany && user?.role === 'company') {
      console.log("Company user should see dashboard now");
    }
  }, [isAuthenticated, authLoading, isAdmin, isCompany, user, adminCheckComplete, preferences, features, loadError]);

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
              isLoading={isLoading}
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

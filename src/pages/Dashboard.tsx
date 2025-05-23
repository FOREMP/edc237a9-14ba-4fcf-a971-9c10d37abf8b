
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loader2Icon } from "lucide-react";
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

  // Log user authentication status for debugging
  useEffect(() => {
    console.log("Dashboard component user state:", {
      isAuthenticated,
      isLoading: authLoading,
      adminCheckComplete,
      isAdmin, 
      isCompany,
      role: user?.role,
      email: user?.email
    });
  }, [isAuthenticated, authLoading, isAdmin, isCompany, user, adminCheckComplete]);

  const handleCreateJob = async (formData) => {
    console.log("Starting job creation process");
    
    // First check if the user has hit their posting limit
    const canPost = await checkPostingLimit();
    console.log("Check posting limit result:", canPost);
    
    if (!canPost) {
      console.log("User has reached their posting limit");
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
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    await deleteJob(jobToDelete);
    setJobToDelete(null);
    setIsAlertOpen(false);
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
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
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
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;


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
  const { isAuthenticated, isLoading: authLoading, isAdmin, preferences, dismissApprovalProcess, user } = useRequireAuth();
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
    if (!authLoading && isAdmin) {
      navigate("/admin");
    }
  }, [isAdmin, authLoading, navigate]);

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

  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

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

        {/* Statistics Card - New Addition */}
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
};

export default Dashboard;

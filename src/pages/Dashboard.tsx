
import { useState } from "react";
import Layout from "@/components/Layout";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import JobDialogs from "@/components/dashboard/JobDialogs";
import SubscriptionStatusCard from "@/components/dashboard/SubscriptionStatusCard";
import { useDashboardJobs } from "@/hooks/useDashboardJobs";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("company");
  
  const {
    jobs,
    isLoading,
    handleEdit,
    handleDelete,
    handleCreateJob,
    handleCreateClick,
    handleDeleteConfirm,
    isCreating,
    isDialogOpen,
    setIsDialogOpen,
    isAlertOpen,
    setIsAlertOpen,
    jobToDelete
  } = useDashboardJobs();

  const { features, refreshSubscription } = useSubscriptionFeatures();
  const { getRemainingJobSlots } = useSubscriptionLimits();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader onCreateClick={handleCreateClick} />
        
        <SubscriptionStatusCard 
          features={features}
          remainingJobs={features.monthlyPostLimit - features.monthlyPostsUsed}
          refreshSubscription={refreshSubscription}
        />
        
        <DashboardTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          jobs={jobs}
          isLoading={isLoading}
          handleEditJob={handleEdit}
          handleDeleteClick={handleDelete}
          onCreateClick={handleCreateClick}
        />

        <JobDialogs
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          isAlertOpen={isAlertOpen}
          setIsAlertOpen={setIsAlertOpen}
          handleCreateJob={handleCreateJob}
          handleDeleteConfirm={handleDeleteConfirm}
          jobToDelete={jobToDelete}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;

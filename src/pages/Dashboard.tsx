
import { useState } from "react";
import Layout from "@/components/Layout";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import JobDialogs from "@/components/dashboard/JobDialogs";
import { useDashboardJobs } from "@/hooks/useDashboardJobs";

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />
        
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
          isCreating={isCreating}
          jobToDelete={jobToDelete}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompanyProfile from "@/components/CompanyProfile";
import JobList from "@/components/dashboard/JobList";
import { Job } from "@/types";

interface DashboardTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  jobs: Job[];
  isLoading: boolean;
  handleEditJob: (job: Job) => void;
  handleDeleteClick: (jobId: string) => void;
  onCreateClick: () => void;
}

const DashboardTabs = ({
  activeTab,
  setActiveTab,
  jobs,
  isLoading,
  handleEditJob,
  handleDeleteClick,
  onCreateClick
}: DashboardTabsProps) => {
  return (
    <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="company">Ditt företag</TabsTrigger>
        <TabsTrigger value="all">Alla jobb</TabsTrigger>
        <TabsTrigger value="pending">Under granskning</TabsTrigger>
        <TabsTrigger value="approved">Godkända</TabsTrigger>
        <TabsTrigger value="rejected">Nekade</TabsTrigger>
        <TabsTrigger value="expired">Utgångna</TabsTrigger>
      </TabsList>
      
      <TabsContent value="company">
        <CompanyProfile />
      </TabsContent>
      
      <TabsContent value="all">
        <h2 className="text-xl font-semibold mb-4">Dina jobbannonser</h2>
        <JobList 
          jobs={jobs}
          isLoading={isLoading}
          onEdit={handleEditJob}
          onDelete={handleDeleteClick}
          onCreateClick={onCreateClick}
          tabValue="all"
        />
      </TabsContent>
      
      {['pending', 'approved', 'rejected', 'expired'].map((status) => (
        <TabsContent key={status} value={status}>
          <h2 className="text-xl font-semibold mb-4">
            {status === 'pending' ? 'Under granskning' : 
             status === 'approved' ? 'Godkända' : 
             status === 'rejected' ? 'Nekade' : 
             'Utgångna'} annonser
          </h2>
          <JobList 
            jobs={jobs}
            isLoading={isLoading}
            onEdit={handleEditJob}
            onDelete={handleDeleteClick}
            onCreateClick={onCreateClick}
            tabValue={status}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default DashboardTabs;

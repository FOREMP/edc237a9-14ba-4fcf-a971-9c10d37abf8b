
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompanyProfile from "@/components/CompanyProfile";
import JobList from "@/components/dashboard/JobList";
import { Job } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  return (
    <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
      <div className="px-2 max-w-full overflow-x-auto">
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="company" className={isMobile ? "text-xs" : ""}>Ditt företag</TabsTrigger>
          <TabsTrigger value="all" className={isMobile ? "text-xs" : ""}>Alla jobb</TabsTrigger>
          <TabsTrigger value="pending" className={isMobile ? "text-xs" : ""}>Under granskning</TabsTrigger>
          <TabsTrigger value="approved" className={isMobile ? "text-xs" : ""}>Godkända</TabsTrigger>
          <TabsTrigger value="rejected" className={isMobile ? "text-xs" : ""}>Nekade</TabsTrigger>
          <TabsTrigger value="expired" className={isMobile ? "text-xs" : ""}>Utgångna</TabsTrigger>
        </TabsList>
      </div>
      
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

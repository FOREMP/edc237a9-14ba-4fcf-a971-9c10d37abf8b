
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
      <div className="px-1 max-w-full overflow-x-auto">
        <TabsList className={`mb-6 w-full ${isMobile ? 'flex-col h-auto gap-1 p-1' : 'justify-start'}`}>
          <TabsTrigger 
            value="company" 
            className={`${isMobile ? 'w-full justify-start text-sm py-3' : 'text-xs'}`}
          >
            Ditt företag
          </TabsTrigger>
          <TabsTrigger 
            value="all" 
            className={`${isMobile ? 'w-full justify-start text-sm py-3' : 'text-xs'}`}
          >
            Alla jobb
          </TabsTrigger>
          <TabsTrigger 
            value="pending" 
            className={`${isMobile ? 'w-full justify-start text-sm py-3' : 'text-xs'}`}
          >
            Väntar godkännande
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className={`${isMobile ? 'w-full justify-start text-sm py-3' : 'text-xs'}`}
          >
            Godkända
          </TabsTrigger>
          <TabsTrigger 
            value="rejected" 
            className={`${isMobile ? 'w-full justify-start text-sm py-3' : 'text-xs'}`}
          >
            Nekade
          </TabsTrigger>
          <TabsTrigger 
            value="expired" 
            className={`${isMobile ? 'w-full justify-start text-sm py-3' : 'text-xs'}`}
          >
            Utgångna
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="company">
        <CompanyProfile />
      </TabsContent>
      
      <TabsContent value="all">
        <h2 className="text-xl font-semibold mb-4">Alla dina jobbannonser</h2>
        <JobList 
          jobs={jobs}
          isLoading={isLoading}
          onEdit={handleEditJob}
          onDelete={handleDeleteClick}
          onCreateClick={onCreateClick}
          tabValue="all"
        />
      </TabsContent>
      
      <TabsContent value="pending">
        <h2 className="text-xl font-semibold mb-4">Väntar på godkännande</h2>
        <p className="text-muted-foreground mb-4">
          Dessa jobbannonser har skickats in och väntar på att godkännas av en administratör.
        </p>
        <JobList 
          jobs={jobs}
          isLoading={isLoading}
          onEdit={handleEditJob}
          onDelete={handleDeleteClick}
          onCreateClick={onCreateClick}
          tabValue="pending"
        />
      </TabsContent>
      
      <TabsContent value="approved">
        <h2 className="text-xl font-semibold mb-4">Godkända annonser</h2>
        <p className="text-muted-foreground mb-4">
          Dessa jobbannonser är publicerade och synliga för jobbsökare.
        </p>
        <JobList 
          jobs={jobs}
          isLoading={isLoading}
          onEdit={handleEditJob}
          onDelete={handleDeleteClick}
          onCreateClick={onCreateClick}
          tabValue="approved"
        />
      </TabsContent>
      
      <TabsContent value="rejected">
        <h2 className="text-xl font-semibold mb-4">Nekade annonser</h2>
        <p className="text-muted-foreground mb-4">
          Dessa jobbannonser har nekats av en administratör. Du kan redigera och skicka in dem igen.
        </p>
        <JobList 
          jobs={jobs}
          isLoading={isLoading}
          onEdit={handleEditJob}
          onDelete={handleDeleteClick}
          onCreateClick={onCreateClick}
          tabValue="rejected"
        />
      </TabsContent>
      
      <TabsContent value="expired">
        <h2 className="text-xl font-semibold mb-4">Utgångna annonser</h2>
        <p className="text-muted-foreground mb-4">
          Dessa jobbannonser har gått ut (30 dagar efter godkännande) och är inte längre synliga.
        </p>
        <JobList 
          jobs={jobs}
          isLoading={isLoading}
          onEdit={handleEditJob}
          onDelete={handleDeleteClick}
          onCreateClick={onCreateClick}
          tabValue="expired"
        />
      </TabsContent>
    </Tabs>
  );
};

export default DashboardTabs;


import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface DashboardHeaderProps {
  onCreateClick: () => void;
}

const DashboardHeader = ({ onCreateClick }: DashboardHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
      <h1 className="text-3xl font-bold">Företagsdashboard</h1>
      <Button onClick={onCreateClick} className="w-full sm:w-auto">
        <PlusIcon size={16} className="mr-2" />
        Skapa jobb
      </Button>
    </div>
  );
};

export default DashboardHeader;

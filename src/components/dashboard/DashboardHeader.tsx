
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface DashboardHeaderProps {
  onCreateClick: () => void;
}

const DashboardHeader = ({ onCreateClick }: DashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">Företagsdashboard</h1>
      <Button onClick={onCreateClick}>
        <PlusIcon size={16} className="mr-2" />
        Skapa jobb
      </Button>
    </div>
  );
};

export default DashboardHeader;

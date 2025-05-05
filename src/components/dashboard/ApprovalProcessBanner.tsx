
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

interface ApprovalProcessBannerProps {
  onDismiss: () => void;
}

const ApprovalProcessBanner = ({ onDismiss }: ApprovalProcessBannerProps) => {
  return (
    <div className="mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded-lg relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100"
        onClick={onDismiss}
      >
        <XIcon size={16} />
        <span className="sr-only">Stäng</span>
      </Button>
      <h2 className="text-lg font-semibold text-yellow-800">Godkännandeprocess</h2>
      <p className="text-yellow-700 pr-8">
        Alla nya jobbannonser måste godkännas av en administratör innan de blir synliga för alla besökare.
        När en annons har skapats får den statusen "Under granskning" tills den granskas.
      </p>
      <div className="mt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50"
          onClick={onDismiss}
        >
          Förstått, visa inte igen
        </Button>
      </div>
    </div>
  );
};

export default ApprovalProcessBanner;


import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface JobDetailErrorProps {
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

const JobDetailError = ({ error, onRetry, onClose }: JobDetailErrorProps) => {
  return (
    <DialogContent className="sm:max-w-[900px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          {error || "Jobbet hittades inte"}
        </DialogTitle>
        <DialogClose className="absolute right-4 top-4" />
      </DialogHeader>
      <div className="text-center py-6">
        <p className="text-muted-foreground mb-4">
          {error ? error : "Jobbet kan ha tagits bort eller är inte längre tillgängligt."}
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={onClose}>
            Stäng
          </Button>
          <Button 
            variant="default" 
            onClick={onRetry}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Försök igen
          </Button>
        </div>
      </div>
    </DialogContent>
  );
};

export default JobDetailError;

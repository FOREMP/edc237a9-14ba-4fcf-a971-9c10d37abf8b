
import { DialogClose, DialogContent } from "@/components/ui/dialog";

const JobDetailLoading = () => {
  return (
    <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
      <DialogClose className="absolute right-4 top-4" />
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 rounded-full border-4 border-t-primary border-primary/30 animate-spin"></div>
        <span className="ml-3 text-muted-foreground">Hämtar jobbinformation...</span>
      </div>
    </DialogContent>
  );
};

export default JobDetailLoading;

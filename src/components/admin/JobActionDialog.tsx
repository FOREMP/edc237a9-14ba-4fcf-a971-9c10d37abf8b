
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface JobActionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'approve' | 'reject';
  onConfirm: () => void;
  jobTitle?: string;
}

const JobActionDialog = ({ 
  isOpen, 
  onOpenChange, 
  actionType, 
  onConfirm,
  jobTitle = "denna jobbannons"
}: JobActionDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {actionType === 'approve' ? "Godkänn jobbannons" : "Neka jobbannons"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {actionType === 'approve' 
              ? `Är du säker på att du vill godkänna "${jobTitle}"? Den kommer att bli synlig för alla på jobblistan.`
              : `Är du säker på att du vill neka "${jobTitle}"? Den kommer att markeras som nekad.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={actionType === 'approve' ? "bg-green-600 hover:bg-green-700" : "bg-destructive text-destructive-foreground"}
          >
            {actionType === 'approve' ? "Godkänn" : "Neka"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default JobActionDialog;

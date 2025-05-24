
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Job, JobFormData } from "@/types";
import JobForm from "@/components/JobForm";

interface JobDialogsProps {
  isDialogOpen: boolean;
  isAlertOpen: boolean;
  jobToDelete: string | null;
  setIsDialogOpen: (open: boolean) => void;
  setIsAlertOpen: (open: boolean) => void;
  handleCreateJob: (formData: JobFormData) => Promise<boolean>;
  handleDeleteConfirm: () => Promise<void>;
}

const JobDialogs = ({
  isDialogOpen,
  isAlertOpen,
  jobToDelete,
  setIsDialogOpen,
  setIsAlertOpen,
  handleCreateJob,
  handleDeleteConfirm
}: JobDialogsProps) => {
  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Skapa ny jobbannons</DialogTitle>
            <DialogDescription>
              Fyll i formuläret nedan för att skapa en ny jobbannons. 
              Annonsen kommer att granskas av en administratör innan den publiceras.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="pr-4 max-h-[calc(85vh-120px)]">
            <div className="pb-4">
              <JobForm 
                onSubmit={handleCreateJob} 
                onCancel={() => setIsDialogOpen(false)}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Denna åtgärd kan inte ångras. Detta kommer permanent ta bort
              jobbannonsen från systemet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default JobDialogs;

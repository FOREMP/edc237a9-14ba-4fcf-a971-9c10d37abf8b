
import { Button } from "@/components/ui/button";
import { Job, JobFormData } from "@/types";
import { useJobForm } from "@/hooks/useJobForm";
import JobTitleField from "./job-form/JobTitleField";
import JobDescriptionField from "./job-form/JobDescriptionField";
import JobRequirementsField from "./job-form/JobRequirementsField";
import JobTypeField from "./job-form/JobTypeField";
import LocationSalaryFields from "./job-form/LocationSalaryFields";
import EducationField from "./job-form/EducationField";
import ContactFields from "./job-form/ContactFields";

interface JobFormProps {
  initialData?: Job;
  onSubmit: (data: JobFormData) => Promise<boolean>;
  onCancel: () => void;
}

const JobForm = ({ initialData, onSubmit, onCancel }: JobFormProps) => {
  const {
    formData,
    errors,
    handleChange,
    handleSelectChange,
    handleSwitchChange,
    handleSubmit,
  } = useJobForm({ initialData, onSubmit });

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      <div className="space-y-4">
        <JobTitleField
          value={formData.title}
          onChange={handleChange}
          error={errors.title}
        />

        <JobDescriptionField
          value={formData.description}
          onChange={handleChange}
          error={errors.description}
        />

        <JobRequirementsField
          value={formData.requirements}
          onChange={handleChange}
          error={errors.requirements}
        />

        <ContactFields
          phone={formData.phone || ""}
          email={formData.email || ""}
          onChange={handleChange}
        />

        <LocationSalaryFields
          location={formData.location}
          salary={formData.salary}
          onChange={handleChange}
          locationError={errors.location}
        />

        <JobTypeField
          value={formData.jobType}
          onValueChange={(value) => handleSelectChange(value, "jobType")}
        />

        <EducationField
          checked={formData.educationRequired}
          onCheckedChange={handleSwitchChange}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit">
          {initialData ? "Uppdatera jobb" : "Skapa jobb"}
        </Button>
      </div>
    </form>
  );
};

export default JobForm;

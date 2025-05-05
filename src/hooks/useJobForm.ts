import { useState } from "react";
import { JobFormData } from "@/types";
import { toast } from "sonner";

interface UseJobFormProps {
  initialData?: JobFormData;
  onSubmit: (data: JobFormData) => Promise<boolean>;
}

export const useJobForm = ({ initialData, onSubmit }: UseJobFormProps) => {
  const [formData, setFormData] = useState<JobFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    requirements: initialData?.requirements || "",
    jobType: initialData?.jobType || "fulltime",
    educationRequired: initialData?.educationRequired || false,
    location: initialData?.location || "",
    salary: initialData?.salary || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, educationRequired: checked }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Jobbtitel krävs";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Beskrivning krävs";
    }
    
    if (!formData.requirements.trim()) {
      newErrors.requirements = "Krav krävs";
    }
    
    if (!formData.location.trim()) {
      newErrors.location = "Plats krävs";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Vänligen fyll i alla obligatoriska fält");
      return false;
    }

    return await onSubmit(formData);
  };

  return {
    formData,
    errors,
    handleChange,
    handleSelectChange,
    handleSwitchChange,
    handleSubmit,
  };
};

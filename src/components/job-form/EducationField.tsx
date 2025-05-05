
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface EducationFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const EducationField = ({ checked, onCheckedChange }: EducationFieldProps) => (
  <div className="flex items-center space-x-2">
    <Switch
      id="educationRequired"
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
    <Label htmlFor="educationRequired">Utbildning krävs</Label>
  </div>
);

export default EducationField;

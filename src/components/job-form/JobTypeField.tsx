
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobType } from "@/types";

interface JobTypeFieldProps {
  value: JobType;
  onValueChange: (value: JobType) => void;
}

const JobTypeField = ({ value, onValueChange }: JobTypeFieldProps) => (
  <div>
    <Label htmlFor="jobType">Anställningstyp *</Label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id="jobType">
        <SelectValue placeholder="Välj anställningstyp" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="fulltime">Heltid</SelectItem>
        <SelectItem value="parttime">Deltid</SelectItem>
        <SelectItem value="internship">Praktik</SelectItem>
        <SelectItem value="freelance">Freelance</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export default JobTypeField;

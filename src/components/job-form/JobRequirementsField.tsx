
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JobRequirementsFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
}

const JobRequirementsField = ({ value, onChange, error }: JobRequirementsFieldProps) => (
  <div>
    <Label htmlFor="requirements">Krav *</Label>
    <Textarea
      id="requirements"
      name="requirements"
      value={value}
      onChange={onChange}
      rows={3}
      placeholder="Beskriv vilka färdigheter och erfarenheter som krävs..."
      className={error ? "border-destructive" : ""}
    />
    {error && <p className="text-sm text-destructive mt-1">{error}</p>}
  </div>
);

export default JobRequirementsField;

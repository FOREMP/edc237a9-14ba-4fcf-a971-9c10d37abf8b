
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JobDescriptionFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
}

const JobDescriptionField = ({ value, onChange, error }: JobDescriptionFieldProps) => (
  <div>
    <Label htmlFor="description">Beskrivning *</Label>
    <Textarea
      id="description"
      name="description"
      value={value}
      onChange={onChange}
      rows={5}
      placeholder="Beskriv arbetsuppgifterna och vad rollen innebär..."
      className={error ? "border-destructive" : ""}
    />
    {error && <p className="text-sm text-destructive mt-1">{error}</p>}
  </div>
);

export default JobDescriptionField;


import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface JobTitleFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

const JobTitleField = ({ value, onChange, error }: JobTitleFieldProps) => (
  <div>
    <Label htmlFor="title">Jobbtitel *</Label>
    <Input
      id="title"
      name="title"
      value={value}
      onChange={onChange}
      className={error ? "border-destructive" : ""}
      placeholder="T.ex. Webbutvecklare"
    />
    {error && <p className="text-sm text-destructive mt-1">{error}</p>}
  </div>
);

export default JobTitleField;


import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface LocationSalaryFieldsProps {
  location: string;
  salary: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  locationError?: string;
}

const LocationSalaryFields = ({ location, salary, onChange, locationError }: LocationSalaryFieldsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label htmlFor="location">Plats *</Label>
      <Input
        id="location"
        name="location"
        value={location}
        onChange={onChange}
        placeholder="T.ex. Stockholm, Distansarbete"
        className={locationError ? "border-destructive" : ""}
      />
      {locationError && <p className="text-sm text-destructive mt-1">{locationError}</p>}
    </div>
    <div>
      <Label htmlFor="salary">Lön (Valfritt)</Label>
      <Input
        id="salary"
        name="salary"
        value={salary}
        onChange={onChange}
        placeholder="T.ex. 35 000 - 45 000 kr/månad"
      />
    </div>
  </div>
);

export default LocationSalaryFields;

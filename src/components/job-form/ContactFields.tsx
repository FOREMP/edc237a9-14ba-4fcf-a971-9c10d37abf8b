
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ContactFieldsProps {
  phone: string;
  email: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ContactFields = ({ phone, email, onChange }: ContactFieldsProps) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Kontaktuppgifter</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="phone">Telefonnummer</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={onChange}
          placeholder="T.ex. 070-123 45 67"
        />
      </div>
      <div>
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={onChange}
          placeholder="T.ex. rekrytering@företag.se"
        />
      </div>
    </div>
  </div>
);

export default ContactFields;

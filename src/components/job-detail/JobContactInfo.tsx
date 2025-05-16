
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobContactInfoProps {
  email?: string;
  phone?: string;
}

const JobContactInfo = ({ email, phone }: JobContactInfoProps) => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold">Kontakt</h3>
      <div className="space-y-2">
        {email && (
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-muted-foreground" />
            <a href={`mailto:${email}`} className="text-primary hover:underline">
              {email}
            </a>
          </div>
        )}
        
        {phone && (
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-muted-foreground" />
            <a href={`tel:${phone}`} className="text-primary hover:underline">
              {phone}
            </a>
          </div>
        )}
        
        <Button className="w-full mt-2 bg-white text-primary border-primary font-semibold hover:bg-white hover:text-primary" asChild>
          <a href={`mailto:${email || ''}`}>
            Kontakta arbetsgivaren
          </a>
        </Button>
      </div>
    </div>
  );
};

export default JobContactInfo;

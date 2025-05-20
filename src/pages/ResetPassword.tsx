
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Vänligen fyll i din e-postadress");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await authService.resetPassword(email);
      
      if (result.success) {
        setEmailSent(true);
        toast.success("Återställningslänk har skickats till din e-post");
      } else {
        toast.error(result.error || "E-postadressen hittades inte");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Ett fel uppstod vid återställning av lösenord");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Återställ lösenord</CardTitle>
            <CardDescription className="text-center">
              {!emailSent 
                ? "Ange din e-postadress för att få en länk att återställa ditt lösenord" 
                : "En återställningslänk har skickats till din e-post"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="din@email.se" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isLoading ? "Skickar..." : "Skicka återställningslänk"}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p>Vi har skickat en återställningslänk till <span className="font-medium">{email}</span>.</p>
                <p>Vänligen kontrollera din inkorg och klicka på länken för att återställa ditt lösenord.</p>
                <p className="text-sm text-muted-foreground">Om du inte hittar e-postmeddelandet, kontrollera din skräppost.</p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              {emailSent ? "Tillbaka till inloggning" : "Avbryt"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default ResetPassword;

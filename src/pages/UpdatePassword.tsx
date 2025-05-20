
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const UpdatePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const navigate = useNavigate();
  
  // Check if the recovery token is valid
  useEffect(() => {
    const checkRecoveryToken = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error checking recovery token:", error);
        setTokenValid(false);
        return;
      }
      
      if (data.session) {
        setTokenValid(true);
      } else {
        // No session means the recovery link is invalid or expired
        setTokenValid(false);
      }
    };
    
    checkRecoveryToken();
  }, []);
  
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error("Fyll i båda lösenordsfälten");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Lösenorden matchar inte");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Lösenordet måste vara minst 6 tecken");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await authService.updatePasswordFromReset(newPassword);
      
      if (result.success) {
        toast.success("Lösenordet har uppdaterats");
        navigate("/auth"); // Redirect to login page
      } else {
        toast.error(result.error || "Kunde inte uppdatera lösenordet");
      }
    } catch (error) {
      console.error("Update password error:", error);
      toast.error("Ett fel uppstod vid uppdatering av lösenordet");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (tokenValid === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Verifierar länk...</CardTitle>
              <CardDescription className="text-center">
                Vänligen vänta medan vi verifierar din återställningslänk.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }
  
  if (tokenValid === false) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-destructive">
                <div className="flex justify-center mb-4">
                  <AlertTriangle size={32} className="text-destructive" />
                </div>
                Ogiltig eller utgången länk
              </CardTitle>
              <CardDescription className="text-center">
                Länken för återställning av lösenord är ogiltig eller har utgått.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => navigate("/reset-password")}
              >
                Begär en ny återställningslänk
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Uppdatera lösenord</CardTitle>
            <CardDescription className="text-center">
              Ange ett nytt lösenord för ditt konto
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nytt lösenord</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Bekräfta lösenord</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                <Lock className="mr-2 h-4 w-4" />
                {isLoading ? "Uppdaterar..." : "Uppdatera lösenord"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UpdatePassword;


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface LoginFormProps {
  returnPath?: string;
}

const LoginForm = ({ returnPath = "/dashboard" }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    companyName: "",
    confirmPassword: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success("Inloggning lyckades!");
        window.location.href = returnPath;
      }
    } catch (error) {
      toast.error("Ett fel uppstod vid inloggning");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Lösenorden matchar inte");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Lösenordet måste vara minst 6 tecken");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}${returnPath}`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            company_name: formData.companyName || 'Company'
          }
        }
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success("Konto skapat! Kontrollera din e-post för att bekräfta kontot.");
      }
    } catch (error) {
      toast.error("Ett fel uppstod vid registrering");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[500px]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-slate-900">Välkommen</CardTitle>
          <CardDescription className="text-slate-600">
            Logga in på ditt konto eller skapa ett nytt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Registrera</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-slate-700">E-post</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="din@epost.se"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="border-slate-200 focus:border-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-slate-700">Lösenord</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="border-slate-200 focus:border-primary"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loggar in...
                    </>
                  ) : (
                    "Logga in"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-700">E-post</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="din@epost.se"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="border-slate-200 focus:border-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-slate-700">Företagsnamn</Label>
                  <Input
                    id="company-name"
                    name="companyName"
                    type="text"
                    placeholder="Ditt företagsnamn"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="border-slate-200 focus:border-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-700">Lösenord</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="border-slate-200 focus:border-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-slate-700">Bekräfta lösenord</Label>
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="border-slate-200 focus:border-primary"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrerar...
                    </>
                  ) : (
                    "Skapa konto"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;

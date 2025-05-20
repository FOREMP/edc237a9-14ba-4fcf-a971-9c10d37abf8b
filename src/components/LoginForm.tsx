
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, User } from "lucide-react";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface LoginFormProps {
  returnPath?: string;
}

const LoginForm = ({ returnPath = "/dashboard" }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const navigate = useNavigate();
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Fyll i både e-post och lösenord");
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Logging in with email:", email);
      const result = await authService.loginWithEmail(email, password);
      
      if (result.success) {
        console.log("Login successful, user:", result.user);
        toast.success("Inloggad som " + (result.user?.companyName || email));
        console.log("Login successful, navigating to:", returnPath);
        navigate(returnPath);
      } else {
        console.error("Login failed:", result.error);
        toast.error(result.error || "Inloggning misslyckades");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Ett fel uppstod vid inloggning");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !companyName) {
      toast.error("Fyll i alla fält");
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Registering with email:", email);
      const result = await authService.registerWithEmail(email, password, companyName);
      
      if (result.success) {
        if (result.error) {
          // This is a success but with a message (e.g., "check your email")
          console.log("Registration succeeded with notice:", result.error);
          toast.info(result.error);
        } else {
          console.log("Registration successful, user:", result.user);
          toast.success("Registrering lyckades! Du är nu inloggad");
          console.log("Registration successful, navigating to:", returnPath);
          navigate(returnPath);
        }
      } else {
        console.error("Registration failed:", result.error);
        toast.error(result.error || "Registrering misslyckades");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Ett fel uppstod vid registrering");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/reset-password");
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <Tabs defaultValue="login">
        <CardHeader>
          <CardTitle className="text-center">Skill Base UF</CardTitle>
          <CardDescription className="text-center">Logga in för att fortsätta</CardDescription>
          <TabsList className="grid w-full grid-cols-2 mt-2">
            <TabsTrigger value="login">Logga in</TabsTrigger>
            <TabsTrigger value="register">Registrera</TabsTrigger>
          </TabsList>
        </CardHeader>
        
        <CardContent>
          <TabsContent value="login">
            <form onSubmit={handleEmailLogin} className="space-y-4">
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
              
              <div className="space-y-2">
                <Label htmlFor="password">Lösenord</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="link" 
                  type="button"
                  className="p-0 h-auto text-sm"
                  onClick={handleForgotPassword}
                >
                  Glömt lösenord?
                </Button>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                <Mail className="mr-2 h-4 w-4" />
                {isLoading ? "Loggar in..." : "Logga in med E-post"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Företagsnamn</Label>
                <Input 
                  id="company" 
                  type="text" 
                  placeholder="Ditt företag AB" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-email">E-post</Label>
                <Input 
                  id="reg-email" 
                  type="email" 
                  placeholder="din@email.se" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-password">Lösenord</Label>
                <Input 
                  id="reg-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                <User className="mr-2 h-4 w-4" />
                {isLoading ? "Registrerar..." : "Registrera konto"}
              </Button>
            </form>
          </TabsContent>
        </CardContent>
        
        <CardFooter className="flex-col space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            Genom att logga in eller registrera dig godkänner du våra <Link to="/terms" className="underline">villkor</Link> och <Link to="/privacy" className="underline">integritetspolicy</Link>.
          </p>
        </CardFooter>
      </Tabs>
    </Card>
  );
};

export default LoginForm;

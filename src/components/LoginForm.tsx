
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, Mail, User } from "lucide-react";
import { authService } from "@/services/auth";
import { toast } from "sonner";

interface LoginFormProps {
  returnPath?: string;
}

const LoginForm = ({ returnPath = "/dashboard" }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const navigate = useNavigate();
  
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      console.log("Starting Google login process");
      const result = await authService.loginWithGoogle();
      
      if (!result.success) {
        toast.error(result.error || "Inloggning misslyckades");
        console.error("Google login failed:", result.error);
      } else {
        console.log("Google auth initiated successfully");
        // No navigation needed - Google OAuth will redirect
        toast.success("Redirecting to Google login...");
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("Ett fel uppstod vid inloggning");
    } finally {
      setIsLoading(false);
    }
  };
  
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
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                <Mail className="mr-2 h-4 w-4" />
                {isLoading ? "Loggar in..." : "Logga in med E-post"}
              </Button>
            </form>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Eller</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleGoogleLogin} 
              disabled={isLoading}
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {isLoading ? "Loggar in..." : "Logga in med Google"}
            </Button>
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
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Eller</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleGoogleLogin} 
              disabled={isLoading}
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {isLoading ? "Loggar in..." : "Fortsätt med Google"}
            </Button>
          </TabsContent>
        </CardContent>
        
        <CardFooter className="flex-col space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            Genom att logga in eller registrera dig godkänner du våra <a href="#" className="underline">villkor</a> och <a href="#" className="underline">integritetspolicy</a>.
          </p>
        </CardFooter>
      </Tabs>
    </Card>
  );
};

export default LoginForm;

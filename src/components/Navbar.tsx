
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import LoginButton from "./LoginButton";
import { LogOut, Menu, Settings, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authService } from "@/services/auth";
import { supabase } from "@/integrations/supabase/client";

// Helper function to clean up auth state
const cleanupAuthState = () => {
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-') || key === 'currentUser') {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  }
};

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      
      // Clean up auth state first to prevent issues
      cleanupAuthState();
      
      // Try to perform a global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (signOutError) {
        console.error("Error during Supabase signOut:", signOutError);
      }
      
      // Call our service logout method as a backup
      await authService.logout();
      
      toast.success("Du har loggat ut");
      
      // Force refresh for clean state
      window.location.href = "/";
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Det gick inte att logga ut");
      
      // Last resort - force reload the page
      window.location.reload();
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-primary">
            Skill Base UF
          </Link>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-primary">
              Hem
            </Link>
            <Link to="/jobs" className="text-foreground hover:text-primary">
              Hitta jobb
            </Link>
            <Link to="/pricing" className="text-foreground hover:text-primary">
              Priser
            </Link>
            
            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <Link to="/admin" className="text-foreground hover:text-primary flex items-center gap-1">
                    <Shield size={16} />
                    Admin
                  </Link>
                ) : (
                  <Link to="/dashboard" className="text-foreground hover:text-primary">
                    Dashboard
                  </Link>
                )}
                
                <Link to="/settings" className="text-foreground hover:text-primary flex items-center gap-1">
                  <Settings size={16} />
                  Inställningar
                </Link>
                
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2"
                >
                  <LogOut size={16} />
                  {isLoggingOut ? "Loggar ut..." : "Logga ut"}
                </Button>
                
                {user && (
                  <div className="ml-2 text-sm bg-primary/10 px-3 py-1 rounded-full">
                    {isAdmin ? "Admin" : user.companyName}
                  </div>
                )}
              </>
            ) : (
              <LoginButton />
            )}
          </nav>
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMenu}
            className="md:hidden"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
        
        {/* Mobile menu */}
        <div
          className={cn(
            "fixed inset-0 md:hidden bg-white pt-20 px-4 z-20 transform transition-transform duration-300 ease-in-out overflow-y-auto",
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <nav className="flex flex-col space-y-6 text-center pb-10">
            <Link 
              to="/" 
              className="text-xl font-medium py-2" 
              onClick={closeMenu}
            >
              Hem
            </Link>
            <Link 
              to="/jobs" 
              className="text-xl font-medium py-2" 
              onClick={closeMenu}
            >
              Hitta jobb
            </Link>
            <Link 
              to="/pricing" 
              className="text-xl font-medium py-2" 
              onClick={closeMenu}
            >
              Priser
            </Link>
            
            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <Link 
                    to="/admin" 
                    className="text-xl font-medium py-2 flex items-center justify-center gap-2" 
                    onClick={closeMenu}
                  >
                    <Shield size={18} />
                    Admin Dashboard
                  </Link>
                ) : (
                  <Link 
                    to="/dashboard" 
                    className="text-xl font-medium py-2" 
                    onClick={closeMenu}
                  >
                    Dashboard
                  </Link>
                )}
                
                <Link 
                  to="/settings" 
                  className="text-xl font-medium py-2 flex items-center justify-center gap-2" 
                  onClick={closeMenu}
                >
                  <Settings size={18} />
                  Inställningar
                </Link>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleLogout();
                    closeMenu();
                  }}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 justify-center w-full"
                >
                  <LogOut size={16} />
                  {isLoggingOut ? "Loggar ut..." : "Logga ut"}
                </Button>
                
                {user && (
                  <div className="text-sm bg-primary/10 px-3 py-2 rounded-full mt-4">
                    {isAdmin ? "Admin" : user.companyName}
                  </div>
                )}
              </>
            ) : (
              <div onClick={closeMenu} className="flex justify-center w-full">
                <LoginButton />
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

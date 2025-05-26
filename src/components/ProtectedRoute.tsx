
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button"; 
import { Loader2Icon, RefreshCw, AlertTriangle } from "lucide-react";

// Maintain a consistent list of admin emails across the app
const ADMIN_EMAILS = ['eric@foremp.se', 'kontakt@skillbaseuf.se'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const LoadingState = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, isLoading, user, isCompany, adminCheckComplete } = useAuth();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Add an explicit session check to verify Supabase authentication
  useEffect(() => {
    const verifySession = async () => {
      try {
        console.log("ProtectedRoute: Verifying session directly with Supabase");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("ProtectedRoute: Session verification error:", error);
          setAuthError("Session verification error");
          setSessionValid(false);
        } else {
          const hasValidSession = !!data.session;
          console.log("ProtectedRoute: Direct session check:", hasValidSession ? "Valid session" : "No session");
          setSessionValid(hasValidSession);
        }
      } catch (err) {
        console.error("ProtectedRoute: Exception during session verification:", err);
        setAuthError(`Session exception: ${err instanceof Error ? err.message : String(err)}`);
        setSessionValid(false);
      } finally {
        setSessionChecked(true);
      }
    };
    
    verifySession();
  }, [location.pathname]);

  // Use a timeout to prevent excessive loading state for quick auth checks
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(isLoading || !adminCheckComplete || !sessionChecked);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isLoading, adminCheckComplete, sessionChecked]);

  useEffect(() => {
    // Enhanced logging for debugging
    console.log("ProtectedRoute: Auth status -", { 
      isLoading, 
      isAuthenticated, 
      isAdmin,
      isCompany,
      adminCheckComplete,
      path: location.pathname,
      email: user?.email,
      isAdminEmail: user?.email ? ADMIN_EMAILS.includes(user.email) : false,
      role: user?.role,
      sessionChecked,
      sessionValid,
      authError
    });
    
    // Show a toast if we hit an auth error
    if (authError && !isLoading && adminCheckComplete) {
      toast.error(`Authentication error: ${authError}`);
    }
    
  }, [
    isLoading, 
    isAuthenticated, 
    isAdmin, 
    isCompany, 
    location.pathname, 
    user, 
    sessionChecked, 
    sessionValid, 
    adminCheckComplete, 
    authError
  ]);

  // Show loading state while checking authentication or admin status
  if (showLoading) {
    return <LoadingState />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !sessionValid) {
    // Store current path for redirect after login
    console.log("ProtectedRoute: Not authenticated, redirecting to auth page");
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Admin route check - only do this check when requireAdmin is true
  if (requireAdmin && !isAdmin && !(user?.email && ADMIN_EMAILS.includes(user.email))) {
    console.log("ProtectedRoute: Not admin, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Check for critical auth errors
  if (authError && !sessionValid) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col space-y-4 max-w-4xl mx-auto items-center text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
          <h2 className="text-xl font-semibold text-red-600">Authentication Error</h2>
          <p>There was a problem with your authentication session.</p>
          <p className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4 w-full max-w-lg text-left">
            <span className="font-medium block mb-2">Technical details:</span>
            {authError}
          </p>
          
          <div className="flex gap-4 mt-4">
            <Button 
              onClick={() => {
                // Force refresh session and retry
                supabase.auth.refreshSession().then(() => {
                  window.location.reload();
                });
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh session
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                // Clear everything and go to login
                localStorage.clear();
                window.location.href = '/auth';
              }}
              className="flex items-center gap-2"
            >
              <Loader2Icon size={16} />
              Login again
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Authenticated and authorized but missing user data - show an error
  if (!user || (!isAdmin && !isCompany && user.role !== 'company' && user.role !== 'admin')) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col space-y-4 max-w-4xl mx-auto items-center text-center">
          <h2 className="text-xl font-semibold">User role issue detected</h2>
          <p>User data: {user ? JSON.stringify({
            role: user.role,
            isCompany,
            isAdmin,
            email: user.email
          }) : "No user data"}</p>
          <div className="flex gap-4">
            <Button 
              onClick={() => window.location.reload()}
            >
              Refresh page
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // All checks passed - render the children
  return <>{children}</>;
};

export default ProtectedRoute;

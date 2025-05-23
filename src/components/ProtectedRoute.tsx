
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const { isAuthenticated, isAdmin, isLoading, user, isCompany } = useAuth();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  
  // Add an explicit session check to verify Supabase authentication
  useEffect(() => {
    const verifySession = async () => {
      try {
        console.log("ProtectedRoute: Verifying session directly with Supabase");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("ProtectedRoute: Session verification error:", error);
          setSessionValid(false);
        } else {
          const hasValidSession = !!data.session;
          console.log("ProtectedRoute: Direct session check:", hasValidSession ? "Valid session" : "No session");
          setSessionValid(hasValidSession);
        }
      } catch (err) {
        console.error("ProtectedRoute: Exception during session verification:", err);
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
      setShowLoading(isLoading);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    // Log auth status only when it changes or the path changes to prevent excessive logging
    if (process.env.NODE_ENV === 'development') {
      console.log("ProtectedRoute: Auth status -", { 
        isLoading, 
        isAuthenticated, 
        isAdmin,
        isCompany, // Add isCompany to logging
        path: location.pathname,
        email: user?.email,
        isAdminEmail: user?.email ? ADMIN_EMAILS.includes(user.email) : false,
        role: user?.role,
        sessionChecked,
        sessionValid
      });
    }
  }, [isLoading, isAuthenticated, isAdmin, isCompany, location.pathname, user, sessionChecked, sessionValid]);

  // Show loading state while checking authentication
  if (showLoading || !sessionChecked) {
    return <LoadingState />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !sessionValid) {
    // Store current path for redirect after login
    console.log("ProtectedRoute: Not authenticated, redirecting to auth page");
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Admin route check
  if (requireAdmin && !isAdmin && !(user?.email && ADMIN_EMAILS.includes(user.email))) {
    console.log("ProtectedRoute: Not admin, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Authenticated and authorized - render the children
  console.log("ProtectedRoute: Authenticated and authorized, rendering children", { 
    isCompany, 
    role: user?.role 
  });
  return <>{children}</>;
};

export default ProtectedRoute;


import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
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
  const { isAuthenticated, isAdmin, isLoading, user } = useAuth();
  const location = useLocation();

  // Perform session check only once per component mount rather than on every render
  useEffect(() => {
    let isMounted = true;
    
    const verifySession = async () => {
      // Only verify if we believe we're authenticated to avoid unnecessary checks
      if (!isAuthenticated || isLoading) return;
      
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          console.error("Session verification failed:", error);
        } else {
          console.log("Session verified successfully");
        }
      } catch (err) {
        // Only log error if component is still mounted
        if (isMounted) {
          console.error("Error verifying session:", err);
        }
      }
    };
    
    verifySession();
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    console.log("ProtectedRoute: Auth status -", { 
      isLoading, 
      isAuthenticated, 
      isAdmin, 
      path: location.pathname,
      email: user?.email,
      isAdminEmail: user?.email ? ADMIN_EMAILS.includes(user.email) : false,
      role: user?.role
    });
  }, [isLoading, isAuthenticated, isAdmin, location.pathname, user]);

  // Show loading state while checking authentication
  if (isLoading) {
    console.log("ProtectedRoute: Still loading auth status");
    return <LoadingState />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log("ProtectedRoute: User not authenticated, redirecting to auth page");
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Admin route check - simplified to check email directly as well
  if (requireAdmin && !isAdmin && !(user?.email && ADMIN_EMAILS.includes(user.email))) {
    console.log("ProtectedRoute: User not admin, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Authenticated and authorized
  console.log("ProtectedRoute: User authenticated and authorized, rendering children");
  return <>{children}</>;
};

export default ProtectedRoute;

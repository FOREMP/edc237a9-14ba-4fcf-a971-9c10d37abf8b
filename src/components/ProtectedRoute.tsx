
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

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

  useEffect(() => {
    // Log auth status only when it changes or the path changes to prevent excessive logging
    if (process.env.NODE_ENV === 'development') {
      console.log("ProtectedRoute: Auth status -", { 
        isLoading, 
        isAuthenticated, 
        isAdmin, 
        path: location.pathname,
        email: user?.email,
        isAdminEmail: user?.email ? ADMIN_EMAILS.includes(user.email) : false,
        role: user?.role
      });
    }
  }, [isLoading, isAuthenticated, isAdmin, location.pathname, user]);

  // Show loading state while checking authentication, but with a timeout
  // This prevents excessive loading states for quick auth checks
  if (isLoading) {
    return <LoadingState />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    // Store current path for redirect after login
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Admin route check
  if (requireAdmin && !isAdmin && !(user?.email && ADMIN_EMAILS.includes(user.email))) {
    return <Navigate to="/dashboard" replace />;
  }

  // Authenticated and authorized - render the children
  return <>{children}</>;
};

export default ProtectedRoute;

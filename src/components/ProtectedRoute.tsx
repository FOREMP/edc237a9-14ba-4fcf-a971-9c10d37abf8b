
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdminEmail } from "@/utils/adminEmails";

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

  console.log("ProtectedRoute: Auth status -", { 
    isLoading, 
    isAuthenticated, 
    isAdmin,
    path: location.pathname,
    email: user?.email,
    role: user?.role
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return <LoadingState />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log("ProtectedRoute: Not authenticated, redirecting to auth page");
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Admin route check
  if (requireAdmin) {
    const hasAdminAccess = isAdmin || (user?.email && isAdminEmail(user.email));
    
    if (!hasAdminAccess) {
      console.log("ProtectedRoute: Not admin, redirecting to dashboard");
      return <Navigate to="/dashboard" replace />;
    }
  }

  // All checks passed - render the children
  return <>{children}</>;
};

export default ProtectedRoute;

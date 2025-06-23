
import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import LoginForm from "@/components/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const Auth = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  
  // Get the return path from location state, or default to dashboard
  const from = location.state?.from || "/dashboard";
  
  // Single effect to handle initial setup and auth state changes
  useEffect(() => {
    // Check for auth errors in URL
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      console.error("Auth error:", error, errorDescription);
      toast.error(errorDescription || "Authentication error");
    }
    
    // Mark initial check as done
    if (!initialCheckDone && !isLoading) {
      setInitialCheckDone(true);
    }
    
    // Redirect if authenticated - only after initial check is done
    if (initialCheckDone && !isLoading && isAuthenticated && user) {
      console.log("User is authenticated, redirecting to", from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from, searchParams, initialCheckDone, user]);
  
  // Show loading state
  if (isLoading || !initialCheckDone) {
    return (
      <Layout>
        <div className="py-20">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-64 w-full max-w-md mx-auto rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-center mb-8 text-black">Logga in för att fortsätta</h1>
        <LoginForm returnPath={from} />
      </div>
    </Layout>
  );
};

export default Auth;

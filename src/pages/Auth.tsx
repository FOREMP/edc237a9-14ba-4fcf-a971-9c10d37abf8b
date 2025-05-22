
import { useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import LoginForm from "@/components/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const Auth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get the return path from location state, or default to dashboard
  const from = location.state?.from || "/dashboard";
  
  useEffect(() => {
    console.log("Auth page loaded, checking auth state");
    console.log("Redirect destination:", from);
    
    // Check for auth errors in URL
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      console.error("Auth error:", error, errorDescription);
      toast.error(errorDescription || "Authentication error");
    }
    
    // Check for auth code in URL (for OAuth providers)
    const hasAuthParams = searchParams.has('code') || searchParams.has('provider');
    
    if (hasAuthParams) {
      console.log("Auth params found in URL, handling OAuth redirect");
      // Let Supabase handle the OAuth redirect
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error("Error getting session from URL params:", error);
          toast.error("Failed to complete authentication");
        } else if (data?.session) {
          console.log("Successfully authenticated from redirect");
          toast.success("Inloggning lyckades!");
          // Use a short timeout to ensure state is properly updated
          setTimeout(() => {
            navigate(from, { replace: true });
          }, 100);
        }
      });
    }
    
    // Redirect to return path if already authenticated
    if (!isLoading && isAuthenticated) {
      console.log("User is authenticated, redirecting to", from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from, searchParams]);
  
  if (isLoading) {
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


import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import LoginForm from "@/components/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const Auth = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  
  // Get the return path from location state, or default to dashboard
  const from = location.state?.from || "/dashboard";
  
  // Single session check on mount - no reloads
  useEffect(() => {
    if (hasCheckedSession) return;
    
    const checkSession = async () => {
      try {
        console.log("Auth page: Performing initial session check");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth page: Session check error:", error);
        } else if (data?.session) {
          console.log("Auth page: Valid session found, user will be redirected");
          // Don't reload - let the auth hook handle the redirect
        } else {
          console.log("Auth page: No session found");
        }
      } catch (err) {
        console.error("Auth page: Exception during session check:", err);
      } finally {
        setInitialCheckDone(true);
        setHasCheckedSession(true);
      }
    };
    
    checkSession();
  }, [hasCheckedSession]);
  
  useEffect(() => {
    console.log("Auth page state:", { 
      isAuthenticated, 
      isLoading, 
      from, 
      initialCheckDone,
      user: user ? { email: user.email, role: user.role } : null
    });
    
    // Check for auth errors in URL
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      console.error("Auth error:", error, errorDescription);
      toast.error(errorDescription || "Authentication error");
    }
    
    // Check for auth code in URL (for OAuth providers)
    const hasAuthParams = searchParams.has('code') || searchParams.has('provider');
    
    if (hasAuthParams && initialCheckDone) {
      console.log("Auth params found in URL, handling OAuth redirect");
      // Let Supabase handle the OAuth redirect
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error("Error getting session from URL params:", error);
          toast.error("Failed to complete authentication");
        } else if (data?.session) {
          console.log("Successfully authenticated from redirect");
          toast.success("Inloggning lyckades!");
          // Navigate without reload
          navigate(from, { replace: true });
        }
      });
    }
    
    // Redirect to return path if already authenticated - but only after initial check
    if (initialCheckDone && !isLoading && isAuthenticated && user) {
      console.log("User is authenticated, redirecting to", from, "with role", user.role);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from, searchParams, initialCheckDone, user]);
  
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

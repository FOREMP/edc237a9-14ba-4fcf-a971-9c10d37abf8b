
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase, diagCompanyAccess } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button"; 
import { Loader2Icon, RefreshCw, AlertTriangle, Database } from "lucide-react";

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
  const [profileAccess, setProfileAccess] = useState<boolean | null>(null);
  const [runningDiagnosis, setRunningDiagnosis] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  
  // Run diagnostics function for troubleshooting
  const runDiagnostics = async () => {
    setRunningDiagnosis(true);
    try {
      const result = await diagCompanyAccess();
      setDiagnosisResult(result);
      console.log("Route diagnosis result:", result);
      
      if (result.error) {
        toast.error(`Diagnosis found an error: ${result.error}`);
      } else {
        toast.success("Diagnosis completed");
      }
    } catch (error) {
      console.error("Error running diagnostics:", error);
      setDiagnosisResult({ error: String(error) });
    } finally {
      setRunningDiagnosis(false);
    }
  };
  
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

          // If we have a valid session, try to access the user's profile to test RLS
          if (hasValidSession && data.session?.user?.id) {
            try {
              console.log("Testing profile access for RLS verification");
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, email, role')
                .eq('id', data.session.user.id)
                .single();
              
              if (profileError) {
                console.error("RLS PERMISSION ERROR: Cannot access profile data:", profileError);
                setProfileAccess(false);
                setAuthError(`RLS permission denied: ${profileError.message}`);
                
                // Also test for preferences access
                const { error: prefError } = await supabase
                  .from('user_preferences')
                  .select('id')
                  .eq('user_id', data.session.user.id)
                  .maybeSingle();
                
                if (prefError) {
                  console.error("RLS PERMISSION ERROR: Cannot access preferences:", prefError);
                }
                
                // For company users, also try jobs access which is critical
                if (profileData?.role === 'company') {
                  const { error: jobsError } = await supabase
                    .from('jobs')
                    .select('id')
                    .eq('company_id', data.session.user.id)
                    .limit(1);
                    
                  if (jobsError) {
                    console.error("RLS PERMISSION ERROR: Cannot access jobs:", jobsError);
                  }
                }
              } else {
                console.log("Profile access successful via RLS:", profileData);
                setProfileAccess(true);
              }
            } catch (profileErr) {
              console.error("Error testing profile access:", profileErr);
            }
          }
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
      setShowLoading(isLoading || !adminCheckComplete);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isLoading, adminCheckComplete]);

  useEffect(() => {
    // Enhanced logging for debugging company user access issues
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
      profileAccess,
      authError
    });
    
    // Show a toast if we hit an auth error
    if (authError && !isLoading && adminCheckComplete) {
      toast.error(`Authentication error: ${authError}`);
    }

    // Debug RLS issues specifically for company users
    if (isCompany && sessionValid && !profileAccess && !isLoading) {
      console.error("CRITICAL RLS ERROR: Company user cannot access their profile data");
      toast.error("Permission error: Cannot access your profile data");
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
    profileAccess, 
    adminCheckComplete, 
    authError
  ]);

  // Show loading state while checking authentication or admin status
  if (showLoading || !sessionChecked || !adminCheckComplete) {
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

  // Check for RLS permission failures for company users
  if (isCompany && !profileAccess && sessionValid) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col space-y-4 max-w-4xl mx-auto items-center text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
          <h2 className="text-xl font-semibold text-red-600">Database Permission Error</h2>
          <p>Your account doesn't have permission to access required data.</p>
          <p className="text-sm text-muted-foreground">
            This is likely a Row Level Security (RLS) policy issue in the database.
          </p>
          <p className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4 w-full max-w-lg text-left">
            <span className="font-medium block mb-2">Technical details:</span>
            {authError || "Cannot access profile data due to RLS policy restrictions"}
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
              onClick={runDiagnostics}
              disabled={runningDiagnosis}
              className="flex items-center gap-2"
            >
              {runningDiagnosis ? (
                <Loader2Icon size={16} className="animate-spin" />
              ) : (
                <Database size={16} />
              )}
              Run Diagnostics
            </Button>
          </div>
          
          {diagnosisResult && (
            <div className="mt-8 border border-slate-200 rounded-lg p-4 w-full max-w-2xl bg-slate-50">
              <h3 className="text-left font-medium mb-2">Diagnosis Results</h3>
              <pre className="text-left text-xs whitespace-pre-wrap overflow-auto p-2 bg-slate-100 rounded max-h-96">
                {JSON.stringify(diagnosisResult, null, 2)}
              </pre>
            </div>
          )}
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
            
            <Button 
              variant="outline"
              onClick={runDiagnostics}
              disabled={runningDiagnosis}
              className="flex items-center gap-2"
            >
              {runningDiagnosis ? (
                <Loader2Icon size={16} className="animate-spin" />
              ) : (
                <Database size={16} />
              )}
              Run Diagnostics
            </Button>
          </div>
          
          {diagnosisResult && (
            <div className="mt-8 border border-slate-200 rounded-lg p-4 w-full max-w-2xl bg-slate-50">
              <h3 className="text-left font-medium mb-2">Diagnosis Results</h3>
              <pre className="text-left text-xs whitespace-pre-wrap overflow-auto p-2 bg-slate-100 rounded max-h-96">
                {JSON.stringify(diagnosisResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // All checks passed - render the children
  return <>{children}</>;
};

export default ProtectedRoute;

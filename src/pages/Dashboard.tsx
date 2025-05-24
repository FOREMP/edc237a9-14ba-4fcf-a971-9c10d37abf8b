
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Loader2Icon, AlertTriangle, Bug, Database, RefreshCw } from "lucide-react";
import { supabase, diagCompanyAccess } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { isAuthenticated, isLoading: authLoading, isAdmin, user, isCompany, adminCheckComplete } = useRequireAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [sessionInfo, setSessionInfo] = useState<any>({});
  const [isDebugging, setIsDebugging] = useState(false);
  const navigate = useNavigate();

  // Debug session and authentication state
  const runSessionCheck = async () => {
    setIsDebugging(true);
    try {
      console.log("=== SESSION DEBUG START ===");
      
      // Check current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log("Session check result:", { sessionData, sessionError });
      
      // Check current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log("User check result:", { userData, userError });
      
      // Test basic query
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData?.user?.id)
          .single();
        console.log("Profile query result:", { profileData, profileError });
      } catch (profileErr) {
        console.error("Profile query exception:", profileErr);
      }
      
      // Test jobs query
      try {
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('company_id', userData?.user?.id)
          .limit(5);
        console.log("Jobs query result:", { jobsData, jobsError });
      } catch (jobsErr) {
        console.error("Jobs query exception:", jobsErr);
      }
      
      setSessionInfo({
        session: sessionData?.session ? 'Valid' : 'Invalid',
        user: userData?.user ? userData.user.email : 'No user',
        userId: userData?.user?.id || 'No ID',
        sessionError: sessionError?.message || 'None',
        userError: userError?.message || 'None'
      });
      
      setDebugInfo({
        isAuthenticated,
        isAdmin,
        isCompany,
        adminCheckComplete,
        authLoading,
        userRole: user?.role,
        userEmail: user?.email
      });
      
      console.log("=== SESSION DEBUG END ===");
    } catch (error) {
      console.error("Session debug error:", error);
    } finally {
      setIsDebugging(false);
    }
  };

  // Run session check on mount
  useEffect(() => {
    runSessionCheck();
  }, []);

  // Log authentication state changes
  useEffect(() => {
    console.log("Dashboard auth state changed:", {
      isAuthenticated,
      isAdmin,
      isCompany,
      adminCheckComplete,
      authLoading,
      userRole: user?.role,
      userEmail: user?.email
    });
  }, [isAuthenticated, isAdmin, isCompany, adminCheckComplete, authLoading, user]);

  // Redirect admin to admin dashboard
  useEffect(() => {
    if (adminCheckComplete && !authLoading && isAdmin && user?.role === 'admin') {
      console.log("Redirecting admin to admin dashboard");
      navigate("/admin");
    }
  }, [isAdmin, authLoading, navigate, user, adminCheckComplete]);

  // Show loading spinner while auth state is initializing
  if (authLoading || !adminCheckComplete) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh] flex-col">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Laddar användarinformation...</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Auth Loading: {authLoading.toString()}</p>
            <p>Admin Check Complete: {adminCheckComplete.toString()}</p>
            <p>Is Authenticated: {isAuthenticated.toString()}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Åtkomst nekad</h2>
            <p className="mb-4">Du måste vara inloggad för att visa denna sida.</p>
            <Button onClick={() => navigate("/auth")}>
              Gå till inloggning
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Company user dashboard - simplified version for debugging
  if (isCompany || (!isAdmin && user?.role === 'company')) {
    console.log("Rendering company dashboard for user:", user?.email);
    
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-medium text-green-800 mb-2">✅ Dashboard mounted successfully!</h2>
              <p className="text-green-700">You are authenticated as a company user.</p>
            </div>
          </div>

          {/* Debug Information */}
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg flex items-center">
                <Bug className="mr-2 text-slate-500" size={20} />
                Debug Information
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={runSessionCheck}
                disabled={isDebugging}
              >
                {isDebugging ? <Loader2Icon size={16} className="animate-spin mr-1" /> : <RefreshCw size={16} className="mr-1" />}
                Refresh Debug Info
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Authentication State:</h4>
                <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Session Information:</h4>
                <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(sessionInfo, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* User Information */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-lg mb-2">User Information</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
              <p><strong>Role:</strong> {user?.role || 'Not available'}</p>
              <p><strong>User ID:</strong> {user?.id || 'Not available'}</p>
              <p><strong>Is Company:</strong> {isCompany ? 'Yes' : 'No'}</p>
              <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex space-x-4">
            <Button onClick={() => navigate("/")}>
              Hem
            </Button>
            <Button onClick={() => navigate("/jobs")}>
              Jobb
            </Button>
            <Button onClick={() => navigate("/statistics")}>
              Statistik
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                supabase.auth.signOut();
                navigate("/auth");
              }}
            >
              Logga ut
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Fallback for users without proper role assignment
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Välkommen!</h2>
          <p className="mb-4">Din användarroll är inte konfigurerad. Kontakta administratören.</p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
            <p>Debug info: Authenticated but role detection failed.</p>
            <div className="text-sm mt-2 text-left">
              <pre>{JSON.stringify({
                email: user?.email,
                role: user?.role,
                isCompany,
                isAdmin,
                adminCheckComplete,
                authLoading
              }, null, 2)}</pre>
            </div>
          </div>
          <Button 
            className="mt-4"
            onClick={runSessionCheck}
            disabled={isDebugging}
          >
            {isDebugging ? <Loader2Icon size={16} className="animate-spin mr-1" /> : null}
            Run Debug Check
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

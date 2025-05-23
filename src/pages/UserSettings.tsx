
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import CompanyProfile from "@/components/CompanyProfile";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CancelSubscription from "@/components/CancelSubscription";
import { Loader2Icon, AlertTriangle, RefreshCw, Database, Bug } from "lucide-react";
import { supabase, diagCompanyAccess } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const UserSettings = () => {
  const { isLoading, isAuthenticated, user, isCompany, adminCheckComplete } = useRequireAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasVerifiedProfile, setHasVerifiedProfile] = useState<boolean>(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [runningDiagnosis, setRunningDiagnosis] = useState(false);
  const [debugMode, setDebugMode] = useState(true); // Enable debug mode by default for troubleshooting
  
  // Run diagnostics function for troubleshooting
  const runDiagnostics = async () => {
    setRunningDiagnosis(true);
    try {
      const result = await diagCompanyAccess();
      setDiagnosisResult(result);
      console.log("Settings diagnosis result:", result);
      
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
  
  // Explicitly check profile access
  useEffect(() => {
    const checkProfileAccess = async () => {
      if (!isAuthenticated || !user?.id || isLoading || !adminCheckComplete) return;
      
      try {
        console.log("UserSettings: Verifying profile access for user", user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("UserSettings: Profile access error:", error);
          setLoadError(`Kunde inte hämta din profil: ${error.message}`);
          return;
        }
        
        if (!data) {
          console.error("UserSettings: No profile data returned");
          setLoadError("Ingen profildata hittades.");
          return;
        }
        
        console.log("UserSettings: Profile access verified", data);
        setHasVerifiedProfile(true);
        
        // Also check for preferences access
        const { error: prefError } = await supabase
          .from('user_preferences')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (prefError) {
          console.error("RLS ERROR: Cannot access preferences:", prefError);
          setLoadError(prev => prev ? `${prev}\nKunde inte hämta användarpreferenser: ${prefError.message}` : `Kunde inte hämta användarpreferenser: ${prefError.message}`);
        }
        
      } catch (err) {
        console.error("UserSettings: Exception during profile check:", err);
        setLoadError(`Ett fel uppstod: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    checkProfileAccess();
  }, [isAuthenticated, user?.id, isLoading, adminCheckComplete]);
  
  // Show loading state while auth is initializing
  if (isLoading || !adminCheckComplete) {
    return (
      <Layout>
        <div className="py-20 flex justify-center items-center flex-col">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Laddar användarinställningar...</p>
        </div>
      </Layout>
    );
  }
  
  // Show error state if there's an auth error
  if (!isAuthenticated || !user) {
    return (
      <Layout>
        <div className="py-20 flex justify-center items-center flex-col">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-4" />
          <p className="text-lg font-medium mb-2">Åtkomst nekad</p>
          <p className="text-muted-foreground">Du måste vara inloggad för att se den här sidan.</p>
        </div>
      </Layout>
    );
  }

  // If we have a specific loading error
  if (loadError) {
    return (
      <Layout>
        <div className="py-20 flex justify-center items-center flex-col">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-4" />
          <p className="text-lg font-medium mb-2">Ett fel uppstod</p>
          <p className="text-muted-foreground whitespace-pre-line">{loadError}</p>
          <div className="flex gap-4 mt-4">
            <Button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Försök igen
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
          
          <div className="mt-8 p-4 bg-muted rounded-lg max-w-lg w-full">
            <h3 className="font-medium mb-2">Debug Information</h3>
            <pre className="text-xs overflow-auto p-2 bg-slate-100 rounded">
              {JSON.stringify({
                userId: user.id,
                email: user.email,
                role: user.role,
                isCompany,
                adminCheckComplete,
                hasProfile: hasVerifiedProfile
              }, null, 2)}
            </pre>
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
      </Layout>
    );
  }

  // Check if profile verification has completed for company users
  if (isCompany && !hasVerifiedProfile) {
    return (
      <Layout>
        <div className="py-20 flex justify-center items-center flex-col">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Verifierar profilåtkomst...</p>
        </div>
      </Layout>
    );
  }
  
  // Render the settings UI for authenticated users
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-8 text-center">Användarinställningar</h1>
        
        {/* Debug Tools */}
        {debugMode && (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-lg flex items-center">
                <Bug className="mr-2 text-slate-500" size={20} />
                Debug Tools
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setDebugMode(false)}
              >
                Hide
              </Button>
            </div>
            <div className="flex space-x-2 mb-4">
              <Button 
                variant="outline" 
                size="sm"
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  localStorage.removeItem('sb-zgcsgwlggvjvvshhhcmb-auth-token');
                  window.location.reload();
                }}
              >
                Clear Auth Cache
              </Button>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">User Info:</h4>
              <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify({
                  userId: user.id,
                  email: user.email,
                  role: user.role,
                  isCompany,
                  hasVerifiedProfile
                }, null, 2)}
              </pre>
            </div>
            
            {diagnosisResult && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-1">Diagnosis Results:</h4>
                <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-96">
                  {JSON.stringify(diagnosisResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
        
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="w-full mb-8">
              <TabsTrigger value="company" className="flex-1">Företagsinformation</TabsTrigger>
              <TabsTrigger value="account" className="flex-1">Kontouppgifter</TabsTrigger>
              <TabsTrigger value="subscription" className="flex-1">Avsluta paket</TabsTrigger>
            </TabsList>
            <TabsContent value="company">
              <CompanyProfile />
            </TabsContent>
            <TabsContent value="account">
              <ChangePasswordForm />
            </TabsContent>
            <TabsContent value="subscription">
              <CancelSubscription />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Toggle Debug Mode */}
        {!debugMode && (
          <div className="text-center mt-16 text-sm text-slate-400">
            <button 
              onClick={() => setDebugMode(true)}
              className="inline-flex items-center hover:text-slate-600 transition-colors"
            >
              <Bug size={16} className="mr-1" />
              Show Debug Mode
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserSettings;

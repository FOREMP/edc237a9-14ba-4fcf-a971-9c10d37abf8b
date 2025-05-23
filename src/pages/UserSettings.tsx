
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import CompanyProfile from "@/components/CompanyProfile";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CancelSubscription from "@/components/CancelSubscription";
import { Loader2Icon, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UserSettings = () => {
  const { isLoading, isAuthenticated, user, isCompany, adminCheckComplete } = useRequireAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasVerifiedProfile, setHasVerifiedProfile] = useState<boolean>(false);
  
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
          <p className="text-muted-foreground">{loadError}</p>
          <button 
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
            Försök igen
          </button>
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
      </div>
    </Layout>
  );
};

export default UserSettings;

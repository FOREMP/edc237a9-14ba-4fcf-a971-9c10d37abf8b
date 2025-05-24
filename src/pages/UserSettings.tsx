
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import CompanyProfile from "@/components/CompanyProfile";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CancelSubscription from "@/components/CancelSubscription";
import { Loader2Icon, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Försök igen
          </button>
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

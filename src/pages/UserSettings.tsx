
import { useState } from "react";
import Layout from "@/components/Layout";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import CompanyProfile from "@/components/CompanyProfile";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CancelSubscription from "@/components/CancelSubscription";
import { Loader2Icon, AlertTriangle } from "lucide-react";

const UserSettings = () => {
  const { isLoading, isAuthenticated, user } = useRequireAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Show loading state while auth is initializing
  if (isLoading) {
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
            className="mt-4 text-primary hover:underline" 
            onClick={() => window.location.reload()}
          >
            Försök igen
          </button>
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

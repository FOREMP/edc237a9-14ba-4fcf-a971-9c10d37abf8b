
import Layout from "@/components/Layout";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import CompanyProfile from "@/components/CompanyProfile";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CancelSubscription from "@/components/CancelSubscription";

const UserSettings = () => {
  const { isLoading } = useRequireAuth();
  
  if (isLoading) {
    return (
      <Layout>
        <div className="py-20 text-center">
          <p>Laddar...</p>
        </div>
      </Layout>
    );
  }
  
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


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { Loader2Icon } from "lucide-react";
import SubscriptionStatusCard from "@/components/dashboard/SubscriptionStatusCard";
import JobList from "@/components/dashboard/JobList";
import { useDashboardJobs } from "@/hooks/useDashboardJobs";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { isAuthenticated, isLoading: authLoading, isAdmin, user, isCompany, adminCheckComplete } = useRequireAuth();
  const { 
    tier, 
    isActive, 
    loading: planLoading, 
    refreshPlan,
    canCreateJob,
    getUpgradeMessage
  } = useSubscriptionPlan();
  const [hasRendered, setHasRendered] = useState(false);
  const navigate = useNavigate();

  const {
    jobs,
    isLoading: jobsLoading,
    activeTab,
    setActiveTab,
    handleEdit,
    handleDelete,
    handleCreateJob,
    isCreating
  } = useDashboardJobs();

  // Track rendering to prevent infinite loops
  useEffect(() => {
    setHasRendered(true);
  }, []);

  // Redirect admin to admin dashboard
  useEffect(() => {
    if (hasRendered && adminCheckComplete && !authLoading && isAdmin && user?.role === 'admin') {
      navigate("/admin", { replace: true });
    }
  }, [isAdmin, authLoading, navigate, user, adminCheckComplete, hasRendered]);

  // Show loading spinner while auth or plan state is initializing
  if (authLoading || !adminCheckComplete || !hasRendered || planLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
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

  // Company user dashboard
  if (isCompany || (!isAdmin && user?.role === 'company')) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
          </div>

          {/* Subscription Status */}
          <SubscriptionStatusCard 
            features={{
              monthlyPostLimit: tier === 'premium' ? 999 : tier === 'standard' ? 15 : tier === 'basic' ? 5 : 1,
              monthlyPostsUsed: jobs.filter(job => 
                new Date(job.createdAt).getMonth() === new Date().getMonth() &&
                new Date(job.createdAt).getFullYear() === new Date().getFullYear()
              ).length,
              hasBasicStats: tier !== 'free',
              hasJobViewStats: tier === 'standard' || tier === 'premium',
              hasAdvancedStats: tier === 'premium',
              canBoostPosts: tier === 'premium',
              hasPrioritySupport: tier === 'premium',
              isActive,
              tier,
              planName: tier,
              status: isActive ? 'active' : 'inactive',
              expiresAt: null
            }}
            remainingJobs={null}
            refreshSubscription={() => refreshPlan(true)}
          />

          {/* Feature Gates */}
          {tier === 'free' && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-2">Begränsad åtkomst</h3>
              <p className="text-amber-700 mb-3">
                Du har för närvarande ett gratis konto. Uppgradera för att få tillgång till jobbpublicering och fler funktioner.
              </p>
              <Button onClick={() => navigate('/pricing')}>
                Uppgradera nu
              </Button>
            </div>
          )}

          {/* Job Management - Only for Standard and Premium */}
          {(tier === 'standard' || tier === 'premium') && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Mina jobbannonser</h2>
                {canCreateJob() ? (
                  <Button onClick={() => handleCreateJob} disabled={isCreating}>
                    {isCreating ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : null}
                    Skapa ny jobbannons
                  </Button>
                ) : (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-2">
                      Du har nått din månadsgräns för jobbannonser
                    </p>
                    <Button onClick={() => navigate('/pricing')} variant="outline">
                      Uppgradera plan
                    </Button>
                  </div>
                )}
              </div>

              <JobList
                jobs={jobs}
                isLoading={jobsLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCreateClick={() => handleCreateJob}
                tabValue={activeTab}
              />
            </div>
          )}

          {/* Basic users see job browsing only */}
          {tier === 'basic' && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Utforska lediga jobb</h2>
              <p className="text-muted-foreground mb-6">
                Med din Basic-plan kan du söka och ansöka om jobb. Uppgradera till Standard för att publicera egna jobbannonser.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/jobs')}>
                  Bläddra bland jobb
                </Button>
                <Button onClick={() => navigate('/pricing')} variant="outline">
                  Uppgradera plan
                </Button>
              </div>
            </div>
          )}

          {/* Upgrade message for limited plans */}
          {getUpgradeMessage() && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">{getUpgradeMessage()}</p>
              <Button onClick={() => navigate('/pricing')} className="mt-2" size="sm">
                Uppgradera nu
              </Button>
            </div>
          )}
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
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

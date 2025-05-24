
import { useSubscriptionFeatures, SubscriptionTier } from './useSubscriptionFeatures';

export interface PlanFeatures {
  tier: SubscriptionTier;
  planName: string;
  status: string;
  isActive: boolean;
  isPremium: boolean;
  isStandard: boolean;
  isBasic: boolean;
  isFree: boolean;
  isSingle: boolean;
  monthlyPostLimit: number;
  monthlyPostsUsed: number;
  remainingPosts: number;
  hasUnlimitedPosts: boolean;
  canAccessStatistics: boolean;
  canAccessAdvancedStatistics: boolean;
  canBoostPosts: boolean;
  hasPrioritySupport: boolean;
  canViewJobs: boolean;
  canApplyToJobs: boolean;
  canPostJobs: boolean;
  canViewApplicants: boolean;
  canFilterApplicants: boolean;
  canContactApplicants: boolean;
  hasPriorityListing: boolean;
  expiresAt: Date | null;
}

export const useSubscriptionPlan = () => {
  const { features, loading, dataFetchError, refreshSubscription, syncWithStripe } = useSubscriptionFeatures();

  const planFeatures: PlanFeatures = {
    tier: features.tier,
    planName: features.planName,
    status: features.status,
    isActive: features.isActive,
    isPremium: features.tier === 'premium',
    isStandard: features.tier === 'standard',
    isBasic: features.tier === 'basic',
    isFree: features.tier === 'free',
    isSingle: features.tier === 'single',
    monthlyPostLimit: features.monthlyPostLimit,
    monthlyPostsUsed: features.monthlyPostsUsed,
    remainingPosts: Math.max(0, features.monthlyPostLimit - features.monthlyPostsUsed),
    hasUnlimitedPosts: features.tier === 'premium',
    canAccessStatistics: features.hasJobViewStats || features.hasAdvancedStats,
    canAccessAdvancedStatistics: features.hasAdvancedStats,
    canBoostPosts: features.canBoostPosts,
    hasPrioritySupport: features.hasPrioritySupport,
    
    // Feature gating based on subscription tier
    canViewJobs: true, // All users can view jobs
    canApplyToJobs: true, // All users can apply to jobs
    canPostJobs: features.tier === 'basic' || features.tier === 'standard' || features.tier === 'premium' || features.tier === 'single',
    canViewApplicants: features.tier === 'standard' || features.tier === 'premium',
    canFilterApplicants: features.tier === 'premium',
    canContactApplicants: features.tier === 'standard' || features.tier === 'premium',
    hasPriorityListing: features.tier === 'premium',
    
    expiresAt: features.expiresAt
  };

  const canCreateJob = () => {
    if (!planFeatures.canPostJobs) return false;
    if (planFeatures.hasUnlimitedPosts) return true;
    return planFeatures.remainingPosts > 0;
  };

  const getUpgradeMessage = () => {
    if (planFeatures.isFree) {
      return "Uppgradera till Basic för att publicera jobbannonser (5 per månad)";
    }
    if (planFeatures.isBasic && planFeatures.remainingPosts === 0) {
      return "Uppgradera till Standard för fler jobbannonser (15 per månad) och se visningsstatistik";
    }
    if (planFeatures.isStandard && planFeatures.remainingPosts === 0) {
      return "Uppgradera till Premium för obegränsade jobbannonser och avancerade funktioner";
    }
    return null;
  };

  const refreshPlan = (forceRefresh = false) => {
    if (forceRefresh) {
      syncWithStripe(true).then(() => {
        refreshSubscription(true);
      }).catch(() => {
        refreshSubscription(true);
      });
    } else {
      refreshSubscription();
    }
  };

  const getPlanDisplayName = () => {
    switch (planFeatures.tier) {
      case 'basic': return 'Basic';
      case 'standard': return 'Standard';
      case 'premium': return 'Premium';
      case 'single': return 'Enstaka annons';
      default: return 'Gratis';
    }
  };

  const getPlanBadgeColor = () => {
    switch (planFeatures.tier) {
      case 'basic': return 'bg-green-500 hover:bg-green-600';
      case 'standard': return 'bg-blue-500 hover:bg-blue-600';
      case 'premium': return 'bg-purple-500 hover:bg-purple-600';
      case 'single': return 'bg-orange-500 hover:bg-orange-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return {
    ...planFeatures,
    loading,
    error: dataFetchError,
    refreshPlan,
    syncWithStripe,
    canCreateJob,
    getUpgradeMessage,
    getPlanDisplayName,
    getPlanBadgeColor
  };
};

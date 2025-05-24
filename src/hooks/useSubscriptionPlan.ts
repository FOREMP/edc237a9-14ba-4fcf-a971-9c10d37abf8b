
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
  expiresAt: Date | null;
}

export const useSubscriptionPlan = () => {
  const { features, loading, dataFetchError, refreshSubscription, syncWithStripe } = useSubscriptionFeatures();

  console.log("useSubscriptionPlan: Current features:", features);

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
    expiresAt: features.expiresAt
  };

  const canCreateJob = () => {
    if (planFeatures.hasUnlimitedPosts) return true;
    return planFeatures.remainingPosts > 0;
  };

  const getUpgradeMessage = () => {
    if (planFeatures.isFree) {
      return "Upgrade to Basic for 5 posts per month and basic statistics";
    }
    if (planFeatures.isBasic) {
      return "Upgrade to Standard for 15 posts per month and viewing statistics";
    }
    if (planFeatures.isStandard) {
      return "Upgrade to Premium for unlimited posts and advanced features";
    }
    return null;
  };

  const refreshPlan = (forceRefresh = false) => {
    console.log("Refreshing plan data, force:", forceRefresh);
    if (forceRefresh) {
      // First sync with Stripe to get latest data
      syncWithStripe(true).then(() => {
        // Then refresh local data
        refreshSubscription(true);
      }).catch(error => {
        console.error("Error syncing with Stripe:", error);
        // Still try to refresh local data
        refreshSubscription(true);
      });
    } else {
      refreshSubscription();
    }
  };

  const getPlanDisplayName = () => {
    switch (planFeatures.tier) {
      case 'basic': return 'Bas';
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

  console.log("useSubscriptionPlan: Returning plan features:", planFeatures);

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

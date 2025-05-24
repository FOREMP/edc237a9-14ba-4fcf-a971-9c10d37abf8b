
import { useSubscriptionFeatures, SubscriptionTier } from './useSubscriptionFeatures';

export interface PlanFeatures {
  tier: SubscriptionTier;
  isActive: boolean;
  isPremium: boolean;
  isStandard: boolean;
  isBasic: boolean;
  isFree: boolean;
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
  const { features, loading, dataFetchError, refreshSubscription } = useSubscriptionFeatures();

  const planFeatures: PlanFeatures = {
    tier: features.tier,
    isActive: features.isActive,
    isPremium: features.tier === 'premium',
    isStandard: features.tier === 'standard',
    isBasic: features.tier === 'basic',
    isFree: features.tier === 'free',
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

  return {
    ...planFeatures,
    loading,
    error: dataFetchError,
    refreshPlan: refreshSubscription,
    canCreateJob,
    getUpgradeMessage
  };
};

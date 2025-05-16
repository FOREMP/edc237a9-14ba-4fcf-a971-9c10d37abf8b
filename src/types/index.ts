export type UserRole = 'company' | 'admin';

export type User = {
  id: string;
  googleId: string;
  email: string;
  companyName: string;
  role: UserRole;
  organizationNumber?: string;
  vatNumber?: string;
  website?: string;
  companyDescription?: string;
};

export type JobType = 'fulltime' | 'parttime' | 'internship' | 'freelance';

export type JobStatus = 'pending' | 'approved' | 'rejected';

export type Job = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string;
  jobType: JobType;
  educationRequired: boolean;
  location: string;
  salary?: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  companyName: string;
  status: JobStatus;
  expiresAt: Date; // Added expiresAt field
};

export type JobFormData = Omit<Job, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'companyName' | 'status' | 'expiresAt'>;

export type JobFilter = {
  search?: string;
  jobType?: JobType[];
  educationRequired?: boolean | null;
  location?: string;
  sortBy?: 'newest' | 'oldest' | 'relevant';
  status?: JobStatus;
  showExpired?: boolean; // Added showExpired filter option
};

export type UserPreferences = {
  approvalProcessDismissed: boolean;
};

export type SubscriptionTier = 'free' | 'basic' | 'standard' | 'premium' | 'single';

export interface SubscriptionFeatures {
  monthlyPostLimit: number;
  hasBasicStats: boolean;
  hasAdvancedStats: boolean;
  canBoostPosts: boolean;
  hasPrioritySupport: boolean;
  isActive: boolean;
  tier: SubscriptionTier;
  expiresAt: Date | null;
}

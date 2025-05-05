
import { AuthenticationService } from "./authentication";
import { ProfileService } from "./profile";

// Combine all the auth services
class AuthService extends AuthenticationService {
  private profileService: ProfileService;

  constructor() {
    super();
    this.profileService = new ProfileService();
  }

  // Profile methods
  async updateProfile(profileData: {
    companyName?: string;
    organizationNumber?: string;
    vatNumber?: string;
    website?: string;
    companyDescription?: string;
  }) {
    // Make sure we have the latest session before attempting to update the profile
    await this.refreshSession();
    return await this.profileService.updateProfile(profileData);
  }

  // User preferences methods
  async getUserPreferences() {
    // Make sure we have the latest session before attempting to get preferences
    await this.refreshSession();
    return await this.profileService.getUserPreferences();
  }

  async updateUserPreferences(preferences: { approvalProcessDismissed?: boolean }) {
    // Make sure we have the latest session before attempting to update preferences
    await this.refreshSession();
    return await this.profileService.updateUserPreferences(preferences);
  }
}

export const authService = new AuthService();

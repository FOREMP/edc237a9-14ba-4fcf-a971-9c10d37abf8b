import { User } from "@/types";
import { supabase, cleanupAuthState } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/utils/adminEmails";

// List of admin emails - make sure it's consistent across the app
const ADMIN_EMAILS = ['eric@foremp.se', 'kontakt@skillbaseuf.se'];

class BaseAuthService {
  // Change these to protected so they can be accessed by derived classes
  protected currentUser: User | null = null;
  protected authSession: any = null;
  protected authUser: any = null;

  constructor() {
    // Initialize the current user from localStorage if available
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem('currentUser'); // Remove invalid data
      }
    }
  }

  // Sign up a new user
  async signUp(email: string, password: string, companyName: string): Promise<boolean> {
    // Clean up any existing auth state first
    this.cleanupAuthState();
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          company_name: companyName,
          role: 'company'
        }
      }
    });

    if (error) {
      console.error("Signup failed:", error);
      return false;
    }

    // After successful signup, set the user in local storage
    if (data.user) {
      const newUser: User = {
        id: data.user.id,
        googleId: data.user.id,
        email: data.user.email || email,
        companyName: companyName,
        role: 'company'
      };
      this.setCurrentUser(newUser);
    }

    return true;
  }

  // Sign in an existing user
  async signIn(email: string, password: string): Promise<boolean> {
    try {
      // Clean up any existing auth state first
      this.cleanupAuthState();
      
      console.log("Signing in with email:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error("Signin failed:", error);
        return false;
      }

      // After successful signin, fetch the user profile and set the user in local storage
      if (data.user) {
        try {
          // Set a simplified user first so we have some data even if profile fetch fails
          const basicUser: User = {
            id: data.user.id,
            googleId: data.user.id,
            email: data.user.email || email,
            companyName: 'Loading...',
            // Check if email is admin email
            role: isAdminEmail(data.user.email || '') ? 'admin' : 'company'
          };
          this.setCurrentUser(basicUser);
          this.authSession = data.session;
          this.authUser = data.user;
          
          // Then try to load the full profile
          await this.fetchUserProfile(data.user.id);
          return true;
        } catch (profileError) {
          console.error("Error fetching user profile after signin:", profileError);
          // Return true anyway since authentication succeeded
          // The user will have basic data at minimum
          return true;
        }
      }

      return true;
    } catch (e) {
      console.error("Sign in process error:", e);
      return false;
    }
  }

  // Sign in with Google using OAuth
  async signInWithGoogle(): Promise<boolean> {
    // Clean up any existing auth state first
    this.cleanupAuthState();
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      }
    });

    if (error) {
      console.error("Google signin failed:", error);
      return false;
    }

    return true;
  }

  // Login with email (alias for signIn for compatibility)
  async loginWithEmail(email: string, password: string): Promise<{ 
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      const success = await this.signIn(email, password);
      if (success) {
        return { 
          success: true,
          user: this.currentUser
        };
      } else {
        return {
          success: false,
          error: "Felaktiga inloggningsuppgifter"
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ett fel uppstod vid inloggning"
      };
    }
  }

  // Login with Google (alias for signInWithGoogle for compatibility)
  async loginWithGoogle(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const success = await this.signInWithGoogle();
      return {
        success: success,
        error: success ? undefined : "Google-inloggning misslyckades"
      };
    } catch (error) {
      console.error("Google login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ett fel uppstod vid inloggning med Google"
      };
    }
  }

  // Register with email (alias for signUp for compatibility)
  async registerWithEmail(email: string, password: string, companyName: string): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      const success = await this.signUp(email, password, companyName);
      if (success) {
        return {
          success: true,
          user: this.currentUser
        };
      } else {
        return {
          success: false,
          error: "Registrering misslyckades"
        };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ett fel uppstod vid registrering"
      };
    }
  }

  // Change password for the current user
  async changePassword(currentPassword: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // First verify the current password by attempting to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: this.currentUser?.email || '',
        password: currentPassword
      });

      if (signInError) {
        console.error("Password verification failed:", signInError);
        return {
          success: false,
          error: "Nuvarande lösenord är felaktigt"
        };
      }

      // If current password is correct, update to the new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Password change failed:", error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error("Password change error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ett fel uppstod vid byte av lösenord"
      };
    }
  }

  // Reset password (send reset password link)
  async resetPassword(email: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Check if the email exists in the system first
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      
      if (error) {
        console.error("Password reset request failed:", error);
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ett fel uppstod vid återställning av lösenordet"
      };
    }
  }
  
  // Update password after reset
  async updatePasswordFromReset(newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error("Password update failed:", error);
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error("Password update error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ett fel uppstod vid uppdatering av lösenordet"
      };
    }
  }

  // Sign out the current user
  async logout(): Promise<void> {
    // Clear local storage first to prevent any state inconsistencies
    this.setCurrentUser(null);
    
    try {
      // Try to perform a global sign out
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error("Logout failed:", error);
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
    
    // Ensure all Supabase auth keys are removed
    this.cleanupAuthState();
    
    // Redirect to auth page after logout
    window.location.href = '/auth';
  }
  
  // Clean up all Supabase auth tokens from storage - use shared implementation
  protected cleanupAuthState(): void {
    cleanupAuthState();
    
    // Reset internal state
    this.authSession = null;
    this.authUser = null;
  }

  // Refresh the session and fetch user profile
  async refreshSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Failed to refresh session:", error);
        return false;
      }

      if (session?.user) {
        this.authSession = session;
        this.authUser = session.user;
        try {
          await this.fetchUserProfile(session.user.id);
          return true;
        } catch (profileError) {
          console.error("Error fetching user profile:", profileError);
          
          // Even if profile fetch fails, we still have a valid session
          if (!this.currentUser && session.user) {
            // Set minimal user data from session
            const basicUser: User = {
              id: session.user.id,
              googleId: session.user.id,
              email: session.user.email || '',
              companyName: 'Unknown',
              role: isAdminEmail(session.user.email || '') ? 'admin' : 'company'
            };
            this.setCurrentUser(basicUser);
          }
          
          return true;
        }
      } else {
        // No active session, don't clear the current user to avoid flickering
        return false;
      }
    } catch (e) {
      console.error("Session refresh error:", e);
      return false;
    }
  }

  // Fetch user profile from the database
  protected async fetchUserProfile(userId: string): Promise<void> {
    try {
      console.log("Fetching user profile for ID:", userId);
      
      // Try to fetch the profile with error handling
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Check for infinite recursion error which happens with RLS
        if (error.message && error.message.includes('infinite recursion')) {
          console.error("RLS recursion error fetching profile, fallback to direct admin check");
          
          // Handle this specific error by checking if user is admin by email
          const sessionData = await supabase.auth.getSession();
          const userEmail = sessionData.data.session?.user?.email;
          
          if (userEmail && isAdminEmail(userEmail)) {
            // Create admin user based on email check
            const adminUser: User = {
              id: userId,
              googleId: userId,
              email: userEmail,
              companyName: 'Admin',
              role: 'admin'
            };
            this.setCurrentUser(adminUser);
            return;
          }
        } else {
          console.error("Error fetching profile:", error);
        }
        throw error;
      }

      // If profile was found, create user object
      if (profile) {
        // Check if the user has an admin email
        const hasAdminEmail = profile.email && isAdminEmail(profile.email);
        
        const user: User = {
          id: profile.id,
          googleId: profile.id,
          email: profile.email,
          companyName: profile.company_name || 'Company Name',
          // Override role to 'admin' if admin email
          role: hasAdminEmail ? 'admin' : (profile.role as 'company' | 'admin'),
          organizationNumber: profile.organization_number || undefined,
          vatNumber: profile.vat_number || undefined,
          website: profile.website || undefined,
          companyDescription: profile.company_description || undefined,
        };
        
        console.log("User profile fetched with role:", {
          email: profile.email,
          originalRole: profile.role,
          assignedRole: user.role,
          isAdminByEmail: hasAdminEmail
        });
        
        this.setCurrentUser(user);
      } else {
        // No profile found, check if user is admin by email
        const sessionData = await supabase.auth.getSession();
        const userEmail = sessionData.data.session?.user?.email;
        
        if (userEmail && isAdminEmail(userEmail)) {
          // Create admin user based on email check
          const adminUser: User = {
            id: userId,
            googleId: userId,
            email: userEmail,
            companyName: 'Admin',
            role: 'admin'
          };
          this.setCurrentUser(adminUser);
        } else {
          console.error("No profile found for user ID:", userId);
          throw new Error("User profile not found");
        }
      }
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      throw error;
    }
  }

  // Update user object in local storage
  protected setCurrentUser(user: User | null): void {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }

  // Get the current logged-in user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if a user is currently logged in
  isUserAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return !!session && !!session.user;
  }

  // Check if the current user is an admin
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return !!user && (user.role === 'admin' || isAdminEmail(user.email));
  }

  // Check if the current user is a company
  isCompany(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // A user with admin email is always admin, even if role is set to company
    if (isAdminEmail(user.email)) return false;
    
    return user.role === 'company';
  }

  // Get the current Supabase session
  async getSession() {
    return await supabase.auth.getSession();
  }

  // Get the current Supabase session
  getCurrentSession(): any {
    return this.authSession;
  }
}

class AuthenticationService extends BaseAuthService {
  // Update the isUserAuthenticated method to be more reliable
  isUserAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return !!session && !!session.user;
  }

  // Ensure we're not inadvertently logging out users who navigate away
  async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return false;
      }
      
      if (data?.session) {
        this.authSession = data.session;
        this.authUser = data.session.user;
        return true;
      }
      
      // Don't reset user/session here if we don't get a session
      // Only explicitly reset on logout
      return false;
    } catch (error) {
      console.error('Exception refreshing session:', error);
      return false;
    }
  }
}

export { AuthenticationService };

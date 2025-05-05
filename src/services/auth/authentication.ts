import { User } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { isAdminEmail } from "@/utils/adminEmails";

// List of admin emails - make sure it's consistent across the app
const ADMIN_EMAILS = ['eric@foremp.se', 'kontakt@skillbaseuf.se'];

class AuthenticationService {
  private currentUser: User | null = null;

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
        await this.fetchUserProfile(data.user.id);
      } catch (profileError) {
        console.error("Error fetching user profile:", profileError);
        return false;
      }
    }

    return true;
  }

  // Sign in with Google using OAuth
  async signInWithGoogle(): Promise<boolean> {
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

  // Sign out the current user
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error);
    }
    this.setCurrentUser(null);
  }

  // Refresh the session and fetch user profile
  async refreshSession(): Promise<boolean> {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Failed to refresh session:", error);
      return false;
    }

    if (session?.user) {
      try {
        await this.fetchUserProfile(session.user.id);
        return true;
      } catch (profileError) {
        console.error("Error fetching user profile:", profileError);
        return false;
      }
    } else {
      // No active session, clear the current user
      this.setCurrentUser(null);
      return false;
    }
  }

  // Fetch user profile from the database
  private async fetchUserProfile(userId: string): Promise<void> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }

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
    return !!this.currentUser;
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
}

export { AuthenticationService };

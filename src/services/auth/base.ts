
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { User } from "@/types";

export class BaseAuthService {
  protected session: Session | null = null;
  protected currentUser: User | null = null;
  protected adminEmails: string[] = ["admin@example.com", "admin@hirehive.com"];

  constructor() {
    // Initialize auth state from supabase - will be done explicitly
  }

  // Get current session from supabase
  async refreshSession() {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error fetching session:", error);
      this.session = null;
      this.currentUser = null;
      return null;
    }
    
    this.session = data.session;
    
    if (this.session) {
      await this.fetchUserProfile();
    } else {
      this.currentUser = null;
    }
    
    return this.session;
  }

  // Fetch user profile data
  protected async fetchUserProfile() {
    if (!this.session?.user) return;
    
    console.log("Fetching profile for user:", this.session.user.id);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', this.session.user.id)
      .single();
    
    if (error) {
      console.error("Error fetching user profile:", error);
      return;
    }
    
    if (data) {
      console.log("Profile data:", data);
      this.currentUser = {
        id: data.id,
        googleId: this.session.user.id,
        email: data.email || this.session.user.email || "",
        companyName: data.company_name || "Company",
        role: data.role as "admin" | "company",
        organizationNumber: data.organization_number || "",
        vatNumber: data.vat_number || "",
        website: data.website || "",
        companyDescription: data.company_description || ""
      };
    }
  }

  // Get the current authenticated user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if a user is authenticated
  isUserAuthenticated(): boolean {
    return !!this.session;
  }

  // Check if the current user is an admin
  isAdmin(): boolean {
    return !!this.currentUser && this.currentUser.role === 'admin';
  }

  // Check if the current user is a company
  isCompany(): boolean {
    return !!this.currentUser && this.currentUser.role === 'company';
  }
}


import { supabase } from "@/integrations/supabase/client";
import { UserPreferences } from "@/types";
import { BaseAuthService } from "./base";

export class ProfileService extends BaseAuthService {
  // Update user profile
  async updateProfile(profileData: {
    companyName?: string;
    organizationNumber?: string;
    vatNumber?: string;
    website?: string;
    companyDescription?: string;
  }): Promise<{ success: boolean; error?: string }> {
    // Refresh the session first to make sure we have the latest session
    await this.refreshSession();
    
    if (!this.session?.user) {
      return { 
        success: false, 
        error: "User not authenticated" 
      };
    }

    try {
      console.log("Updating profile for user:", this.session.user.id, "with data:", profileData);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: profileData.companyName,
          organization_number: profileData.organizationNumber,
          vat_number: profileData.vatNumber,
          website: profileData.website,
          company_description: profileData.companyDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.session.user.id);

      if (error) {
        console.error("Profile update error:", error);
        throw error;
      }

      // Refresh user profile after update
      await this.fetchUserProfile();
      
      return { success: true };
    } catch (error) {
      console.error("Profile update error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Profile update failed" 
      };
    }
  }

  // Get user preferences
  async getUserPreferences(): Promise<UserPreferences | null> {
    await this.refreshSession();
    
    if (!this.session?.user) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', this.session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" - not an error in this case
        console.error("Error fetching user preferences:", error);
        return null;
      }
      
      if (data) {
        return {
          approvalProcessDismissed: data.approval_process_dismissed || false
        };
      }
      
      // If no preferences found, create default preferences
      await this.createDefaultPreferences();
      return { approvalProcessDismissed: false };
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      return null;
    }
  }
  
  // Create default preferences for new users
  private async createDefaultPreferences() {
    if (!this.session?.user) return;
    
    try {
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: this.session.user.id,
          approval_process_dismissed: false
        });
      
      if (error) {
        console.error("Error creating default preferences:", error);
      }
    } catch (error) {
      console.error("Error creating default preferences:", error);
    }
  }
  
  // Update user preferences
  async updateUserPreferences(preferences: { approvalProcessDismissed?: boolean }): Promise<boolean> {
    await this.refreshSession();
    
    if (!this.session?.user) return false;
    
    try {
      // Check if preferences already exist for this user
      const { data: existingPrefs, error: checkError } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', this.session.user.id)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking existing preferences:", checkError);
        return false;
      }

      let updateError;
      
      if (existingPrefs) {
        // Update existing preferences
        const { error } = await supabase
          .from('user_preferences')
          .update({
            approval_process_dismissed: preferences.approvalProcessDismissed,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', this.session.user.id);
          
        updateError = error;
      } else {
        // Insert new preferences
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: this.session.user.id,
            approval_process_dismissed: preferences.approvalProcessDismissed,
            updated_at: new Date().toISOString()
          });
          
        updateError = error;
      }
      
      if (updateError) {
        console.error("Error updating user preferences:", updateError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error updating user preferences:", error);
      return false;
    }
  }
}

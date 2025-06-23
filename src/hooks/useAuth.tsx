
import { useEffect, useState, useCallback } from "react";
import { User, UserPreferences, UserRole } from "@/types";
import { authService } from "@/services/auth";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/utils/adminEmails";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCompany, setIsCompany] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState<boolean>(true);

  const loadUserPreferences = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    
    try {
      const prefs = await authService.getUserPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error("Error loading user preferences:", error);
    } finally {
      setPreferencesLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!isAuthenticated) return false;
    
    try {
      const success = await authService.updateUserPreferences(newPreferences);
      if (success && preferences) {
        setPreferences({ ...preferences, ...newPreferences });
      }
      return success;
    } catch (error) {
      console.error("Error updating preferences:", error);
      return false;
    }
  };

  const dismissApprovalProcess = async () => {
    return await updatePreferences({ approvalProcessDismissed: true });
  };

  const forceSessionRefresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Session refresh failed:", error);
        return false;
      }
      return !!data.session;
    } catch (err) {
      console.error("Error during session refresh:", err);
      return false;
    }
  }, []);

  const setUserData = useCallback(async (userData: User | null) => {
    if (!userData) {
      setUser(null);
      setIsAdmin(false);
      setIsCompany(false);
      return;
    }

    // Check if user is admin by email
    const isSpecialAdmin = isAdminEmail(userData.email);
    
    // Set user role based on admin check
    const finalRole = isSpecialAdmin ? 'admin' : userData.role;
    const finalUser = { ...userData, role: finalRole as UserRole };
    
    setUser(finalUser);
    setIsAdmin(isSpecialAdmin || userData.role === 'admin');
    setIsCompany(userData.role === 'company' && !isSpecialAdmin);
  }, []);

  const handleAuthChange = useCallback(async (event: string, session: any) => {
    console.log("Auth event:", event, "Session exists:", !!session);
    
    try {
      if (session?.user) {
        setIsAuthenticated(true);
        
        // Get or create user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
          
        if (profileData) {
          const userData: User = {
            id: profileData.id,
            googleId: profileData.id,
            email: profileData.email,
            companyName: profileData.company_name || 'Company',
            role: profileData.role as UserRole,
            organizationNumber: profileData.organization_number || undefined,
            vatNumber: profileData.vat_number || undefined,
            website: profileData.website || undefined,
            companyDescription: profileData.company_description || undefined,
          };
          
          await setUserData(userData);
          authService['setCurrentUser'](userData);
        }
      } else {
        setIsAuthenticated(false);
        await setUserData(null);
        authService['setCurrentUser'](null);
      }
    } catch (error) {
      console.error("Error in auth change handler:", error);
      setIsAuthenticated(false);
      await setUserData(null);
    } finally {
      setIsLoading(false);
    }
  }, [setUserData]);

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          handleAuthChange(event, session);
        }
      }
    );
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: sessionResult, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setIsAuthenticated(false);
          await setUserData(null);
          setIsLoading(false);
        } else if (sessionResult?.session?.user) {
          await handleAuthChange('INITIAL_SESSION', sessionResult.session);
        } else {
          setIsAuthenticated(false);
          await setUserData(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthChange, setUserData]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.id && preferencesLoading) {
      loadUserPreferences();
    }
  }, [isAuthenticated, isLoading, user?.id, preferencesLoading, loadUserPreferences]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isCompany,
    preferences,
    preferencesLoading,
    dismissApprovalProcess,
    updatePreferences,
    adminCheckComplete: !isLoading,
    forceSessionRefresh
  };
};

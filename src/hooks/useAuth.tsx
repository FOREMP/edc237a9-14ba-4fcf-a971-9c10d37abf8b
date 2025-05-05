
import { useEffect, useState, useCallback } from "react";
import { User, UserPreferences } from "@/types";
import { authService } from "@/services/auth";
import { toast } from "sonner";
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
  const [adminCheckComplete, setAdminCheckComplete] = useState<boolean>(false);

  // Load user preferences
  const loadUserPreferences = async () => {
    if (!isAuthenticated || !user?.id) {
      setPreferencesLoading(false);
      return;
    }
    
    setPreferencesLoading(true);
    try {
      const prefs = await authService.getUserPreferences();
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error("Error loading user preferences:", error);
    } finally {
      setPreferencesLoading(false);
    }
  };

  // Update user preferences
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

  // Dismiss approval process notification permanently
  const dismissApprovalProcess = async () => {
    return await updatePreferences({ approvalProcessDismissed: true });
  };

  // Perform a complete admin check against both email and database role
  const performAdminCheck = useCallback(async (currentUser: User) => {
    if (!currentUser) return false;
    
    try {
      // First check if email is in admin list - fastest check
      const isSpecialAdmin = isAdminEmail(currentUser.email);
      if (isSpecialAdmin) {
        console.log("Admin status granted via special email list:", currentUser.email);
        return true;
      }

      // If not in admin list, verify database role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', currentUser.id)
        .single();
      
      const dbRole = profileData?.role;
      const dbEmail = profileData?.email;
      
      // Check both role and email in database
      const isDbAdmin = (dbRole === 'admin') || (dbEmail && isAdminEmail(dbEmail));
      
      console.log("Admin status check complete:", {
        email: currentUser.email,
        dbEmail,
        dbRole,
        isAdmin: isDbAdmin || isSpecialAdmin,
        isSpecialAdmin
      });
      
      return isDbAdmin || isSpecialAdmin;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }, []);

  // Set user data with correct admin status
  const setUserWithAdminCheck = useCallback(async (userData: User | null) => {
    if (!userData) {
      setUser(null);
      setIsAdmin(false);
      setIsCompany(false);
      setAdminCheckComplete(true);
      return;
    }
    
    // Check admin status directly from email first (synchronous check)
    const isSpecialAdmin = isAdminEmail(userData.email);
    
    // Set initial user state with synchronous admin check
    setUser({
      ...userData,
      // If email is in admin list, ensure role reflects that
      role: isSpecialAdmin ? 'admin' : userData.role
    });
    
    // Set initial admin/company state based on synchronous check
    setIsAdmin(isSpecialAdmin || userData.role === 'admin');
    setIsCompany(userData.role === 'company' && !isSpecialAdmin);
    
    // Then do complete admin check against database
    const isUserAdmin = await performAdminCheck(userData);
    
    // Update admin status based on complete check
    setIsAdmin(isUserAdmin);
    setIsCompany(userData.role === 'company' && !isUserAdmin);
    
    // Update user object if needed
    if (isUserAdmin && userData.role !== 'admin') {
      setUser({
        ...userData,
        role: 'admin' // Ensure user object reflects admin role
      });
    }
    
    setAdminCheckComplete(true);
    
    console.log("User state set with admin status:", {
      email: userData.email,
      role: isUserAdmin ? 'admin' : userData.role,
      isAdmin: isUserAdmin,
      isCompany: userData.role === 'company' && !isUserAdmin
    });
  }, [performAdminCheck]);

  useEffect(() => {
    let mounted = true;
    
    console.log("Setting up auth listener");
    
    // Set loading state immediately
    setIsLoading(true);
    setAdminCheckComplete(false);
    
    // Setup auth listener first before checking current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log("Auth state changed:", event, session?.user?.email);

      if (session) {
        // Use setTimeout to defer the profile fetch to avoid potential deadlocks
        setTimeout(async () => {
          if (!mounted) return;
          
          try {
            await authService.refreshSession(); // This will also fetch user profile
            const currentUser = authService.getCurrentUser();
            
            if (currentUser) {
              setIsAuthenticated(true);
              await setUserWithAdminCheck(currentUser);
            } else {
              // No user data returned
              setIsAuthenticated(false);
              setUser(null);
              setIsAdmin(false);
              setIsCompany(false);
              setAdminCheckComplete(true);
            }
          } catch (error) {
            console.error("Error refreshing session:", error);
            setIsLoading(false);
            setAdminCheckComplete(true);
          } finally {
            if (mounted) setIsLoading(false);
          }
        }, 0);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsCompany(false);
        setIsLoading(false);
        setAdminCheckComplete(true);
      }
    });
    
    // Check current session state
    const initializeAuth = async () => {
      try {
        const sessionBefore = await supabase.auth.getSession();
        console.log("Initial session check:", sessionBefore?.data?.session?.user?.email);
        
        await authService.refreshSession(); // This refreshes the session and fetches user profile
        const currentUser = authService.getCurrentUser();
        const authState = authService.isUserAuthenticated();
        
        console.log("Auth initialized:", {
          hasUser: !!currentUser,
          authState,
          email: currentUser?.email
        });
        
        // If user is logged in, set authentication state and user data
        if (currentUser && authState) {
          setIsAuthenticated(true);
          await setUserWithAdminCheck(currentUser);
        } else {
          // No authenticated user
          setIsAuthenticated(false);
          setUser(null);
          setIsAdmin(false);
          setIsCompany(false);
          setAdminCheckComplete(true);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initializeAuth();
    
    // Cleanup subscription on unmount
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUserWithAdminCheck]);

  // Load preferences when auth status changes
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.id) {
      loadUserPreferences();
    }
  }, [isAuthenticated, isLoading, user?.id]);

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !adminCheckComplete, // Only consider loaded when admin check is done
    isAdmin,
    isCompany,
    preferences,
    preferencesLoading,
    dismissApprovalProcess,
    updatePreferences,
    adminCheckComplete
  };
};

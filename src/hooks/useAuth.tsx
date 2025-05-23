import { useEffect, useState, useCallback, useRef } from "react";
import { User, UserPreferences, UserRole } from "@/types";
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
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  
  // Use refs to track last auth check time to prevent rapid re-authentication
  const lastAuthCheckRef = useRef<number>(0);
  const minAuthCheckInterval = 1000; // Minimum time between auth checks in ms
  const authOperationInProgress = useRef<boolean>(false);

  // Load user preferences
  const loadUserPreferences = async () => {
    if (!isAuthenticated || !user?.id) {
      setPreferencesLoading(false);
      return;
    }
    
    if (preferencesLoading) {
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
    
    // Get role as UserRole type to ensure TypeScript knows it's part of the union
    const userRole: UserRole = userData.role;
    
    // Set initial user state with synchronous admin check
    setUser({
      ...userData,
      // If email is in admin list, ensure role reflects that
      role: isSpecialAdmin ? 'admin' as UserRole : userRole
    });
    
    // Set initial admin/company state based on synchronous check
    setIsAdmin(isSpecialAdmin || userRole === 'admin');
    
    // Explicit role check for company status using the typed userRole
    setIsCompany(userRole === 'company' && !isSpecialAdmin && userRole !== 'admin');
    
    // Then do complete admin check against database - but only if needed
    if (!isSpecialAdmin && userRole !== 'admin') {
      const isUserAdmin = await performAdminCheck(userData);
      
      // Update admin status based on complete check
      setIsAdmin(isUserAdmin);
      
      // Update company status based on complete check using typed role
      setIsCompany(!isUserAdmin && userRole === 'company');
      
      // Update user object if needed
      if (isUserAdmin && userRole !== 'admin') {
        setUser({
          ...userData,
          role: 'admin' as UserRole // Ensure user object reflects admin role with explicit typing
        });
      }
    }
    
    setAdminCheckComplete(true);
  }, [performAdminCheck]);

  // Handle auth state changes with rate limiting
  const handleAuthChange = useCallback(async (event, session) => {
    console.log("Auth event triggered:", event);
    
    // Skip if another auth operation is in progress or if we've checked recently
    const now = Date.now();
    if (authOperationInProgress.current || (now - lastAuthCheckRef.current < minAuthCheckInterval)) {
      console.log("Skipping auth check: too soon or already in progress");
      return;
    }
    
    lastAuthCheckRef.current = now;
    authOperationInProgress.current = true;
    
    try {
      if (session) {
        console.log("Session found in auth event");
        // Use setTimeout to defer the profile fetch to avoid potential deadlocks
        setTimeout(async () => {
          try {
            // Only refresh session if we don't have active user data
            if (!isAuthenticated || !user) {
              console.log("Refreshing session data");
              await authService.refreshSession(); // This will also fetch user profile
              const currentUser = authService.getCurrentUser();
              
              if (currentUser) {
                console.log("User found after refresh:", currentUser.email);
                setIsAuthenticated(true);
                await setUserWithAdminCheck(currentUser);
              } else {
                // No user data returned
                console.log("No user data after refresh");
                setIsAuthenticated(false);
                setUser(null);
                setIsAdmin(false);
                setIsCompany(false);
                setAdminCheckComplete(true);
              }
            }
          } catch (error) {
            console.error("Error refreshing session:", error);
          } finally {
            setIsLoading(false);
            authOperationInProgress.current = false;
          }
        }, 0);
      } else {
        // Only clear auth state completely on explicit SIGNED_OUT event
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          console.log("User signed out or deleted");
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsCompany(false);
          setAdminCheckComplete(true);
        }
        setIsLoading(false);
        authOperationInProgress.current = false;
      }
    } catch (error) {
      console.error("Error handling auth change:", error);
      authOperationInProgress.current = false;
      setIsLoading(false);
    }
  }, [isAuthenticated, user, setUserWithAdminCheck]);

  // Initial auth setup
  useEffect(() => {
    // Skip if we've already initialized
    if (authInitialized) return;
    
    let mounted = true;
    setIsLoading(true);
    setAdminCheckComplete(false);
    
    // Setup auth listener first before checking current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        handleAuthChange(event, session);
      }
    });
    
    // Check current session state
    const initializeAuth = async () => {
      authOperationInProgress.current = true;
      try {
        const sessionResult = await supabase.auth.getSession();
        
        if (sessionResult?.data?.session) {
          try {
            await authService.refreshSession(); // This refreshes the session and fetches user profile
            const currentUser = authService.getCurrentUser();
            const authState = authService.isUserAuthenticated();
            
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
            console.error("Error refreshing session:", error);
            setIsAuthenticated(false);
            setAdminCheckComplete(true);
          }
        } else {
          // No session found
          setIsAuthenticated(false);
          setUser(null);
          setIsAdmin(false);
          setIsCompany(false);
          setAdminCheckComplete(true);
        }
        
        // Mark auth as initialized to prevent re-initialization
        setAuthInitialized(true);
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
          authOperationInProgress.current = false;
        }
      }
    };
    
    initializeAuth();
    
    // Cleanup subscription on unmount
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUserWithAdminCheck, handleAuthChange, authInitialized]);

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

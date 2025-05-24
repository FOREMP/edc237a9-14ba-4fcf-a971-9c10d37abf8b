
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
  
  const authInProgressRef = useRef<boolean>(false);
  const lastAuthEventRef = useRef<string>("");
  const authEventCountRef = useRef<number>(0);
  const initializationAttempts = useRef<number>(0);
  const lastSyncTimeRef = useRef<number>(0);

  // Auto-sync with Stripe on login (with throttling)
  const syncSubscriptionWithStripe = useCallback(async (userId: string) => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;
    
    // Throttle sync calls to prevent spamming Stripe (minimum 30 seconds between calls)
    if (timeSinceLastSync < 30000) {
      return;
    }
    
    lastSyncTimeRef.current = now;
    
    try {
      await supabase.functions.invoke('check-subscription', {
        body: { force_fresh: true }
      });
    } catch (error) {
      // Silent failure - don't show errors to user for background sync
      console.error("Background subscription sync failed:", error);
    }
  }, []);

  const loadUserPreferences = async () => {
    if (!isAuthenticated || !user?.id || preferencesLoading === false) {
      return;
    }
    
    try {
      const prefs = await authService.getUserPreferences();
      if (prefs) {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error("useAuth: Error loading user preferences:", error);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!isAuthenticated) return false;
    
    try {
      const success = await authService.updateUserPreferences(newPreferences);
      if (success && preferences) {
        setPreferences({ ...preferences, ...newPreferences });
      }
      return success;
    } catch (error) {
      console.error("useAuth: Error updating preferences:", error);
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
        console.error("useAuth: Session refresh failed:", error);
        return false;
      }
      
      return !!data.session;
    } catch (err) {
      console.error("useAuth: Error during session refresh:", err);
      return false;
    }
  }, []);

  const performAdminCheck = useCallback(async (currentUser: User) => {
    if (!currentUser) return false;
    
    try {
      const isSpecialAdmin = isAdminEmail(currentUser.email);
      if (isSpecialAdmin) {
        return true;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', currentUser.id)
        .single();
      
      const dbRole = profileData?.role;
      const dbEmail = profileData?.email;
      
      const isDbAdmin = (dbRole === 'admin') || (dbEmail && isAdminEmail(dbEmail));
      
      return isDbAdmin || isSpecialAdmin;
    } catch (error) {
      console.error("useAuth: Error checking admin status:", error);
      return false;
    }
  }, []);

  const setUserWithAdminCheck = useCallback(async (userData: User | null) => {
    if (!userData) {
      setUser(null);
      setIsAdmin(false);
      setIsCompany(false);
      setAdminCheckComplete(true);
      return;
    }
    
    const isSpecialAdmin = isAdminEmail(userData.email);
    const userRole = userData.role as UserRole;
    
    setUser({
      ...userData,
      role: isSpecialAdmin ? ('admin' as UserRole) : userRole
    });
    
    const isUserAdmin = isSpecialAdmin || userRole === ('admin' as UserRole);
    setIsAdmin(isUserAdmin);
    setIsCompany(userRole === ('company' as UserRole) && !isSpecialAdmin && userRole !== ('admin' as UserRole));
    
    if (!isSpecialAdmin && userRole !== ('admin' as UserRole)) {
      const adminCheckResult = await performAdminCheck(userData);
      setIsAdmin(adminCheckResult);
      setIsCompany(!adminCheckResult && userRole === ('company' as UserRole));
      
      if (adminCheckResult && userRole !== ('admin' as UserRole)) {
        setUser({
          ...userData,
          role: 'admin' as UserRole
        });
      }
    }
    
    setAdminCheckComplete(true);
    
    // Auto-sync subscription data when user logs in
    if (userData.id) {
      syncSubscriptionWithStripe(userData.id);
    }
  }, [performAdminCheck, syncSubscriptionWithStripe]);

  const handleAuthChange = useCallback(async (event: string, session: any) => {
    // Prevent auth loops by limiting rapid events
    authEventCountRef.current += 1;
    if (authEventCountRef.current > 20) {
      setTimeout(() => {
        authEventCountRef.current = 0;
      }, 5000);
      return;
    }
    
    // Reset counter after a delay
    setTimeout(() => {
      authEventCountRef.current = Math.max(0, authEventCountRef.current - 1);
    }, 1000);
    
    if (authInProgressRef.current) {
      return;
    }
    
    // Prevent duplicate INITIAL_SESSION events
    if (lastAuthEventRef.current === event && event === 'INITIAL_SESSION') {
      return;
    }
    
    lastAuthEventRef.current = event;
    authInProgressRef.current = true;
    
    try {
      if (session) {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setIsAuthenticated(true);
          await setUserWithAdminCheck(currentUser);
        } else {
          setIsAuthenticated(false);
          await setUserWithAdminCheck(null);
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setIsAuthenticated(false);
        await setUserWithAdminCheck(null);
      }
    } catch (error) {
      console.error("useAuth: Error handling auth change:", error);
    } finally {
      setIsLoading(false);
      authInProgressRef.current = false;
    }
  }, [setUserWithAdminCheck]);

  useEffect(() => {
    if (authInitialized) return;
    
    // Prevent infinite initialization attempts
    initializationAttempts.current += 1;
    if (initializationAttempts.current > 3) {
      setIsLoading(false);
      setAuthInitialized(true);
      return;
    }
    
    let mounted = true;
    setIsLoading(true);
    setAdminCheckComplete(false);
    authInProgressRef.current = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        handleAuthChange(event, session);
      }
    });
    
    const initializeAuth = async () => {
      try {
        const sessionResult = await supabase.auth.getSession();
        
        if (sessionResult?.data?.session) {
          const currentUser = authService.getCurrentUser();
          const authState = authService.isUserAuthenticated();
          
          if (currentUser && authState) {
            setIsAuthenticated(true);
            await setUserWithAdminCheck(currentUser);
          } else {
            setIsAuthenticated(false);
            await setUserWithAdminCheck(null);
          }
        } else {
          setIsAuthenticated(false);
          await setUserWithAdminCheck(null);
        }
        
        setAuthInitialized(true);
      } catch (error) {
        console.error("useAuth: Error initializing auth:", error);
        setIsAuthenticated(false);
        setAdminCheckComplete(true);
      } finally {
        if (mounted) {
          setIsLoading(false);
          authInProgressRef.current = false;
        }
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUserWithAdminCheck, handleAuthChange, authInitialized]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.id && preferencesLoading) {
      loadUserPreferences();
    }
  }, [isAuthenticated, isLoading, user?.id, preferencesLoading]);

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !adminCheckComplete,
    isAdmin,
    isCompany,
    preferences,
    preferencesLoading,
    dismissApprovalProcess,
    updatePreferences,
    adminCheckComplete,
    forceSessionRefresh
  };
};

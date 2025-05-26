
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
    console.log("useAuth: Auth event:", event, "Session exists:", !!session);
    
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
      console.log("useAuth: Auth change already in progress, skipping");
      return;
    }
    
    // Prevent duplicate INITIAL_SESSION events
    if (lastAuthEventRef.current === event && event === 'INITIAL_SESSION') {
      console.log("useAuth: Duplicate INITIAL_SESSION event, skipping");
      return;
    }
    
    lastAuthEventRef.current = event;
    authInProgressRef.current = true;
    
    try {
      if (session?.user) {
        console.log("useAuth: Setting authenticated user from session");
        setIsAuthenticated(true);
        
        // Get user from auth service or create from session
        let currentUser = authService.getCurrentUser();
        if (!currentUser && session.user) {
          // Create basic user from session data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
            
          if (profileData) {
            currentUser = {
              id: profileData.id,
              googleId: profileData.id,
              email: profileData.email || session.user.email || '',
              companyName: profileData.company_name || 'Company',
              role: profileData.role as UserRole,
              organizationNumber: profileData.organization_number || undefined,
              vatNumber: profileData.vat_number || undefined,
              website: profileData.website || undefined,
              companyDescription: profileData.company_description || undefined,
            };
          } else {
            // Fallback user from session
            currentUser = {
              id: session.user.id,
              googleId: session.user.id,
              email: session.user.email || '',
              companyName: 'Company',
              role: isAdminEmail(session.user.email || '') ? 'admin' : 'company'
            };
          }
        }
        
        if (currentUser) {
          await setUserWithAdminCheck(currentUser);
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        console.log("useAuth: User signed out");
        setIsAuthenticated(false);
        await setUserWithAdminCheck(null);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("useAuth: Token refreshed, maintaining auth state");
        // Don't change auth state on token refresh if we already have a user
        if (!user && session?.user) {
          setIsAuthenticated(true);
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            await setUserWithAdminCheck(currentUser);
          }
        }
      }
    } catch (error) {
      console.error("useAuth: Error handling auth change:", error);
    } finally {
      setIsLoading(false);
      authInProgressRef.current = false;
    }
  }, [setUserWithAdminCheck, user]);

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
    
    console.log("useAuth: Initializing auth");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        handleAuthChange(event, session);
      }
    });
    
    const initializeAuth = async () => {
      try {
        console.log("useAuth: Getting initial session");
        const { data: sessionResult, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("useAuth: Error getting session:", error);
          setIsAuthenticated(false);
          await setUserWithAdminCheck(null);
        } else if (sessionResult?.session?.user) {
          console.log("useAuth: Found existing session for user:", sessionResult.session.user.email);
          setIsAuthenticated(true);
          
          // Try to get user from auth service first
          let currentUser = authService.getCurrentUser();
          
          // If no user in auth service, fetch from database
          if (!currentUser) {
            console.log("useAuth: No user in auth service, fetching from database");
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionResult.session.user.id)
                .maybeSingle();
                
              if (profileData) {
                currentUser = {
                  id: profileData.id,
                  googleId: profileData.id,
                  email: profileData.email || sessionResult.session.user.email || '',
                  companyName: profileData.company_name || 'Company',
                  role: profileData.role as UserRole,
                  organizationNumber: profileData.organization_number || undefined,
                  vatNumber: profileData.vat_number || undefined,
                  website: profileData.website || undefined,
                  companyDescription: profileData.company_description || undefined,
                };
                
                // Update auth service with the user data
                authService['setCurrentUser'](currentUser);
              }
            } catch (profileError) {
              console.error("useAuth: Error fetching profile:", profileError);
            }
          }
          
          if (currentUser) {
            await setUserWithAdminCheck(currentUser);
          } else {
            // Create fallback user from session
            const fallbackUser: User = {
              id: sessionResult.session.user.id,
              googleId: sessionResult.session.user.id,
              email: sessionResult.session.user.email || '',
              companyName: 'Company',
              role: isAdminEmail(sessionResult.session.user.email || '') ? 'admin' : 'company'
            };
            await setUserWithAdminCheck(fallbackUser);
          }
        } else {
          console.log("useAuth: No existing session found");
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

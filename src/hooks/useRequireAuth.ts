
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase, checkTableData, fixCommonRlsIssues } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/utils/adminEmails";

export const useRequireAuth = (redirectUrl: string = "/auth") => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [sessionRefreshed, setSessionRefreshed] = useState(false);
  const [dataVerified, setDataVerified] = useState(false);
  const [dataVerificationError, setDataVerificationError] = useState<string | null>(null);
  const lastAuthCheckRef = useRef<number>(0);
  const checkingRef = useRef<boolean>(false);
  const dataCheckRef = useRef<boolean>(false);

  // More robust admin check with backup email verification
  const verifyAdminStatus = useCallback(async () => {
    if (!auth.user?.id) return false;
    
    // First, immediate check based on user data from context
    let isAdmin = auth.isAdmin || 
                 (auth.user.role === 'admin') || 
                 (auth.user.email && isAdminEmail(auth.user.email));
                 
    if (isAdmin) {
      console.log("Admin status verified from user data:", auth.user.email);
      return true;
    }
    
    // Prevent excessive verification attempts
    const now = Date.now();
    if (now - lastAuthCheckRef.current < 2000 || checkingRef.current) {
      return auth.isAdmin;
    }
    
    lastAuthCheckRef.current = now;
    checkingRef.current = true;
    
    try {
      // Then try database check as backup
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', auth.user.id)
        .maybeSingle();
        
      if (error) {
        console.error("Error checking admin status from DB:", error);
        
        // Final check - fall back to email verification as absolute backstop
        if (auth.user.email && isAdminEmail(auth.user.email)) {
          console.log("Admin access granted via email fallback:", auth.user.email);
          checkingRef.current = false;
          return true;
        }
        
        checkingRef.current = false;
        return false;
      }
      
      // Check both DB role and email
      const isAdminRole = profileData?.role === 'admin';
      const isAdminByDbEmail = profileData?.email && isAdminEmail(profileData.email);
      
      checkingRef.current = false;
      return isAdminRole || isAdminByDbEmail;
    } catch (err) {
      console.error("Error in admin status verification:", err);
      
      checkingRef.current = false;
      // Final fallback - if all else fails, just check the email
      return !!(auth.user.email && isAdminEmail(auth.user.email));
    }
  }, [auth.user?.id, auth.user?.email, auth.user?.role, auth.isAdmin]);

  // Verify data access for the current user
  const verifyDataAccess = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user?.id || auth.isLoading || dataCheckRef.current) return;
    
    // Avoid duplicate checks
    dataCheckRef.current = true;
    
    try {
      console.log("useRequireAuth: Verifying data access for user", auth.user.id);
      
      // Check for data existence in key tables
      const checkResult = await checkTableData(auth.user.id);
      
      // Handle critical data issues
      if (checkResult.profiles?.count === 0 || 
          checkResult.subscribers?.count === 0 || 
          checkResult.userPreferences?.count === 0 ||
          checkResult.jobPostingLimits?.count === 0) {
        
        console.warn("useRequireAuth: Missing essential user data detected:", checkResult);
        
        // Try to fix common data issues automatically
        const fixResult = await fixCommonRlsIssues();
        console.log("useRequireAuth: Auto-fix attempt result:", fixResult);
        
        if (fixResult.error) {
          setDataVerificationError("Could not auto-fix data issues. Please contact support.");
          setDataVerified(false);
        } else {
          // Check if fixes were successful
          const recheck = await checkTableData(auth.user.id);
          
          // Validate fix results
          if (recheck.profiles?.count > 0 && 
              recheck.userPreferences?.count > 0) {
            setDataVerified(true);
          } else {
            setDataVerificationError("Essential user data is missing. Please contact support.");
            setDataVerified(false);
          }
        }
      } else if (checkResult.error) {
        setDataVerificationError(checkResult.error);
        setDataVerified(false);
      } else {
        // All required data exists
        setDataVerified(true);
      }
    } catch (err) {
      console.error("useRequireAuth: Error during data verification:", err);
      setDataVerificationError(`Data access error: ${err instanceof Error ? err.message : String(err)}`);
      setDataVerified(false);
    } finally {
      dataCheckRef.current = false;
    }
  }, [auth.isAuthenticated, auth.user?.id, auth.isLoading]);

  useEffect(() => {
    const checkAuthAndSession = async () => {
      // If auth is still loading, wait
      if (auth.isLoading) {
        console.log("Auth still loading, waiting...");
        return;
      }
      
      // If we don't have a user yet and authentication isn't complete, wait
      if (!auth.isAuthenticated && !auth.adminCheckComplete) {
        console.log("Authentication check incomplete, waiting...");
        return;
      }
      
      console.log("Auth check complete, isAuthenticated:", auth.isAuthenticated, 
        "isCompany:", auth.isCompany,
        "role:", auth.user?.role);
      
      // If authenticated, check session and data access
      if (auth.isAuthenticated) {
        // Ensure session validity - refresh once per hook lifecycle
        if (!sessionRefreshed) {
          console.log("Refreshing session in useRequireAuth");
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              console.error("Failed to refresh session:", error);
              // If refresh fails but we still have a valid session check
              const { data: sessionData } = await supabase.auth.getSession();
              if (!sessionData?.session) {
                // No valid session - redirect to login
                console.log("No valid session after refresh attempt");
                toast.error("Din session har gått ut. Logga in igen.");
                navigate(redirectUrl, { 
                  state: { from: window.location.pathname },
                  replace: true 
                });
                return;
              }
            }
            setSessionRefreshed(true);
          } catch (err) {
            console.error("Session refresh error:", err);
          }
        }
        
        // Force a verification of admin status
        const adminAccess = await verifyAdminStatus();
        setHasAdminAccess(adminAccess);
        console.log("Admin access verification result:", adminAccess);
        
        // Check for essential data access - only for company users
        if (auth.isCompany && !dataVerified && !dataVerificationError) {
          await verifyDataAccess();
        }
        
        // Now we can finish the auth check
        setIsCheckingAuth(false);
      } else {
        // Not authenticated, redirect to login
        console.log("User not authenticated, redirecting to:", redirectUrl);
        toast.error("Du måste logga in för att komma åt den här sidan");
        
        // Pass the current path as state to redirect back after login
        navigate(redirectUrl, { 
          state: { from: window.location.pathname },
          replace: true 
        });
        
        setIsCheckingAuth(false);
      }
    };
    
    checkAuthAndSession();
  }, [
    auth.isAuthenticated, 
    auth.isLoading, 
    auth.user?.id, 
    auth.user?.email,
    auth.user?.role,
    auth.isCompany,
    auth.adminCheckComplete, 
    navigate, 
    redirectUrl, 
    verifyAdminStatus,
    sessionRefreshed,
    verifyDataAccess,
    dataVerified,
    dataVerificationError
  ]);

  // Enhanced debug logging
  useEffect(() => {
    console.log("useRequireAuth state:", {
      isCheckingAuth,
      hasAdminAccess,
      authUser: auth.user,
      email: auth.user?.email,
      isAdminByEmail: auth.user?.email ? isAdminEmail(auth.user.email) : false,
      isAdminByRole: auth.user?.role === 'admin',
      isCompany: auth.user?.role === 'company',
      isAdminFromAuthHook: auth.isAdmin,
      isCompanyFromAuthHook: auth.isCompany,
      dataVerified,
      dataVerificationError
    });
  }, [
    isCheckingAuth, 
    hasAdminAccess, 
    auth.user, 
    auth.isAdmin, 
    auth.isCompany,
    dataVerified,
    dataVerificationError
  ]);

  return { 
    ...auth, 
    isLoading: auth.isLoading || isCheckingAuth || !auth.adminCheckComplete,
    hasAdminAccess: hasAdminAccess || auth.isAdmin || (auth.user?.email ? isAdminEmail(auth.user.email) : false),
    dataVerified,
    dataVerificationError
  };
};

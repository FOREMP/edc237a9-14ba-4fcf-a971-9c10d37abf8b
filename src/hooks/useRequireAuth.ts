
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/utils/adminEmails";

export const useRequireAuth = (redirectUrl: string = "/auth") => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [sessionRefreshed, setSessionRefreshed] = useState(false);
  const lastAuthCheckRef = useRef<number>(0);
  const checkingRef = useRef<boolean>(false);

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
      
      // If authenticated, check admin status
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
    sessionRefreshed
  ]);

  // Enhanced debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("useRequireAuth state:", {
        isCheckingAuth,
        hasAdminAccess,
        authUser: auth.user,
        email: auth.user?.email,
        isAdminByEmail: auth.user?.email ? isAdminEmail(auth.user.email) : false,
        isAdminByRole: auth.user?.role === 'admin',
        isCompany: auth.user?.role === 'company',
        isAdminFromAuthHook: auth.isAdmin,
        isCompanyFromAuthHook: auth.isCompany
      });
    }
  }, [isCheckingAuth, hasAdminAccess, auth.user, auth.isAdmin, auth.isCompany]);

  return { 
    ...auth, 
    isLoading: auth.isLoading || isCheckingAuth || !auth.adminCheckComplete,
    hasAdminAccess: hasAdminAccess || auth.isAdmin || (auth.user?.email ? isAdminEmail(auth.user.email) : false)
  };
};


import { useEffect, useState, useCallback } from "react";
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
    
    try {
      // Force a session refresh to ensure we have the latest token
      await supabase.auth.refreshSession();
      
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
          return true;
        }
        
        return false;
      }
      
      // Check both DB role and email
      const isAdminRole = profileData?.role === 'admin';
      const isAdminByDbEmail = profileData?.email && isAdminEmail(profileData.email);
      
      console.log("Admin DB verification result:", {
        email: auth.user.email,
        dbEmail: profileData?.email,
        dbRole: profileData?.role,
        isAdminRole,
        isAdminByDbEmail
      });
      
      return isAdminRole || isAdminByDbEmail;
    } catch (err) {
      console.error("Error in admin status verification:", err);
      
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
      
      console.log("Auth check complete, isAuthenticated:", auth.isAuthenticated);
      
      // If authenticated, check admin status
      if (auth.isAuthenticated) {
        // Ensure session validity - refresh once per hook lifecycle
        if (!sessionRefreshed) {
          console.log("Refreshing session in useRequireAuth");
          try {
            await supabase.auth.refreshSession();
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
    auth.adminCheckComplete, 
    navigate, 
    redirectUrl, 
    verifyAdminStatus,
    sessionRefreshed
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
      isAdminFromAuthHook: auth.isAdmin
    });
  }, [isCheckingAuth, hasAdminAccess, auth.user, auth.isAdmin]);

  return { 
    ...auth, 
    isLoading: auth.isLoading || isCheckingAuth || !auth.adminCheckComplete,
    hasAdminAccess: hasAdminAccess || auth.isAdmin || (auth.user?.email ? isAdminEmail(auth.user.email) : false)
  };
};

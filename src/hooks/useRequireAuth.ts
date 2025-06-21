
import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isAdminEmail } from "@/utils/adminEmails";

export const useRequireAuth = (redirectUrl: string = "/auth") => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      console.log("User not authenticated, redirecting to:", redirectUrl);
      toast.error("Du måste logga in för att komma åt den här sidan");
      navigate(redirectUrl, { 
        state: { from: window.location.pathname },
        replace: true 
      });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate, redirectUrl]);

  return { 
    ...auth, 
    hasAdminAccess: auth.isAdmin || (auth.user?.email ? isAdminEmail(auth.user.email) : false),
    dataVerified: true,
    dataVerificationError: null
  };
};


import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/utils/adminEmails";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface AdminDebugInfoProps {
  allJobsCount: number;
  currentJobs: {
    tab: string;
    count: number;
  };
}

const AdminDebugInfo = ({ allJobsCount, currentJobs }: AdminDebugInfoProps) => {
  const { user, isAdmin, adminCheckComplete } = useAuth();
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [dbEmail, setDbEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dbCheckComplete, setDbCheckComplete] = useState<boolean>(false);
  
  // Get role directly from the database for verification
  useEffect(() => {
    const checkDbRole = async () => {
      if (user?.id) {
        try {
          // Check session first
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user?.id) {
            setSessionId(sessionData.session.user.id.substring(0, 8) + '...');
          }
            
          // Try a direct query that avoids RLS issues
          const { data, error } = await supabase
            .from('profiles')
            .select('role, email')
            .eq('id', user.id)
            .maybeSingle();
            
          if (!error && data) {
            setDbRole(data.role);
            setDbEmail(data.email);
            setDbCheckComplete(true);
          } else {
            console.error("Error fetching role:", error);
            setDbRole("Error: " + error?.message);
            setDbCheckComplete(true);
          }
        } catch (err) {
          console.error("Error checking role from DB:", err);
          setDbRole("Error: " + (err as Error).message);
          setDbCheckComplete(true);
        }
      }
    };
    
    checkDbRole();
  }, [user?.id]);
  
  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-md text-sm text-slate-700 border border-slate-200">
      <h3 className="font-semibold mb-1">Debug info:</h3>
      <p>Admin status: {isAdmin ? 'Yes' : 'No'}</p>
      <p>Admin check complete: {adminCheckComplete ? 'Yes' : 'No'}</p>
      <p>User email: {user?.email}</p>
      <p>Is admin email: {user?.email && isAdminEmail(user.email) ? 'Yes' : 'No'}</p>
      <p>User role from context: {user?.role}</p>
      <p>User role from DB: {dbCheckComplete ? dbRole || 'Not found' : 'Loading...'}</p>
      <p>User email from DB: {dbCheckComplete ? dbEmail || 'Not found' : 'Loading...'}</p>
      <p>Is DB email admin: {dbEmail && isAdminEmail(dbEmail) ? 'Yes' : 'No'}</p>
      <p>User ID: {user?.id || 'Not available'}</p>
      <p>Session ID: {sessionId || 'No active session'}</p>
      <p>Total jobs available: {allJobsCount}</p>
      <p>Current tab: {currentJobs.tab} ({currentJobs.count} jobs)</p>
      <p>Database check complete: {dbCheckComplete ? 'Yes' : 'No'}</p>
    </div>
  );
};

export default AdminDebugInfo;

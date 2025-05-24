
import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/utils/adminEmails";

interface AdminDebugInfoProps {
  allJobsCount: number;
  currentJobs: {
    tab: string;
    count: number;
  };
}

const AdminDebugInfo = ({ allJobsCount, currentJobs }: AdminDebugInfoProps) => {
  const { user, isAdmin, adminCheckComplete } = useAuth();
  
  // Only show for admin users and only in development
  if (!isAdmin || process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-md text-sm text-slate-700 border border-slate-200">
      <h3 className="font-semibold mb-1">Admin Debug Info:</h3>
      <p>Admin status: {isAdmin ? 'Yes' : 'No'}</p>
      <p>Admin check complete: {adminCheckComplete ? 'Yes' : 'No'}</p>
      <p>User email: {user?.email}</p>
      <p>Is admin email: {user?.email && isAdminEmail(user.email) ? 'Yes' : 'No'}</p>
      <p>User role: {user?.role}</p>
      <p>User ID: {user?.id || 'Not available'}</p>
      <p>Total jobs available: {allJobsCount}</p>
      <p>Current tab: {currentJobs.tab} ({currentJobs.count} jobs)</p>
    </div>
  );
};

export default AdminDebugInfo;


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JobViewStats {
  impressions: number;
  detailViews: number;
  totalViews: number;
}

export const useJobViewStats = (jobId: string) => {
  const [stats, setStats] = useState<JobViewStats>({
    impressions: 0,
    detailViews: 0,
    totalViews: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobViewStats = async () => {
      if (!jobId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching job view stats for job:', jobId);
        
        // Use the database function to get view statistics
        const { data, error: rpcError } = await supabase
          .rpc('get_job_view_stats', { job_uuid: jobId });
        
        if (rpcError) {
          console.error('Error fetching job view stats:', rpcError);
          throw new Error(rpcError.message);
        }
        
        if (data && data.length > 0) {
          const result = data[0];
          const newStats = {
            impressions: Number(result.impressions) || 0,
            detailViews: Number(result.detail_views) || 0,
            totalViews: (Number(result.impressions) || 0) + (Number(result.detail_views) || 0)
          };
          
          console.log('Job view stats fetched:', newStats);
          setStats(newStats);
        } else {
          // No data found, set to zeros
          setStats({
            impressions: 0,
            detailViews: 0,
            totalViews: 0
          });
        }
      } catch (err) {
        console.error('Error fetching job view statistics:', err);
        setError('Failed to load view statistics');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJobViewStats();
  }, [jobId]);
  
  return { stats, isLoading, error };
};

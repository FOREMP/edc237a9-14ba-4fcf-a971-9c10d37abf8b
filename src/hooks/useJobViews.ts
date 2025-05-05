
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ViewType = 'impression' | 'detail';
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

/**
 * Hook to track job views (impressions or detailed views)
 */
export const useJobViews = () => {
  const { user } = useAuth();

  /**
   * Track a job view (either impression when seeing in a list or detail when viewing the full job)
   */
  const trackJobView = async (jobId: string, viewType: ViewType, deviceType: DeviceType = 'unknown') => {
    if (!jobId) return;
    
    try {
      console.log(`Tracking job ${jobId} ${viewType} view from ${deviceType}`);
      
      // Insert the view into the database
      const { error } = await supabase
        .from('job_views')
        .insert({
          job_id: jobId,
          view_type: viewType,
          viewer_id: user?.id || null,
          device_type: deviceType
        });
      
      if (error) {
        console.error('Error tracking job view:', error);
      }
    } catch (err) {
      console.error('Failed to track job view:', err);
    }
  };
  
  return { trackJobView };
};

/**
 * Hook to track job impressions automatically when a job card is rendered
 * This is now handled directly in JobCard.tsx with session-based tracking
 * Keeping this for backwards compatibility
 */
export const useTrackJobImpression = (jobId: string) => {
  const { trackJobView } = useJobViews();
  
  useEffect(() => {
    // This implementation has been moved to JobCard.tsx
    // with improved session-based tracking to prevent duplicates
  }, [jobId, trackJobView]);
};

/**
 * Hook to get job views statistics
 */
export const useJobViewsStats = (jobId: string) => {
  const [impressions, setImpressions] = useState<number>(0);
  const [detailViews, setDetailViews] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchJobViewStats = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get impression count
        const { data: impressionData, error: impressionError } = await supabase
          .from('job_views')
          .select('*', { count: 'exact' })
          .eq('job_id', jobId)
          .eq('view_type', 'impression');
        
        if (impressionError) {
          throw new Error(impressionError.message);
        }
        
        // Get detail view count
        const { data: detailData, error: detailError } = await supabase
          .from('job_views')
          .select('*', { count: 'exact' })
          .eq('job_id', jobId)
          .eq('view_type', 'detail');
        
        if (detailError) {
          throw new Error(detailError.message);
        }
        
        setImpressions(impressionData.length || 0);
        setDetailViews(detailData.length || 0);
      } catch (err) {
        console.error('Error fetching job view statistics:', err);
        setError('Failed to load view statistics');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (jobId) {
      fetchJobViewStats();
    }
  }, [jobId]);
  
  return { impressions, detailViews, isLoading, error };
};

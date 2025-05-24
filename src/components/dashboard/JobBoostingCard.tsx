
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Loader2Icon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  status: string;
  boosted_at: string | null;
  created_at: string;
}

const JobBoostingCard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boostingJobId, setBoostingJobId] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchJobs = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status, boosted_at, created_at')
        .eq('company_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user?.id]);

  const canBoostJob = (job: Job) => {
    if (!job.boosted_at) return true;
    
    const boostedDate = new Date(job.boosted_at);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return boostedDate < oneWeekAgo;
  };

  const getNextBoostDate = (job: Job) => {
    if (!job.boosted_at) return null;
    
    const boostedDate = new Date(job.boosted_at);
    const nextBoostDate = new Date(boostedDate);
    nextBoostDate.setDate(nextBoostDate.getDate() + 7);
    
    return nextBoostDate;
  };

  const handleBoostJob = async (jobId: string) => {
    setBoostingJobId(jobId);
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ boosted_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('company_id', user?.id);

      if (error) {
        toast.error('Kunde inte boosta jobbet');
        return;
      }

      toast.success('Jobbet har boostats!');
      fetchJobs(); // Refresh the list
    } catch (error) {
      toast.error('Ett fel uppstod när jobbet skulle boostas');
    } finally {
      setBoostingJobId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Jobbboost
          </CardTitle>
          <CardDescription>Boost dina jobbannonser för bättre synlighet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2Icon className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Jobbboost
        </CardTitle>
        <CardDescription>
          Boost dina jobbannonser för bättre synlighet. Boostade jobb visas högre upp i sökresultat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Inga aktiva jobbannonser att boosta
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const canBoost = canBoostJob(job);
              const nextBoostDate = getNextBoostDate(job);
              
              return (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{job.title}</h4>
                      {job.boosted_at && (
                        <Badge variant="secondary" className="text-xs">
                          Boostad
                        </Badge>
                      )}
                    </div>
                    {!canBoost && nextBoostDate && (
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <Clock className="mr-1 h-3 w-3" />
                        Kan boostas igen: {nextBoostDate.toLocaleDateString('sv-SE')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={canBoost ? "default" : "secondary"}
                    disabled={!canBoost || boostingJobId === job.id}
                    onClick={() => handleBoostJob(job.id)}
                  >
                    {boostingJobId === job.id ? (
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                    ) : canBoost ? (
                      'Boosta'
                    ) : (
                      'Boostad'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobBoostingCard;

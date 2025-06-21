
-- Enable RLS on all tables (already enabled, but ensuring consistency)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posting_limits ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin_user());

-- Jobs policies
CREATE POLICY "Anyone can view approved jobs" ON public.jobs
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Companies can view their own jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = company_id);

CREATE POLICY "Admins can view all jobs" ON public.jobs
  FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Companies can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Companies can update their own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = company_id);

CREATE POLICY "Admins can update all jobs" ON public.jobs
  FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Companies can delete their own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = company_id);

CREATE POLICY "Admins can delete all jobs" ON public.jobs
  FOR DELETE USING (public.is_admin_user());

-- Job views policies (for analytics)
CREATE POLICY "Anyone can create job views" ON public.job_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Job owners can view their job analytics" ON public.job_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id::text = job_views.job_id 
      AND jobs.company_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all job analytics" ON public.job_views
  FOR SELECT USING (public.is_admin_user());

-- Subscribers policies
CREATE POLICY "Users can view their own subscription" ON public.subscribers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscribers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.subscribers
  FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can update all subscriptions" ON public.subscribers
  FOR UPDATE USING (public.is_admin_user());

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Job posting limits policies
CREATE POLICY "Users can view their own limits" ON public.job_posting_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits" ON public.job_posting_limits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own limits" ON public.job_posting_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all limits" ON public.job_posting_limits
  FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can update all limits" ON public.job_posting_limits
  FOR UPDATE USING (public.is_admin_user());


-- First, let's clean up ALL existing policies more thoroughly
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on profiles table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on jobs table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'jobs' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.jobs', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on job_views table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'job_views' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.job_views', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on subscribers table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'subscribers' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscribers', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on user_preferences table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'user_preferences' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_preferences', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on job_posting_limits table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'job_posting_limits' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.job_posting_limits', policy_record.policyname);
    END LOOP;
END
$$;

-- Update the handle_new_user function with correct admin emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, company_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.raw_user_meta_data->>'name', 'Company'),
    CASE 
      WHEN NEW.email IN ('eric@foremp.se', 'kontakt@skillbaseuf.se') THEN 'admin'
      ELSE 'company'
    END
  );
  RETURN NEW;
END;
$$;

-- Create clean, non-conflicting RLS policies

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin_user());

-- Jobs policies
CREATE POLICY "Anyone can view approved jobs" ON public.jobs
  FOR SELECT USING (status = 'approved' OR auth.uid() = company_id OR public.is_admin_user());

CREATE POLICY "Companies can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Companies can update their own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = company_id OR public.is_admin_user());

CREATE POLICY "Companies can delete their own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = company_id OR public.is_admin_user());

-- Job views policies
CREATE POLICY "Anyone can create job views" ON public.job_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Job owners can view their job analytics" ON public.job_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id::text = job_views.job_id 
      AND (jobs.company_id = auth.uid() OR public.is_admin_user())
    )
  );

-- Subscribers policies
CREATE POLICY "Users can view their own subscription" ON public.subscribers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscribers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON public.subscribers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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

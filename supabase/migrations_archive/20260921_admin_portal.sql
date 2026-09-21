-- ============================================================================
-- EXPENSE TRACKER: ADMIN PORTAL & NOTIFICATION SCHEDULER SCHEMA
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ============================================================================

-- 1. Create table for Admin Users Whitelist
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read admin_users to check their own admin status
CREATE POLICY "Allow users to read admin_users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Create table for Scheduled Push Notification Campaigns
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT DEFAULT '/',
  target_audience TEXT DEFAULT 'all', -- 'all', 'inactive_today', 'active_streaks'
  status TEXT DEFAULT 'pending',       -- 'pending', 'processing', 'completed', 'cancelled'
  sent_at TIMESTAMPTZ,
  recipient_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on scheduled_notifications
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage scheduled notifications
CREATE POLICY "Allow authenticated read/write on scheduled_notifications"
  ON public.scheduled_notifications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Create table for Broadcast Delivery Logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all',
  target_url TEXT DEFAULT '/',
  total_recipients INT DEFAULT 0,
  successful_deliveries INT DEFAULT 0,
  failed_deliveries INT DEFAULT 0,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and insert notification logs
CREATE POLICY "Allow authenticated read/write on notification_logs"
  ON public.notification_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Automatically add the current project owner / signed-in user as an admin
-- (If there are existing users, insert the first registered user as admin)
DO $$
BEGIN
  INSERT INTO public.admin_users (user_id, email, role)
  SELECT id, email, 'super_admin'
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1
  ON CONFLICT (email) DO NOTHING;
END $$;

-- 5. Realtime Publication: Enable realtime for admin dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;

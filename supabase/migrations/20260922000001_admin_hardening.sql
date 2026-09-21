-- ============================================================================
-- EXPENSE TRACKER: ADMIN SECURITY HARDENING MIGRATION
-- Migration: 20260922000001_admin_hardening.sql
--
-- PURPOSE:
-- 1. Eliminate privilege escalation vulnerability on public.admin_users where any
--    authenticated user could INSERT or DELETE admin whitelist records.
-- 2. Create a secure, search-path-safe SECURITY DEFINER function public.is_admin()
--    keyed by auth.uid() instead of raw email strings.
-- 3. Lock down all admin-related tables (automated_rules, scheduled_notifications,
--    notification_logs) so only genuine administrators can read or modify them.
-- 4. Restrict public.admin_users so regular users can only read their own row,
--    while write operations (INSERT, UPDATE, DELETE) require existing admin rights.
-- ============================================================================

-- 1. Ensure user_id column exists on admin_users and is backfilled
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from auth.users based on email matching
UPDATE public.admin_users a
SET user_id = u.id
FROM auth.users u
WHERE a.user_id IS NULL 
  AND LOWER(a.email) = LOWER(u.email);

-- Create index on user_id for fast RLS lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- 2. Trigger to automatically sync user_id when admin is added by email
CREATE OR REPLACE FUNCTION public.sync_admin_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    NEW.user_id := (
      SELECT id
      FROM auth.users
      WHERE LOWER(email) = LOWER(NEW.email)
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_user_id ON public.admin_users;
CREATE TRIGGER trg_sync_admin_user_id
  BEFORE INSERT OR UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_user_id();

-- 3. Create SECURITY DEFINER is_admin() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = (SELECT auth.uid())
  );
$$;

-- Restrict execution permissions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- 4. Harden RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop insecure legacy policies
DROP POLICY IF EXISTS "Allow authenticated insert on admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow authenticated delete on admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow users to read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete" ON public.admin_users;

-- New secure policies for admin_users:
-- Admins can view all admins; normal users can only view their own record to verify their role
CREATE POLICY "admin_users_select"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR user_id = (SELECT auth.uid())
  );

-- Only existing admins can insert new administrators
CREATE POLICY "admin_users_insert"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- Only existing admins can update administrator records
CREATE POLICY "admin_users_update"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- Only existing admins can remove administrators
CREATE POLICY "admin_users_delete"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- 5. Harden RLS on automated_rules
ALTER TABLE public.automated_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated insert on automated_rules" ON public.automated_rules;
DROP POLICY IF EXISTS "Allow authenticated read on automated_rules" ON public.automated_rules;
DROP POLICY IF EXISTS "Allow authenticated update on automated_rules" ON public.automated_rules;
DROP POLICY IF EXISTS "Allow authenticated read/write on automated_rules" ON public.automated_rules;
DROP POLICY IF EXISTS "automated_rules_admin_all" ON public.automated_rules;

CREATE POLICY "automated_rules_admin_all"
  ON public.automated_rules
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Harden RLS on scheduled_notifications
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read/write on scheduled_notifications" ON public.scheduled_notifications;
DROP POLICY IF EXISTS "scheduled_notifications_admin_all" ON public.scheduled_notifications;

CREATE POLICY "scheduled_notifications_admin_all"
  ON public.scheduled_notifications
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. Harden RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read/write on notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "notification_logs_admin_all" ON public.notification_logs;

CREATE POLICY "notification_logs_admin_all"
  ON public.notification_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. Confirm user data tables remain strictly user-scoped with RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- ROLLBACK SCRIPT (To restore previous live state if ever needed)
-- ============================================================================
/*
-- 1. Drop hardened admin_users policies
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete" ON public.admin_users;

-- 2. Restore previous admin_users policies
CREATE POLICY "Allow users to read admin_users"
  ON public.admin_users FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on admin_users"
  ON public.admin_users FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on admin_users"
  ON public.admin_users FOR DELETE TO authenticated
  USING (true);

-- 3. Restore automated_rules policies
DROP POLICY IF EXISTS "automated_rules_admin_all" ON public.automated_rules;

CREATE POLICY "Allow authenticated read on automated_rules"
  ON public.automated_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on automated_rules"
  ON public.automated_rules FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on automated_rules"
  ON public.automated_rules FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- 4. Restore scheduled_notifications policy
DROP POLICY IF EXISTS "scheduled_notifications_admin_all" ON public.scheduled_notifications;

CREATE POLICY "Allow authenticated read/write on scheduled_notifications"
  ON public.scheduled_notifications FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 5. Restore notification_logs policy
DROP POLICY IF EXISTS "notification_logs_admin_all" ON public.notification_logs;

CREATE POLICY "Allow authenticated read/write on notification_logs"
  ON public.notification_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 6. Clean up trigger & function
DROP TRIGGER IF EXISTS trg_sync_admin_user_id ON public.admin_users;
DROP FUNCTION IF EXISTS public.sync_admin_user_id();
DROP FUNCTION IF EXISTS public.is_admin();
*/

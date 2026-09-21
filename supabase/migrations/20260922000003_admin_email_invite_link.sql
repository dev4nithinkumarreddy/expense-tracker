-- Migration: Support Admin Invites by Email Prior to Account Signup
-- Description:
--   1. Updates public.is_admin() to check auth.uid() OR auth.jwt() ->> 'email'.
--   2. Adds an auth.users trigger that links admin_users.user_id when the invited email signs up.

-- Step 1: Update is_admin() to support matching by authenticated user ID or verified email claim in JWT
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
       OR (
         email IS NOT NULL 
         AND LOWER(email) = LOWER(auth.jwt() ->> 'email')
       )
  );
END;
$$;

-- Step 2: Trigger function to auto-link admin_users.user_id on signup in auth.users
CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.admin_users
  SET user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

-- Step 3: Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_link_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_link_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_signup();

-- Verification query:
-- SELECT proname, prosrc FROM pg_proc WHERE proname IN ('is_admin', 'handle_admin_signup');

-- ============================================================================
-- ROLLBACK SCRIPT (Run only if you need to revert this migration):
-- ============================================================================
-- DROP TRIGGER IF EXISTS on_auth_user_created_link_admin ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_admin_signup();
-- CREATE OR REPLACE FUNCTION public.is_admin()
-- RETURNS boolean
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = ''
-- AS $$
-- BEGIN
--   RETURN EXISTS (
--     SELECT 1 FROM public.admin_users
--     WHERE user_id = auth.uid()
--   );
-- END;
-- $$;

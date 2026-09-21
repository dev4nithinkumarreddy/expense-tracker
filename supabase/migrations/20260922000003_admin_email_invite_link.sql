-- Migration: Support Admin Invites by Email Prior to Account Signup
-- Description:
--   1. Ensures public.is_admin() evaluates strictly against authenticated user_id.
--   2. Adds an auth.users trigger that links admin_users.user_id only when email is confirmed.
--   3. Handles both standard signups (after email confirmation) and OAuth signups (pre-confirmed).
--   4. Protected with an exception handler so it can never abort or block auth operations.

-- Step 1: Ensure is_admin() matches on user_id only (strict foreign key match)
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
  );
END;
$$;

-- Step 2: Trigger function to link admin_users.user_id upon email confirmation
CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only proceed if the user's email is confirmed and present
  IF NEW.email_confirmed_at IS NOT NULL AND NEW.email IS NOT NULL THEN
    BEGIN
      UPDATE public.admin_users
      SET user_id = NEW.id
      WHERE LOWER(email) = LOWER(NEW.email)
        AND user_id IS NULL;
    EXCEPTION
      WHEN OTHERS THEN
        -- Non-blocking warning: never abort or revert user signup/confirmation
        RAISE WARNING 'handle_admin_signup failed for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Attach trigger to auth.users for both new verified signups (OAuth) and subsequent email confirmations
DROP TRIGGER IF EXISTS on_auth_user_confirmed_link_admin ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_link_admin ON auth.users;

CREATE TRIGGER on_auth_user_confirmed_link_admin
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_signup();

-- Step 4: Backfill any existing confirmed auth users who are pending invite link
UPDATE public.admin_users a
SET user_id = u.id
FROM auth.users u
WHERE LOWER(a.email) = LOWER(u.email)
  AND u.email_confirmed_at IS NOT NULL
  AND a.user_id IS NULL;

-- Verification query:
-- SELECT id, email, user_id, role FROM public.admin_users;

-- ============================================================================
-- ROLLBACK SCRIPT (Run only if you need to revert this migration):
-- ============================================================================
-- DROP TRIGGER IF EXISTS on_auth_user_confirmed_link_admin ON auth.users;
-- DROP TRIGGER IF EXISTS on_auth_user_created_link_admin ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_admin_signup();

-- Migration: Add RLS policies for user_settings table
-- RLS was enabled on user_settings but NO policies were ever created,
-- meaning all SELECT/INSERT/UPDATE/DELETE from authenticated users was silently blocked.
-- This is why settings never synced between devices — upserts failed, reads returned null.

-- Drop any old policies first (idempotent)
DROP POLICY IF EXISTS "user_settings_select" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_delete" ON public.user_settings;
DROP POLICY IF EXISTS "Allow users to manage their own settings" ON public.user_settings;

-- Users can read their own settings row
CREATE POLICY "user_settings_select"
  ON public.user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own settings row
CREATE POLICY "user_settings_insert"
  ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings row
CREATE POLICY "user_settings_update"
  ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings row
CREATE POLICY "user_settings_delete"
  ON public.user_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

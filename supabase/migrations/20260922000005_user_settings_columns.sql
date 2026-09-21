-- Migration: Add missing custom preference columns to public.user_settings
-- Fixes PostgREST error: "Could not find the 'user_name' column of 'user_settings' in the schema cache"

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS privacy_mode BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS category_emojis JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false;

-- Notify PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';

-- Add upi_id to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

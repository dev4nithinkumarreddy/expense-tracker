-- Migration: Add due_day and due_date to public.bills
-- Fixes PostgREST error: "Could not find the 'due_date' column of 'bills' in the schema cache"

ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS due_day INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Notify PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';

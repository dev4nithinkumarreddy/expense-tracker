-- Add expense_id and upi_id to debts table for split bill tracking and UPI requests
ALTER TABLE public.debts
ADD COLUMN IF NOT EXISTS expense_id UUID;

ALTER TABLE public.debts
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

ALTER TABLE public.debts
ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

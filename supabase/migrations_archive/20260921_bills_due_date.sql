-- Add due_day (1-31) and due_date to public.bills for scheduled balance deduction
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS due_day INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS due_date DATE;

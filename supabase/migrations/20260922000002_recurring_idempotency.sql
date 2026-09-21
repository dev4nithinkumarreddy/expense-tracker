-- ============================================================================
-- EXPENSE TRACKER: RECURRING EXPENSES IDEMPOTENCY MIGRATION
-- Migration: 20260922000002_recurring_idempotency.sql
--
-- PURPOSE:
-- 1. Adds `recurring_source_id` foreign key column to public.expenses to link
--    generated recurring expense instances back to their parent recurring template.
-- 2. Adds a partial unique index on (user_id, recurring_source_id, date) to strictly
--    guarantee at the database level that running month rollover twice or from
--    multiple concurrent devices cannot create duplicate expense rows.
-- ============================================================================

-- 1. Add recurring_source_id column to expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurring_source_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL;

-- 2. Partial unique index to enforce idempotency per user, parent recurring expense, and date
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_recurring_dedup 
ON public.expenses(user_id, recurring_source_id, date) 
WHERE recurring_source_id IS NOT NULL;


-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
/*
DROP INDEX IF EXISTS public.idx_expenses_recurring_dedup;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS recurring_source_id;
*/

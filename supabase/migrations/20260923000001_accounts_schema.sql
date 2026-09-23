-- ==============================================================================
-- Migration: 20260923000001_accounts_schema.sql
-- Description: Multi-account tracking (bank, cash, credit card, savings)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'credit_card', 'savings')),
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT '₹',
  color TEXT,
  icon TEXT,
  credit_limit NUMERIC(12, 2),
  statement_day INT CHECK (statement_day >= 1 AND statement_day <= 31),
  due_day INT CHECK (due_day >= 1 AND due_day <= 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Scoped RLS Policies
CREATE POLICY "Users can manage their own accounts"
  ON public.accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add optional account_id and transfer_account_id to expenses table
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

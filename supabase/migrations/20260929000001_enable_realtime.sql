-- ==============================================================================
-- Migration: 20260929000001_enable_realtime.sql
-- Description: Enable Supabase Realtime publication & REPLICA IDENTITY FULL
--              for multi-device instantaneous synchronization
-- ==============================================================================

DO $$
BEGIN
  -- 1. Enable REPLICA IDENTITY FULL on all synchronizable tables
  -- This ensures RLS policies can evaluate old/new rows during UPDATE and DELETE
  ALTER TABLE public.expenses REPLICA IDENTITY FULL;
  ALTER TABLE public.accounts REPLICA IDENTITY FULL;
  ALTER TABLE public.bills REPLICA IDENTITY FULL;
  ALTER TABLE public.budgets REPLICA IDENTITY FULL;
  ALTER TABLE public.user_settings REPLICA IDENTITY FULL;
  ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
  ALTER TABLE public.debts REPLICA IDENTITY FULL;
  ALTER TABLE public.wishlist REPLICA IDENTITY FULL;

  -- 2. Add each table to supabase_realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bills'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'budgets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'debts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'wishlist'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist;
  END IF;

  -- 3. Notify PostgREST to reload its schema cache
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

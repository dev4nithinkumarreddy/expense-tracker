-- Migration: Trips Schema & Trip Association Columns
-- Created: 2026-11-17

-- 1. Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    destination TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT '₹',
    cover_emoji TEXT DEFAULT '🏖️',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('active', 'upcoming', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user lookup and active status
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(user_id, status);

-- 2. Add trip_id column to expenses and debts
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);

ALTER TABLE public.debts
ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_debts_trip_id ON public.debts(trip_id);

-- 3. Enable RLS on trips table
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select" ON public.trips;
CREATE POLICY "trips_select" ON public.trips FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trips_insert" ON public.trips;
CREATE POLICY "trips_insert" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trips_update" ON public.trips;
CREATE POLICY "trips_update" ON public.trips FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trips_delete" ON public.trips;
CREATE POLICY "trips_delete" ON public.trips FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- EXPENSE TRACKER: ADVANCED ADMIN FEATURES MIGRATION
-- Adds: CTR Open Tracking, Automated Smart Rules, Admin Whitelist Management
-- ============================================================================

-- 1. Add opened_count to notification_logs if not exists
ALTER TABLE public.notification_logs 
ADD COLUMN IF NOT EXISTS opened_count INT DEFAULT 0;

-- 2. Create Automated Smart Rules Table (Daily 8:30PM Nudge, Streak Saver, Sunday Wrap-up)
CREATE TABLE IF NOT EXISTS public.automated_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rule_type TEXT NOT NULL UNIQUE, -- 'daily_inactivity', 'streak_saver', 'sunday_wrapup'
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT NOT NULL DEFAULT '/',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  trigger_time TEXT NOT NULL DEFAULT '20:30', -- 'HH:mm'
  last_triggered_at TIMESTAMPTZ
);

-- Enable RLS on automated_rules
ALTER TABLE public.automated_rules ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage automated rules
CREATE POLICY "Allow authenticated read/write on automated_rules"
  ON public.automated_rules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Seed Default Smart Drip Rules
INSERT INTO public.automated_rules (rule_type, name, title, body, target_url, is_enabled, trigger_time)
VALUES 
  (
    'daily_inactivity',
    'Daily 8:30 PM Inactivity Nudge',
    'How did your wallet do today? 💸',
    'Take 30 seconds to log today''s coffee, meals, and purchases before bed.',
    '/expenses',
    false,
    '20:30'
  ),
  (
    'streak_saver',
    'Streak-Saver Shield (9:30 PM)',
    'Don''t break your logging streak! 🔥',
    'You are on a hot streak! Log at least one expense today to keep your streak blazing.',
    '/',
    false,
    '21:30'
  ),
  (
    'sunday_wrapup',
    'Sunday Evening Wrap-up (7:00 PM)',
    'Weekend vibes, mindful spends ✨',
    'Check your weekly spending pacing and upcoming bills before Monday starts.',
    '/analytics',
    false,
    '19:00'
  )
ON CONFLICT (rule_type) DO NOTHING;

-- 4. Enable Full Management of admin_users for Super Admins
CREATE POLICY "Allow authenticated insert on admin_users"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on admin_users"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (true);

-- 5. Realtime Publication: Enable realtime for automated_rules
ALTER PUBLICATION supabase_realtime ADD TABLE public.automated_rules;

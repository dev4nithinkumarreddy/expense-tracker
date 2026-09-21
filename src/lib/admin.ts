import { supabase } from './supabase';

export interface AdminAnalytics {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  totalExpensesCount: number;
  totalPlatformSpend: number;
  totalPushSubscribers: number;
  deviceBreakdown: {
    mobilePwa: number;
    desktop: number;
    other: number;
  };
  hourlyDistribution?: number[];
  platformCategories?: Array<{
    name: string;
    amount: number;
    percent: number;
  }>;
  recentUsers: Array<{
    userId: string;
    email?: string;
    name?: string;
    lastActive?: string;
    expenseCount: number;
    hasPush: boolean;
  }>;
}

export interface UserInspectorDetails {
  id: string;
  email?: string;
  name?: string;
  createdAt?: string;
  lastSignInAt?: string;
  totalSpent: number;
  expenseCount: number;
  averageExpense: number;
  lastExpenseDate: string | null;
  hasPush: boolean;
  pushTokensCount: number;
  topCategories: Array<{
    name: string;
    count: number;
    total: number;
    percent: number;
  }>;
  recentExpenses: Array<{
    id: string;
    title: string;
    amount: number;
    category: string;
    date: string;
  }>;
}

export interface AutomatedRule {
  id: string;
  rule_type: string;
  title: string;
  body: string;
  trigger_time: string;
  target_url: string;
  is_enabled: boolean;
  last_triggered_at?: string | null;
  created_at?: string;
}

export interface AdminMember {
  id: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface ScheduledNotification {
  id: string;
  created_at: string;
  scheduled_at: string;
  title: string;
  body: string;
  target_url: string;
  target_audience: 'all' | 'inactive_today' | 'active_streaks';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  sent_at?: string | null;
  recipient_count?: number;
}

export interface NotificationLog {
  id: string;
  created_at: string;
  title: string;
  body: string;
  target_audience: string;
  target_url: string;
  total_recipients: number;
  successful_deliveries: number;
  failed_deliveries: number;
  opened_count?: number;
}

/**
 * Verifies if the given user is an admin
 */
export async function checkIsAdmin(email?: string | null, userId?: string | null): Promise<boolean> {
  if (!email && !userId) return false;

  const normalizedEmail = (email || '').trim().toLowerCase();

  // 1. Built-in super admin fallback
  const builtInAdmins = [
    'dev4nithinkumarreddyc@gmail.com',
    'dev4nithinkumarreddy@gmail.com'
  ];
  if (normalizedEmail && builtInAdmins.includes(normalizedEmail)) {
    return true;
  }

  // 2. Check if configured in environment variable
  const adminEnv = import.meta.env.VITE_ADMIN_EMAILS || '';
  const adminEmails = adminEnv.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  if (normalizedEmail && adminEmails.includes(normalizedEmail)) {
    return true;
  }

  // 3. Query admin_users table in Supabase
  try {
    let query = supabase.from('admin_users').select('*');
    if (normalizedEmail) {
      query = query.ilike('email', normalizedEmail);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      return true;
    }
  } catch (err) {
    console.warn("Could not query admin_users table:", err);
  }

  return false;
}

/**
 * Fetch platform analytics across all users
 */
export async function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  // First try the Edge Function which runs with service role to bypass user RLS
  try {
    const { data, error } = await supabase.functions.invoke('push-notify', {
      body: { action: 'get_analytics' }
    });
    if (!error && data && typeof data.totalUsers === 'number') {
      return data as AdminAnalytics;
    }
  } catch (err) {
    console.warn("Could not fetch analytics from Edge Function, falling back to direct query:", err);
  }

  const [expensesRes, pushRes, userSettingsRes] = await Promise.all([
    supabase.from('expenses').select('id, user_id, amount, date'),
    supabase.from('push_subscriptions').select('id, user_id, user_agent'),
    supabase.from('user_settings').select('user_id, updated_at')
  ]);

  const expenses = expensesRes.data || [];
  const pushSubs = pushRes.data || [];
  const userSettings = userSettingsRes.data || [];

  // Distinct user IDs
  const allUserIds = new Set<string>();
  expenses.forEach(e => e.user_id && allUserIds.add(e.user_id));
  pushSubs.forEach(p => p.user_id && allUserIds.add(p.user_id));
  userSettings.forEach(u => u.user_id && allUserIds.add(u.user_id));

  // Active dates
  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString();

  const activeTodayIds = new Set<string>();
  const activeThisWeekIds = new Set<string>();

  expenses.forEach(e => {
    if (e.date) {
      if (e.date.startsWith(todayStr)) activeTodayIds.add(e.user_id);
      if (e.date >= sevenDaysAgoStr) activeThisWeekIds.add(e.user_id);
    }
  });

  const totalPlatformSpend = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Device breakdown
  let mobilePwa = 0;
  let desktop = 0;
  let other = 0;

  pushSubs.forEach(sub => {
    const ua = (sub.user_agent || '').toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      mobilePwa++;
    } else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
      desktop++;
    } else {
      other++;
    }
  });

  const pushUsersSet = new Set(pushSubs.map(s => s.user_id));

  // Recent user activity map
  const recentUsers = Array.from(allUserIds).slice(0, 20).map(uid => {
    const userExpenses = expenses.filter(e => e.user_id === uid);
    const lastExpense = userExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    return {
      userId: uid,
      lastActive: lastExpense ? lastExpense.date : undefined,
      expenseCount: userExpenses.length,
      hasPush: pushUsersSet.has(uid)
    };
  });

  return {
    totalUsers: allUserIds.size || (userSettings.length > 0 ? userSettings.length : 1),
    activeToday: activeTodayIds.size,
    activeThisWeek: activeThisWeekIds.size,
    totalExpensesCount: expenses.length,
    totalPlatformSpend,
    totalPushSubscribers: pushSubs.length,
    deviceBreakdown: {
      mobilePwa,
      desktop,
      other
    },
    recentUsers
  };
}

/**
 * Send an immediate custom broadcast push
 */
export async function sendPushBroadcast(payload: {
  title: string;
  body: string;
  url?: string;
  target_audience?: 'all' | 'inactive_today' | 'active_streaks';
  admin_user_id?: string;
}) {
  const { data, error } = await supabase.functions.invoke('push-notify', {
    body: payload
  });

  if (error) {
    throw new Error(error.message || 'Failed to dispatch notification broadcast');
  }

  return data;
}

/**
 * Fetch all scheduled notifications
 */
export async function fetchScheduledNotifications(): Promise<ScheduledNotification[]> {
  const { data, error } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.warn("Could not fetch scheduled notifications:", error);
    return [];
  }
  return data as ScheduledNotification[];
}

/**
 * Create a new scheduled notification campaign
 */
export async function createScheduledNotification(campaign: {
  title: string;
  body: string;
  scheduled_at: string;
  target_url?: string;
  target_audience?: 'all' | 'inactive_today' | 'active_streaks';
  created_by?: string;
}) {
  const { data, error } = await supabase
    .from('scheduled_notifications')
    .insert({
      title: campaign.title,
      body: campaign.body,
      scheduled_at: campaign.scheduled_at,
      target_url: campaign.target_url || '/',
      target_audience: campaign.target_audience || 'all',
      status: 'pending',
      created_by: campaign.created_by || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel or delete a scheduled notification
 */
export async function cancelScheduledNotification(id: string) {
  const { error } = await supabase
    .from('scheduled_notifications')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fetch past delivery history logs
 */
export async function fetchNotificationLogs(): Promise<NotificationLog[]> {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn("Could not fetch notification logs:", error);
    return [];
  }
  return data as NotificationLog[];
}

/**
 * Calculates remaining countdown time formatted as string
 */
export function calculateRemainingTime(scheduledAtIso: string): {
  isDue: boolean;
  formatted: string;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const diffMs = new Date(scheduledAtIso).getTime() - Date.now();
  if (diffMs <= 0) {
    return { isDue: true, formatted: 'Due now', hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = hours > 0 
    ? `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
    : `${pad(minutes)}m ${pad(seconds)}s`;

  return { isDue: false, formatted, hours, minutes, seconds };
}

/**
 * Fetch detailed metrics and recent history for a specific user
 */
export async function fetchUserDetails(userId: string): Promise<UserInspectorDetails | null> {
  try {
    const { data, error } = await supabase.functions.invoke('push-notify', {
      body: { action: 'get_user_details', user_id: userId }
    });
    if (!error && data?.success && data?.user) {
      return data.user as UserInspectorDetails;
    }
  } catch (err) {
    console.warn("Could not fetch user details:", err);
  }
  return null;
}

/**
 * Send a 1-on-1 personalized push notification nudge to a single user
 */
export async function sendDirectUserNudge(userId: string, payload: { title: string; body: string; url?: string; admin_user_id?: string }) {
  const { data, error } = await supabase.functions.invoke('push-notify', {
    body: {
      target_user_id: userId,
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      admin_user_id: payload.admin_user_id
    }
  });
  if (error) {
    throw new Error(error.message || 'Failed to dispatch direct nudge');
  }
  return data;
}

/**
 * Fetch all automated smart drip rules
 */
export async function fetchAutomatedRules(): Promise<AutomatedRule[]> {
  try {
    const { data, error } = await supabase
      .from('automated_rules')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn("Could not fetch automated rules:", error);
      return [];
    }
    return (data || []) as AutomatedRule[];
  } catch (err) {
    console.warn("Error fetching automated rules:", err);
    return [];
  }
}

/**
 * Toggle an automated rule on or off
 */
export async function toggleAutomatedRule(id: string, is_enabled: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('automated_rules')
      .update({ is_enabled })
      .eq('id', id);

    if (error) {
      console.error("Failed to toggle rule:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error toggling rule:", err);
    return false;
  }
}

/**
 * Fetch admin whitelist team members
 */
export async function fetchAdminTeam(): Promise<AdminMember[]> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Could not fetch admin team:", error);
      return [];
    }
    return (data || []) as AdminMember[];
  } catch (err) {
    console.warn("Error fetching admin team:", err);
    return [];
  }
}

/**
 * Add a new admin to whitelist
 */
export async function addAdminMember(email: string, role = 'admin'): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { error } = await supabase
      .from('admin_users')
      .insert({ email: cleanEmail, role });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to add admin' };
  }
}

/**
 * Remove an admin from whitelist
 */
export async function removeAdminMember(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to remove admin' };
  }
}

/**
 * Ping Edge Function to measure real-time latency and service health
 */
export async function pingHealth(): Promise<{ latencyMs: number; status: string; timestamp: string }> {
  const start = performance.now();
  try {
    const { data, error } = await supabase.functions.invoke('push-notify', {
      body: { action: 'ping' }
    });
    const latencyMs = Math.round(performance.now() - start);
    if (!error && data?.status) {
      return { latencyMs, status: data.status, timestamp: data.timestamp || new Date().toISOString() };
    }
    return { latencyMs, status: 'degraded', timestamp: new Date().toISOString() };
  } catch {
    const latencyMs = Math.round(performance.now() - start);
    return { latencyMs, status: 'unreachable', timestamp: new Date().toISOString() };
  }
}


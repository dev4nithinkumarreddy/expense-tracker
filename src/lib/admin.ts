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
  recentUsers: Array<{
    userId: string;
    email?: string;
    name?: string;
    lastActive?: string;
    expenseCount: number;
    hasPush: boolean;
  }>;
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

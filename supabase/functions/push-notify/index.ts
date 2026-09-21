import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import webpush from "https://esm.sh/web-push@3.6.7";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const DEFAULT_CATCHPHRASES = [
  "Did it hurt? When you spent all that money today? 💸 Log it now!",
  "I'm thinking about you... and your wallet. Time to update your expenses! 😉",
  "Don't ghost your budget! Tell me what you spent today. 👻",
  "Are you a loan? Because my interest in you is growing! 📈 Log your spending!",
  "I promise I won't judge your food deliveries... much. 🍕 Add today's expenses!",
  "Your wallet misses you. Come give it some attention! 💳",
  "You're a 10, but your unlogged expenses are a 2. Let's fix that! ✨",
  "Spill the tea ☕ What did you buy today?",
  "Treat yo' self! (But seriously, log it in the app). 🛍️"
];

/**
 * Validates caller's JWT and ensures they have admin privileges in admin_users table
 */
async function authenticateAdmin(req: Request): Promise<{ authorized: boolean; errorResponse?: Response; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      authorized: false,
      errorResponse: new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      authorized: false,
      errorResponse: new Response(JSON.stringify({ error: 'Unauthorized: Missing Bearer token' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    };
  }

  // Allow direct service_role invocation (e.g., cron jobs or server triggers)
  if (supabaseServiceKey && token === supabaseServiceKey) {
    return { authorized: true, userId: 'service_role' };
  }

  // Resolve user from JWT using Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return {
      authorized: false,
      errorResponse: new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    };
  }

  // Check admin status in admin_users table by user_id or email
  const { data: adminById } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  let isAdmin = !!adminById;

  if (!isAdmin && user.email) {
    const { data: adminByEmail } = await supabase
      .from('admin_users')
      .select('id, role')
      .ilike('email', user.email)
      .maybeSingle();

    if (adminByEmail) {
      isAdmin = true;
      // Auto-backfill user_id on match
      await supabase
        .from('admin_users')
        .update({ user_id: user.id })
        .eq('id', adminByEmail.id)
        .is('user_id', null);
    }
  }

  if (!isAdmin) {
    return {
      authorized: false,
      errorResponse: new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      })
    };
  }

  return { authorized: true, userId: user.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let bodyData: any = {};
    if (req.method === 'POST') {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    }

    // -------------------------------------------------------------
    // ACTION: PING / HEALTH CHECK
    // -------------------------------------------------------------
    if (bodyData.action === 'ping') {
      return new Response(JSON.stringify({
        success: true,
        status: 'operational',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // -------------------------------------------------------------
    // ACTION: TRACK CLICK / OPEN (CTR)
    // -------------------------------------------------------------
    if (bodyData.action === 'track_click') {
      if (!bodyData.campaign_id || typeof bodyData.campaign_id !== 'string') {
        return new Response(JSON.stringify({ error: 'Missing or invalid campaign_id' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        });
      }

      try {
        const { data: logItem } = await supabase
          .from('notification_logs')
          .select('id, opened_count')
          .eq('id', bodyData.campaign_id)
          .maybeSingle();

        if (logItem) {
          await supabase
            .from('notification_logs')
            .update({ opened_count: (logItem.opened_count || 0) + 1 })
            .eq('id', bodyData.campaign_id);
        }
      } catch (clickErr) {
        console.warn("Could not increment opened_count:", clickErr);
      }

      return new Response(JSON.stringify({ success: true, tracked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // -------------------------------------------------------------
    // ACTION: GET USER DETAILS (USER INSPECTOR) - ADMIN ONLY
    // -------------------------------------------------------------
    if (bodyData.action === 'get_user_details') {
      const auth = await authenticateAdmin(req);
      if (!auth.authorized) return auth.errorResponse!;

      if (!bodyData.user_id || typeof bodyData.user_id !== 'string') {
        return new Response(JSON.stringify({ error: 'Missing or invalid user_id parameter' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        });
      }

      const targetUid = bodyData.user_id.trim();

      const [expensesRes, userSettingsRes, pushRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', targetUid).order('date', { ascending: false }),
        supabase.from('user_settings').select('*').eq('user_id', targetUid).maybeSingle(),
        supabase.from('push_subscriptions').select('*').eq('user_id', targetUid)
      ]);

      const userExpenses = expensesRes.data || [];
      const userSettings = userSettingsRes.data || null;
      const userPushSubs = pushRes.data || [];

      // Category breakdown
      const categoryMap = new Map<string, { count: number; total: number }>();
      let totalSpent = 0;
      userExpenses.forEach((exp: any) => {
        const cat = exp.category || 'General';
        const amt = Number(exp.amount) || 0;
        totalSpent += amt;
        const current = categoryMap.get(cat) || { count: 0, total: 0 };
        categoryMap.set(cat, { count: current.count + 1, total: current.total + amt });
      });

      const topCategories = Array.from(categoryMap.entries())
        .map(([name, data]) => ({
          name,
          count: data.count,
          total: data.total,
          percent: totalSpent > 0 ? Math.round((data.total / totalSpent) * 100) : 0
        }))
        .sort((a, b) => b.total - a.total);

      // Auth user info
      let authInfo: any = null;
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(targetUid);
        if (userData && userData.user) {
          authInfo = {
            id: userData.user.id,
            email: userData.user.email,
            created_at: userData.user.created_at,
            last_sign_in_at: userData.user.last_sign_in_at,
            name: userData.user.user_metadata?.full_name || userData.user.user_metadata?.name
          };
        }
      } catch (err) {
        console.warn("Could not get auth user:", err);
      }

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: targetUid,
          email: authInfo?.email,
          name: userSettings?.user_name || authInfo?.name || (authInfo?.email ? authInfo.email.split('@')[0] : 'User'),
          createdAt: authInfo?.created_at,
          lastSignInAt: authInfo?.last_sign_in_at,
          totalSpent,
          expenseCount: userExpenses.length,
          averageExpense: userExpenses.length > 0 ? Math.round(totalSpent / userExpenses.length) : 0,
          lastExpenseDate: userExpenses[0]?.date || null,
          hasPush: userPushSubs.length > 0,
          pushTokensCount: userPushSubs.length,
          topCategories,
          recentExpenses: userExpenses.slice(0, 8)
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // -------------------------------------------------------------
    // ACTION: GET ANALYTICS & MACRO CHARTS - ADMIN ONLY
    // -------------------------------------------------------------
    if (bodyData.action === 'get_analytics') {
      const auth = await authenticateAdmin(req);
      if (!auth.authorized) return auth.errorResponse!;

      const [expensesRes, pushRes, userSettingsRes] = await Promise.all([
        supabase.from('expenses').select('id, user_id, amount, date, category'),
        supabase.from('push_subscriptions').select('id, user_id, user_agent'),
        supabase.from('user_settings').select('user_id, updated_at, user_name')
      ]);

      const expenses = expensesRes.data || [];
      const pushSubs = pushRes.data || [];
      const userSettings = userSettingsRes.data || [];

      const allUserIds = new Set<string>();
      expenses.forEach((e: any) => e.user_id && allUserIds.add(e.user_id));
      pushSubs.forEach((p: any) => p.user_id && allUserIds.add(p.user_id));
      userSettings.forEach((u: any) => u.user_id && allUserIds.add(u.user_id));

      const todayStr = new Date().toISOString().slice(0, 10);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      const activeTodayIds = new Set<string>();
      const activeThisWeekIds = new Set<string>();

      // Hourly activity heatmap (24 hours)
      const hourlyDistribution = new Array(24).fill(0);

      // Platform macro category breakdown
      const categoryBreakdownMap = new Map<string, number>();

      expenses.forEach((e: any) => {
        if (e.date) {
          if (e.date.startsWith(todayStr)) activeTodayIds.add(e.user_id);
          if (e.date >= sevenDaysAgoStr) activeThisWeekIds.add(e.user_id);

          try {
            const hour = new Date(e.date).getHours();
            if (hour >= 0 && hour < 24) {
              hourlyDistribution[hour]++;
            }
          } catch {
            // ignore invalid dates
          }
        }

        const cat = e.category || 'Other';
        const amt = Number(e.amount) || 0;
        categoryBreakdownMap.set(cat, (categoryBreakdownMap.get(cat) || 0) + amt);
      });

      const totalPlatformSpend = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      const platformCategories = Array.from(categoryBreakdownMap.entries())
        .map(([name, amount]) => ({
          name,
          amount,
          percent: totalPlatformSpend > 0 ? Math.round((amount / totalPlatformSpend) * 100) : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);

      let mobilePwa = 0;
      let desktop = 0;
      let other = 0;

      pushSubs.forEach((sub: any) => {
        const ua = (sub.user_agent || '').toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
          mobilePwa++;
        } else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
          desktop++;
        } else {
          other++;
        }
      });

      const pushUsersSet = new Set(pushSubs.map((s: any) => s.user_id));

      // Fetch auth users for real names and emails
      const authUserMap = new Map<string, { email?: string; name?: string }>();
      try {
        const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
        if (authData && authData.users) {
          authData.users.forEach((u: any) => {
            authUserMap.set(u.id, {
              email: u.email,
              name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0] : undefined)
            });
            allUserIds.add(u.id);
          });
        }
      } catch (authErr) {
        console.warn("Could not list auth users:", authErr);
      }

      const settingsMap = new Map<string, string>();
      userSettings.forEach((s: any) => {
        if (s.user_id && s.user_name) {
          settingsMap.set(s.user_id, s.user_name);
        }
      });

      const recentUsers = Array.from(allUserIds).slice(0, 30).map(uid => {
        const userExpenses = expenses.filter((e: any) => e.user_id === uid);
        const lastExpense = userExpenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const authInfo = authUserMap.get(uid);
        const customName = settingsMap.get(uid);
        const displayName = customName || authInfo?.name || (authInfo?.email ? authInfo.email.split('@')[0] : undefined);
        
        return {
          userId: uid,
          email: authInfo?.email,
          name: displayName,
          lastActive: lastExpense ? lastExpense.date : undefined,
          expenseCount: userExpenses.length,
          hasPush: pushUsersSet.has(uid)
        };
      });

      return new Response(JSON.stringify({
        totalUsers: allUserIds.size || (userSettings.length > 0 ? userSettings.length : 1),
        activeToday: activeTodayIds.size,
        activeThisWeek: activeThisWeekIds.size,
        totalExpensesCount: expenses.length,
        totalPlatformSpend,
        totalPushSubscribers: pushSubs.length,
        deviceBreakdown: { mobilePwa, desktop, other },
        hourlyDistribution,
        platformCategories,
        recentUsers
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // -------------------------------------------------------------
    // ACTION: SCHEDULED CAMPAIGNS & AUTOMATED DRIP CRON CHECK - ADMIN / SERVICE ROLE
    // -------------------------------------------------------------
    if (bodyData.is_scheduled_check) {
      const auth = await authenticateAdmin(req);
      if (!auth.authorized) return auth.errorResponse!;

      if (!vapidPublicKey || !vapidPrivateKey) {
        throw new Error("Missing VAPID keys in Edge Function secrets");
      }
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

      const now = new Date().toISOString();
      const { data: pendingCampaigns, error: pendingErr } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', now);

      if (pendingErr) throw pendingErr;

      let processedCount = 0;
      for (const campaign of (pendingCampaigns || [])) {
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'processing' })
          .eq('id', campaign.id);

        const result = await dispatchNotification({
          title: campaign.title,
          body: campaign.body,
          url: campaign.target_url || '/',
          targetAudience: campaign.target_audience,
          triggeredBy: campaign.created_by
        });

        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'completed',
            sent_at: new Date().toISOString(),
            recipient_count: result.successful
          })
          .eq('id', campaign.id);

        processedCount++;
      }

      // Check Automated Smart Drips (if enabled)
      try {
        const { data: enabledRules } = await supabase
          .from('automated_rules')
          .select('*')
          .eq('is_enabled', true);

        const currentHour = new Date().getHours();
        const currentMinute = new Date().getMinutes();
        const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

        for (const rule of (enabledRules || [])) {
          // If trigger time matches and hasn't fired in the last 12 hours
          const lastTriggered = rule.last_triggered_at ? new Date(rule.last_triggered_at).getTime() : 0;
          const hoursSinceLast = (Date.now() - lastTriggered) / (1000 * 60 * 60);

          if (hoursSinceLast >= 12 && rule.trigger_time <= currentTimeStr) {
            let audience = 'all';
            if (rule.rule_type === 'daily_inactivity') audience = 'inactive_today';
            if (rule.rule_type === 'streak_saver') audience = 'active_streaks';

            await dispatchNotification({
              title: rule.title,
              body: rule.body,
              url: rule.target_url || '/',
              targetAudience: audience
            });

            await supabase
              .from('automated_rules')
              .update({ last_triggered_at: new Date().toISOString() })
              .eq('id', rule.id);
          }
        }
      } catch (ruleErr) {
        console.warn("Error processing automated smart rules:", ruleErr);
      }

      return new Response(JSON.stringify({ success: true, processedCampaigns: processedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // -------------------------------------------------------------
    // ACTION: IMMEDIATE CUSTOM BROADCAST DISPATCH - ADMIN ONLY
    // -------------------------------------------------------------
    const auth = await authenticateAdmin(req);
    if (!auth.authorized) return auth.errorResponse!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Missing VAPID keys in Edge Function secrets");
    }
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Validate and sanitize broadcast payload
    const title = typeof bodyData.title === 'string' && bodyData.title.trim().length > 0
      ? bodyData.title.trim().slice(0, 200)
      : "Hey there... 👋";
    const body = typeof bodyData.body === 'string' && bodyData.body.trim().length > 0
      ? bodyData.body.trim().slice(0, 1000)
      : DEFAULT_CATCHPHRASES[Math.floor(Math.random() * DEFAULT_CATCHPHRASES.length)];
    const url = typeof bodyData.url === 'string' && bodyData.url.length <= 500
      ? bodyData.url
      : "/";

    const allowedAudiences = ['all', 'inactive_today', 'active_streaks'];
    const targetAudience = allowedAudiences.includes(bodyData.target_audience)
      ? bodyData.target_audience
      : "all";

    const targetUserId = typeof bodyData.target_user_id === 'string' && bodyData.target_user_id.trim().length > 0
      ? bodyData.target_user_id.trim()
      : undefined;

    const result = await dispatchNotification({
      title,
      body,
      url,
      targetAudience,
      targetUserId,
      triggeredBy: auth.userId || bodyData.admin_user_id
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Push notifications dispatched",
      ...result 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Push notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

interface DispatchParams {
  title: string;
  body: string;
  url: string;
  targetAudience?: string;
  targetUserId?: string;
  triggeredBy?: string;
}

async function dispatchNotification({ title, body, url, targetAudience = 'all', targetUserId, triggeredBy }: DispatchParams) {
  let query = supabase.from('push_subscriptions').select('*');

  if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  }

  const { data: subs, error: subsError } = await query;
  if (subsError) throw subsError;

  let targetSubs = subs || [];

  // Segmentation: Inactive today (users who have not logged any expense today)
  if (targetAudience === 'inactive_today' && targetSubs.length > 0) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: activeTodayExpenses } = await supabase
      .from('expenses')
      .select('user_id')
      .gte('date', `${todayStr}T00:00:00.000Z`);

    const activeUserIds = new Set((activeTodayExpenses || []).map((e: any) => e.user_id));
    targetSubs = targetSubs.filter(s => !activeUserIds.has(s.user_id));
  }

  // First create campaign entry in notification_logs to get the campaign_id
  let campaignId: string | null = null;
  try {
    const { data: logEntry } = await supabase
      .from('notification_logs')
      .insert({
        title,
        body,
        target_audience: targetUserId ? `direct:${targetUserId}` : targetAudience,
        target_url: url,
        total_recipients: targetSubs.length,
        successful_deliveries: 0,
        failed_deliveries: 0,
        opened_count: 0,
        triggered_by: triggeredBy || null
      })
      .select('id')
      .single();

    if (logEntry) {
      campaignId = logEntry.id;
    }
  } catch (logErr) {
    console.warn("Could not pre-write notification log:", logErr);
  }

  // Payload includes campaign_id so service worker can track CTR
  const payload = JSON.stringify({
    title,
    body,
    url,
    campaign_id: campaignId
  });

  let successful = 0;
  let failed = 0;

  const sendPromises = targetSubs.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys_p256dh,
        auth: sub.keys_auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
      successful++;
    } catch (error: any) {
      failed++;
      if (error.statusCode === 404 || error.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id);
      } else {
        console.error(`Error sending push to ${sub.endpoint}:`, error);
      }
    }
  });

  await Promise.all(sendPromises);

  // Update notification_logs with delivery counts
  if (campaignId) {
    try {
      await supabase
        .from('notification_logs')
        .update({
          successful_deliveries: successful,
          failed_deliveries: failed
        })
        .eq('id', campaignId);
    } catch (updateErr) {
      console.warn("Could not update notification log:", updateErr);
    }
  }

  return {
    campaignId,
    totalRecipients: targetSubs.length,
    successful,
    failed
  };
}

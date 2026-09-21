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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Missing VAPID keys in Edge Function secrets");
    }
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    let bodyData: any = {};
    if (req.method === 'POST') {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    }

    // 1. Check if this is a scheduled cron worker dispatch
    if (bodyData.is_scheduled_check) {
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

      return new Response(JSON.stringify({ success: true, processedCampaigns: processedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Immediate Custom Broadcast Dispatch
    const title = bodyData.title || "Hey there... 👋";
    const body = bodyData.body || DEFAULT_CATCHPHRASES[Math.floor(Math.random() * DEFAULT_CATCHPHRASES.length)];
    const url = bodyData.url || "/";
    const targetAudience = bodyData.target_audience || "all";
    const targetUserId = bodyData.target_user_id;

    const result = await dispatchNotification({
      title,
      body,
      url,
      targetAudience,
      targetUserId,
      triggeredBy: bodyData.admin_user_id
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

  const payload = JSON.stringify({
    title,
    body,
    url
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

  // Log campaign to notification_logs table
  try {
    await supabase.from('notification_logs').insert({
      title,
      body,
      target_audience: targetAudience,
      target_url: url,
      total_recipients: targetSubs.length,
      successful_deliveries: successful,
      failed_deliveries: failed,
      triggered_by: triggeredBy || null
    });
  } catch (logErr) {
    console.warn("Could not write notification log:", logErr);
  }

  return {
    totalRecipients: targetSubs.length,
    successful,
    failed
  };
}

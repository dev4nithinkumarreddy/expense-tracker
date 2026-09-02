import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import webpush from "https://esm.sh/web-push@3.6.7";

// Environment variables provided by Supabase Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Missing VAPID keys in Edge Function secrets");
    }
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // This could be triggered by pg_cron or manually
    // For now, let's just fetch all bills due tomorrow and notify

    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*, user_id');

    if (billsError) throw billsError;

    // A real app would check if the bill is due tomorrow based on date.
    // Assuming we found bills to notify...
    
    // For testing, let's just grab all subscriptions and send a test push
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*');
      
    if (subsError) throw subsError;

    const payload = JSON.stringify({
      title: "Expense Tracker",
      body: "This is a test notification from the Edge Function!",
      url: "/planned"
    });

    const sendPromises = subs.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (error: any) {
        // If subscription is invalid/expired (404/410), delete it
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

    return new Response(JSON.stringify({ success: true, message: "Notifications processed" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

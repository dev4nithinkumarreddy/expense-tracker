import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useExpenseStore } from '../store/useExpenseStore';

// Note: Replace this with your actual VAPID public key
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBtc3sOEJp_r-o9N_pYk3nTwk';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const { session } = useExpenseStore();

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
          setLoading(false);
        });
      });
    } else {
      setLoading(false);
    }
  }, []);

  const subscribe = async () => {
    if (!isSupported || !session) return false;
    
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Unsubscribe existing first if any
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY
      });

      const subData = JSON.parse(JSON.stringify(subscription));

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        endpoint: subData.endpoint,
        keys_p256dh: subData.keys.p256dh,
        keys_auth: subData.keys.auth
      }, { onConflict: 'endpoint' });

      if (error) {
        console.error('Error saving subscription to Supabase:', error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error('Failed to subscribe:', e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported || !session) return;
    
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
      }
      setIsSubscribed(false);
    } catch (e) {
      console.error('Failed to unsubscribe:', e);
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe
  };
}

/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

cleanupOutdatedCaches();

precacheAndRoute((self as any).__WB_MANIFEST || []);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/icon.png',
        badge: '/icon.png',
        data: {
          url: data.url || '/',
          campaign_id: data.campaign_id || null
        }
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (e) {
      console.error('Error parsing push payload', e);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetPath = event.notification.data?.url || '/';
  const campaignId = event.notification.data?.campaign_id;
  const targetUrl = new URL(targetPath, self.location.origin).href;

  // Track CTR Open in background (non-blocking)
  if (campaignId) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      fetch(`${supabaseUrl}/functions/v1/push-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ action: 'track_click', campaign_id: campaignId })
      }).catch(() => {});
    } catch {
      // Ignore background tracking failure
    }
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      // 1. If an app window/tab is already open, navigate it to targetUrl and bring to focus
      for (const client of windowClients) {
        if ('navigate' in client && 'focus' in client) {
          try {
            const navClient = await client.navigate(targetUrl);
            if (navClient && 'focus' in navClient) {
              return navClient.focus();
            }
            return client.focus();
          } catch {
            return client.focus();
          }
        }
      }
      // 2. If no window is open, open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/// <reference types="vite-plugin-pwa/client" />
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { RefreshCcw, X } from 'lucide-react';
import { useExpenseStore } from '../store/useExpenseStore';

import { useEffect } from 'react';

export function ReloadPrompt() {
  const { isModalOpen } = useExpenseStore();

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      if (r) {
        // Eagerly probe for updates on registration
        r.update();

        // Probe for updates when tab becomes visible
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            r.update();
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Regular periodic probe every 15 minutes
        const intervalId = setInterval(() => {
          r.update();
        }, 15 * 60 * 1000);

        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          clearInterval(intervalId);
        };
      }
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const hadController = Boolean(navigator.serviceWorker.controller);
      let refreshing = false;

      const handleControllerChange = () => {
        if (hadController && !refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if ((!offlineReady && !needRefresh) || isModalOpen) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 animate-in slide-in-from-top-4">
      <Card className="w-full max-w-sm border shadow-lg bg-popover text-popover-foreground rounded-xl">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="text-sm font-medium flex-1">
            {needRefresh ? (
              <span className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-primary animate-spin" />
                New update available!
              </span>
            ) : (
              <span>App ready to work offline.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {needRefresh && (
              <Button size="sm" onClick={() => updateServiceWorker(true)}>
                Reload
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={close}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

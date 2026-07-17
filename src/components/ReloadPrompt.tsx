/// <reference types="vite-plugin-pwa/client" />
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { RefreshCcw, X } from 'lucide-react';

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-10">
      <Card className="w-full max-w-sm border-primary/50 shadow-lg bg-card/95 backdrop-blur">
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

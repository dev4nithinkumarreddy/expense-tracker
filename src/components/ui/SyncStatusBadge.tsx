import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff, RefreshCw, Check } from "lucide-react";
import { useExpenseStore } from "../../store/useExpenseStore";
import { vibrate, cn } from "../../lib/utils";
import { playTapSound } from "../../lib/sound";

interface SyncStatusBadgeProps {
  className?: string;
  showText?: boolean;
}

export function SyncStatusBadge({ className, showText = true }: SyncStatusBadgeProps) {
  const { pendingMutations = [], isSyncing, fetchCloudData, syncPendingMutations, settings, session } = useExpenseStore();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingMutations();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingMutations]);

  if (!session) return null;

  const handleManualSync = () => {
    vibrate(10);
    if (settings.soundEnabled) playTapSound();
    if (isOnline) {
      syncPendingMutations();
      fetchCloudData();
    }
  };

  const pendingCount = pendingMutations.length;

  return (
    <div className={cn("inline-flex items-center select-none", className)}>
      <AnimatePresence mode="wait">
        {!isOnline ? (
          <motion.div
            key="offline"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            title="You're offline. New transactions are safely saved locally and will sync automatically."
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-2xs"
          >
            <CloudOff className="w-3 h-3 stroke-[2.2]" />
            {showText && (
              <span>
                Offline{pendingCount > 0 ? ` (${pendingCount} queued)` : ''}
              </span>
            )}
          </motion.div>
        ) : isSyncing || pendingCount > 0 ? (
          <motion.button
            key="syncing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={handleManualSync}
            title={pendingCount > 0 ? `Syncing ${pendingCount} local updates to cloud...` : "Refreshing workspace..."}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 shadow-2xs cursor-pointer active:scale-95 transition-all"
          >
            <RefreshCw className="w-3 h-3 stroke-[2.2] animate-spin" />
            {showText && (
              <span>
                {pendingCount > 0 ? `Syncing (${pendingCount})...` : 'Syncing...'}
              </span>
            )}
          </motion.button>
        ) : (
          <motion.button
            key="synced"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={handleManualSync}
            title="All changes synced to cloud. Tap to refresh."
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/50 transition-all cursor-pointer active:scale-95 select-none shadow-2xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {showText && (
              <span className="flex items-center gap-1">
                <Check className="w-2.5 h-2.5 text-emerald-500 stroke-[3]" />
                Synced
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { useExpenseStore } from "../../store/useExpenseStore";
import { vibrate, cn } from "../../lib/utils";
import { playTapSound } from "../../lib/sound";

interface SyncStatusBadgeProps {
  className?: string;
  showText?: boolean;
}

export function SyncStatusBadge({ className, showText = true }: SyncStatusBadgeProps) {
  const {
    pendingMutations = [],
    isSyncing,
    lastSyncSuccess,
    lastSyncError,
    fetchCloudData,
    syncPendingMutations,
    settings,
    session
  } = useExpenseStore();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      (async () => {
        await syncPendingMutations();
        await fetchCloudData();
      })();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingMutations, fetchCloudData]);

  const handleManualSync = async () => {
    vibrate(10);
    if (settings.soundEnabled) playTapSound();
    if (isOnline) {
      await syncPendingMutations();
      await fetchCloudData();
    }
  };

  const pendingCount = pendingMutations.length;

  return (
    <div className={cn("inline-flex items-center select-none", className)}>
      <AnimatePresence mode="wait">
        {/* 1. Gray / Local only: when session === null */}
        {!session ? (
          <motion.div
            key="local-only"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            title="Not signed in. Data is saved locally on this device only."
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/50 shadow-2xs"
          >
            <Cloud className="w-3 h-3 stroke-[2.2] opacity-70" />
            {showText && <span>Local only</span>}
          </motion.div>
        ) : !isOnline ? (
          /* 2. Amber / Offline */
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
                Offline{pendingCount > 0 ? ` (${pendingCount} pending)` : ''}
              </span>
            )}
          </motion.div>
        ) : isSyncing ? (
          /* 3. Yellow / Syncing... */
          <motion.button
            key="syncing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={handleManualSync}
            title={pendingCount > 0 ? `Syncing ${pendingCount} local updates to cloud...` : "Syncing with cloud..."}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shadow-2xs cursor-pointer active:scale-95 transition-all"
          >
            <RefreshCw className="w-3 h-3 stroke-[2.2] animate-spin" />
            {showText && (
              <span>
                {pendingCount > 0 ? `Syncing (${pendingCount})...` : 'Syncing...'}
              </span>
            )}
          </motion.button>
        ) : lastSyncError ? (
          /* 4. Red / Sync error */
          <motion.button
            key="sync-error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={handleManualSync}
            title={`Sync error: ${lastSyncError}. Tap to retry.`}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 shadow-2xs cursor-pointer active:scale-95 transition-all"
          >
            <AlertCircle className="w-3 h-3 stroke-[2.2]" />
            {showText && <span>Sync error</span>}
          </motion.button>
        ) : pendingCount > 0 ? (
          /* 5. Amber / N pending */
          <motion.button
            key="pending"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={handleManualSync}
            title={`${pendingCount} local updates waiting to sync to cloud. Tap to sync.`}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-2xs cursor-pointer active:scale-95 transition-all"
          >
            <Cloud className="w-3 h-3 stroke-[2.2]" />
            {showText && <span>{pendingCount} pending</span>}
          </motion.button>
        ) : lastSyncSuccess !== null ? (
          /* 6. Green / Synced: session !== null && !isSyncing && pendingCount === 0 && lastSyncSuccess !== null */
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {showText && (
              <span className="flex items-center gap-1">
                <Check className="w-2.5 h-2.5 text-emerald-500 stroke-[3]" />
                Synced
              </span>
            )}
          </motion.button>
        ) : (
          /* 7. Yellow fallback / Initializing */
          <motion.div
            key="connecting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            title="Connecting to cloud..."
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 shadow-2xs"
          >
            <RefreshCw className="w-3 h-3 stroke-[2.2] animate-spin" />
            {showText && <span>Connecting...</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

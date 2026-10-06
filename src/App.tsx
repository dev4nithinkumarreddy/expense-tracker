import { useEffect, useState, Suspense, lazy } from "react";
import { BrowserRouter } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { useExpenseStore } from "./store/useExpenseStore";
import { supabase } from "./lib/supabase";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import Auth from "./pages/Auth";
import { ReloadPrompt } from "./components/ReloadPrompt";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { SplitBillModal } from "./components/split/SplitBillModal";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster, toast } from "sonner";
import { AnimatedRoutes } from "./components/AnimatedRoutes";
import { AmbientBackground } from "./components/ui/AmbientBackground";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { isThisMonth, isToday, parseISO } from "date-fns";
import { formatCurrency } from "./lib/formatCurrency";

import { SecurityLockOverlay } from "./components/ui/SecurityLockOverlay";
import { NotificationPrompt } from "./components/notifications/NotificationPrompt";

const PayLandingPage = lazy(() => import("./pages/PayLandingPage"));

// Module-scoped in-flight lock for sequential sync passes
let isSyncPassInProgress = false;
let syncPassQueued = false;

const runSequentialSync = async () => {
  if (isSyncPassInProgress) {
    syncPassQueued = true;
    return;
  }
  isSyncPassInProgress = true;
  try {
    const { syncPendingMutations, fetchCloudData } = useExpenseStore.getState();
    await syncPendingMutations();
    await fetchCloudData();
  } catch (err) {
    console.error("[Sync] Sequential sync failed:", err);
  } finally {
    isSyncPassInProgress = false;
    if (syncPassQueued) {
      syncPassQueued = false;
      runSequentialSync();
    }
  }
};

export default function App() {
  const { settings, checkMonthRollover, setSession, session, isModalOpen, setModalOpen } = useExpenseStore();
  const [loading, setLoading] = useState(true);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        runSequentialSync();
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession) {
        runSequentialSync();
      } else if (event === 'SIGNED_OUT') {
        const { pendingMutations, clearData } = useExpenseStore.getState();
        if (pendingMutations && pendingMutations.length > 0) {
          console.warn(`[Auth] User signed out with ${pendingMutations.length} pending mutations. Preserving local IndexedDB data.`);
          toast.warning(`You have ${pendingMutations.length} unsynced changes. Local data is preserved.`, {
            id: 'signout-pending-warning',
            duration: 6000
          });
        } else {
          console.log("[Auth] User signed out with empty mutation queue. Clearing local state.");
          await clearData();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    if (session) {
      checkMonthRollover();
    }
  }, [checkMonthRollover, session]);

  useEffect(() => {
    const handleOnline = () => {
      runSequentialSync();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Live Cross-Device Realtime Synchronization
  useEffect(() => {
    if (!session?.user?.id) return;

    const channelName = `device-sync-${session.user.id}`;
    const tables = ['expenses', 'accounts', 'bills', 'budgets', 'user_settings', 'subscriptions', 'debts', 'wishlist'];
    
    let channel = supabase.channel(channelName);

    // 1. Instant peer-to-peer broadcast from other devices
    channel = channel.on('broadcast', { event: 'data_changed' }, () => {
      runSequentialSync();
    });

    // 2. Realtime Postgres DB changes per table
    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${session.user.id}`
        },
        () => {
          runSequentialSync();
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Sync on App Resume / Tab Focus (Mobile & Desktop) & Periodic Liveness
  useEffect(() => {
    if (!session) return;

    const handleSyncOnResume = () => {
      if (document.visibilityState === 'visible') {
        runSequentialSync();
      }
    };

    document.addEventListener('visibilitychange', handleSyncOnResume);
    window.addEventListener('focus', handleSyncOnResume);

    // Heartbeat sync every 30s when online and app is open
    const interval = setInterval(() => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        runSequentialSync();
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleSyncOnResume);
      window.removeEventListener('focus', handleSyncOnResume);
      clearInterval(interval);
    };
  }, [session]);

  // Intercept Web Share Target API & PWA Shortcuts
  useEffect(() => {
    if (session || settings.isGuestMode) {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedTitle = urlParams.get('title');
      const sharedText = urlParams.get('text');
      const sharedUrl = urlParams.get('url');
      const action = urlParams.get('action');
      
      if (sharedTitle || sharedText || sharedUrl) {
        // Clean URL to prevent re-triggering on refresh
        window.history.replaceState({}, document.title, '/');
        
        // Open modal with pre-filled data
        useExpenseStore.getState().setSharedData({
          title: sharedTitle || undefined,
          text: sharedText || undefined,
          url: sharedUrl || undefined
        });
        setModalOpen(true);
      } else if (action === 'add-expense') {
        window.history.replaceState({}, document.title, '/');
        setModalOpen(true);
      } else if (action === 'paste-sms') {
        window.history.replaceState({}, document.title, '/');
        if (navigator.clipboard?.readText) {
          navigator.clipboard.readText().then((clipText) => {
            if (clipText && clipText.trim()) {
              useExpenseStore.getState().setSharedData({ text: clipText });
            }
            setModalOpen(true);
          }).catch(() => {
            setModalOpen(true);
          });
        } else {
          setModalOpen(true);
        }
      } else if (action === 'split-bill') {
        window.history.replaceState({}, document.title, '/');
        setIsSplitModalOpen(true);
      } else if (action === 'scan-receipt') {
        window.history.replaceState({}, document.title, '/');
        useExpenseStore.getState().setShouldTriggerScan(true);
        setModalOpen(true);
      } else if (action === 'today') {
        window.history.replaceState({}, document.title, '/');
        setTimeout(() => {
          const storeState = useExpenseStore.getState();
          const todayExpenses = storeState.expenses
            .filter(e => isThisMonth(parseISO(e.date)) && isToday(parseISO(e.date)) && e.category !== 'Income' && e.category !== 'Transfer')
            .reduce((sum, e) => sum + e.amount, 0);
          toast.info(`Today's Spend: ${formatCurrency(todayExpenses, storeState.settings.currency)}`, {
            description: "Here's your spending summary for today."
          });
        }, 300);
      }
    }
  }, [session, settings.isGuestMode, setModalOpen]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Clear all theme classes
    const classesToRemove = Array.from(root.classList).filter(c => c.startsWith('theme-'));
    classesToRemove.forEach(c => root.classList.remove(c));
    
    if (settings.theme && settings.theme !== 'default') {
      root.classList.add(`theme-${settings.theme}`);
    }

    // Keep mobile status bar theme-color matching app theme
    const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
    themeColorMetas.forEach(meta => {
      meta.setAttribute('content', settings.darkMode ? '#09090b' : '#ffffff');
    });
  }, [settings.darkMode, settings.theme]);

  const isPayRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/pay');

  if (isPayRoute) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background text-foreground relative flex items-center justify-center p-3 sm:p-4">
          <AmbientBackground />
          <Suspense fallback={<LoadingScreen message="Loading Payment..." />}>
            <PayLandingPage />
          </Suspense>
          <Toaster 
            theme={settings.darkMode ? "dark" : "light"} 
            position="top-center" 
            richColors 
          />
        </div>
      </ErrorBoundary>
    );
  }

  if (loading) {
    return <LoadingScreen fullScreen message="Expense Tracker" submessage="Syncing your workspace..." />;
  }

  if (!session && !settings.isGuestMode) {
    return (
      <>
        <ReloadPrompt />
        <Auth />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground pb-[max(6rem,calc(env(safe-area-inset-bottom,0px)+5.5rem))] [overflow-x:clip] relative">
            {/* Top Safe Area Status Bar Frosted Cover */}
            <div 
              className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top,0px)] bg-background/85 dark:bg-background/85 backdrop-blur-xl z-40 pointer-events-none transition-colors border-b border-border/10" 
              aria-hidden="true" 
            />
            <AmbientBackground />
            <main className="container max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3.5 sm:px-4 lg:px-8 pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-3 sm:pb-4 lg:pb-6 animate-in fade-in duration-300">
              <AnimatedRoutes />
            </main>
        
            <AddExpenseModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
            <SplitBillModal 
              isOpen={isSplitModalOpen} 
              onClose={() => setIsSplitModalOpen(false)} 
            />
            <ReloadPrompt />
            <NotificationPrompt />
            <Toaster 
              theme={settings.darkMode ? "dark" : "light"} 
              position="top-center" 
              offset="max(1rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))"
              duration={3000}
              richColors
            />
            <SecurityLockOverlay />
            <BottomNav />
            <VercelAnalytics />
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

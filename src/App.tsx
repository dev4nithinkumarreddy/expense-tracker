import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { useExpenseStore } from "./store/useExpenseStore";
import { supabase } from "./lib/supabase";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import Auth from "./pages/Auth";
import { ReloadPrompt } from "./components/ReloadPrompt";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "sonner";
import { AnimatedRoutes } from "./components/AnimatedRoutes";
import { AmbientBackground } from "./components/ui/AmbientBackground";

export default function App() {
  const { settings, checkMonthRollover, setSession, session, fetchCloudData, syncPendingMutations, isModalOpen, setModalOpen } = useExpenseStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        syncPendingMutations();
        fetchCloudData();
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        syncPendingMutations();
        fetchCloudData();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, fetchCloudData, syncPendingMutations]);

  useEffect(() => {
    if (session) {
      checkMonthRollover();
    }
  }, [checkMonthRollover, session]);

  useEffect(() => {
    const handleOnline = () => {
      syncPendingMutations();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPendingMutations]);

  // Intercept Web Share Target API
  useEffect(() => {
    if (session) {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedTitle = urlParams.get('title');
      const sharedText = urlParams.get('text');
      const sharedUrl = urlParams.get('url');
      
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
      }
    }
  }, [session, setModalOpen]);

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
  }, [settings.darkMode, settings.theme]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground pb-24 overflow-x-hidden relative">
            <AmbientBackground />
            <main className="container max-w-md md:max-w-xl lg:max-w-2xl mx-auto p-4 animate-in fade-in duration-300">
              <AnimatedRoutes />
            </main>
        
            <AddExpenseModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
            <ReloadPrompt />
            <Toaster theme={settings.darkMode ? "dark" : "light"} position="bottom-center" />
            <BottomNav />
            <VercelAnalytics />
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

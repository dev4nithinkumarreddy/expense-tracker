import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { useExpenseStore } from "./store/useExpenseStore";
import { supabase } from "./lib/supabase";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import Auth from "./pages/Auth";
import { ReloadPrompt } from "./components/ReloadPrompt";
import { Plus } from "lucide-react";
import { AddExpenseModal } from "./components/AddExpenseModal";

// Pages
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Bills from "./pages/Bills";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

export default function App() {
  const { settings, checkMonthRollover, setSession, session, fetchCloudData } = useExpenseStore();
  const [loading, setLoading] = useState(true);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) fetchCloudData();
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) fetchCloudData();
    });

    return () => subscription.unsubscribe();
  }, [setSession, fetchCloudData]);

  useEffect(() => {
    if (session) {
      checkMonthRollover();
    }
  }, [checkMonthRollover, session]);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground pb-20 overflow-x-hidden">
        <main className="container max-w-md mx-auto p-4 animate-in fade-in duration-300">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        
        {/* Global Floating Action Button */}
        <button 
          onClick={() => setIsGlobalModalOpen(true)}
          className="fixed bottom-28 right-4 sm:right-auto sm:left-1/2 sm:ml-[160px] w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
        <AddExpenseModal isOpen={isGlobalModalOpen} onClose={() => setIsGlobalModalOpen(false)} />

        <ReloadPrompt />
        <BottomNav />
        <VercelAnalytics />
      </div>
    </BrowserRouter>
  );
}

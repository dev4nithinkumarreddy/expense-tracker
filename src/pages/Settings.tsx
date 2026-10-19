import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useExpenseStore } from "../store/useExpenseStore";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Moon, Sun, Download, Upload, RefreshCcw, Plus, Trash2, X,
  FileSpreadsheet, GripVertical, Volume2, VolumeX, ShieldCheck,
  ChevronRight, Printer, Share2, Copy, Check, Shield,
  CheckCircle2, SlidersHorizontal, Layers, Database, MoreHorizontal,
  Bell, LogOut, AlertTriangle
} from "lucide-react";
import TouchAppOutlined from "@mui/icons-material/TouchAppOutlined";
import NotificationsActiveOutlined from "@mui/icons-material/NotificationsActiveOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { CategoryIcon } from "../components/ui/CategoryIcon";
import { Button } from "../components/ui/button";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { Reorder, useDragControls, motion, AnimatePresence } from "framer-motion";
import { vibrate } from "../lib/utils";
import { playSuccessSound, playTapSound, playDeleteSound } from "../lib/sound";
import { RecentlyDeletedModal } from "../components/RecentlyDeletedModal";
import { checkIsAdmin } from "../lib/admin";
import { BadgeCabinet } from "../components/analytics/BadgeCabinet";
import { PrintableStatementModal } from "../components/analytics/PrintableStatementModal";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { toast } from "sonner";

const COMMON_EMOJIS = ["🍔", "🚗", "🏠", "🛒", "✈️", "👗", "💊", "🎉", "🎮", "📚", "🐶", "☕", "📱", "🎁", "💡", "💰", "💪", "🎬"];

type SettingsTab = "general" | "categories" | "data" | "more";

interface CategoryRowItemProps {
  category: string;
  currency: string;
  emoji?: string;
  monthlyLimit: number | "";
  editingEmoji: boolean;
  onToggleEmoji: () => void;
  onBudgetChange: (val: string) => void;
  onDelete: () => void;
  onEmojiSelect: (emoji: string) => void;
}

function CategoryRowItem({
  category,
  currency,
  emoji,
  monthlyLimit,
  editingEmoji,
  onToggleEmoji,
  onBudgetChange,
  onDelete,
  onEmojiSelect
}: CategoryRowItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 50 }}
      className="flex flex-col gap-2 bg-secondary/50 p-2.5 rounded-2xl border border-border/50 shadow-xs select-none"
    >
      <div className="flex items-center gap-2">
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab active:cursor-grabbing p-1 -ml-0.5 text-muted-foreground hover:text-foreground touch-none rounded-lg transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <button 
          onClick={onToggleEmoji}
          className="w-9 h-9 flex items-center justify-center bg-background rounded-xl border border-border/60 shadow-xs hover:bg-muted transition-colors text-lg cursor-pointer"
        >
          {emoji || category.substring(0, 2).toUpperCase()}
        </button>
        <span className="flex-1 font-semibold text-sm truncate">{category}</span>
        <div className="relative w-28 shrink-0">
          <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">{currency}</span>
          <Input 
            type="text" 
            inputMode="decimal"
            placeholder="Limit (opt)" 
            className="h-8 text-xs pl-6 bg-background rounded-xl"
            value={monthlyLimit}
            onChange={(e) => onBudgetChange(e.target.value)}
          />
        </div>
        <button 
          onClick={onDelete} 
          className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg transition-colors cursor-pointer"
          title="Delete category"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {editingEmoji && (
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 mt-1 p-2 bg-background rounded-xl border border-border/60 animate-in slide-in-from-top-2">
          {COMMON_EMOJIS.map(itemEmoji => (
            <button
              key={itemEmoji}
              onClick={() => onEmojiSelect(itemEmoji)}
              className="w-8 h-8 flex items-center justify-center hover:bg-secondary rounded-lg text-lg transition-colors cursor-pointer"
            >
              {itemEmoji}
            </button>
          ))}
        </div>
      )}
    </Reorder.Item>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const {
    settings,
    updateSettings,
    addCategory,
    deleteCategory,
    reorderCategories,
    eraseAllData,
    expenses,
    bills,
    session,
    budgets,
    updateBudget,
    recentlyDeleted = [],
    accounts = [],
    subscriptions = [],
    debts = [],
    wishlistItems = []
  } = useExpenseStore();
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [editingEmojiFor, setEditingEmojiFor] = useState<string | null>(null);
  const [isRecentlyDeletedOpen, setIsRecentlyDeletedOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const getAppShareUrl = () => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/`;
    }
    return "https://expense-tracker-captain12.vercel.app/";
  };

  const currentHost = typeof window !== 'undefined' && window.location?.host 
    ? window.location.host 
    : "expense-tracker-captain12.vercel.app";

  const copyToClipboard = async () => {
    vibrate(15);
    if (settings.soundEnabled) playSuccessSound();
    const shareUrl = getAppShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShareApp = async () => {
    vibrate(15);
    if (settings.soundEnabled) playTapSound();
    const shareUrl = getAppShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Expense Tracker",
          text: "Check out this fluid Expense Tracker to manage your spending, budgets, and liquid wealth!",
          url: shareUrl,
        });
        toast.success("Thanks for sharing!");
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  useEffect(() => {
    if (session?.user?.email || session?.user?.id) {
      checkIsAdmin(session.user.email, session.user.id).then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [session]);
  
  // Quick Add states
  const [qaName, setQaName] = useState("");
  const [qaAmount, setQaAmount] = useState("");
  const [qaCategory, setQaCategory] = useState(settings.categories[0] || "");
  const [qaIcon, setQaIcon] = useState("coffee");

  const handleExport = () => {
    vibrate(10);
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses,
      bills,
      settings,
      budgets,
      accounts,
      subscriptions,
      debts,
      wishlistItems
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded successfully!");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          toast.error("Invalid backup file format");
          return;
        }

        useExpenseStore.setState((state) => ({
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : state.expenses,
          bills: Array.isArray(parsed.bills) ? parsed.bills : state.bills,
          budgets: Array.isArray(parsed.budgets) ? parsed.budgets : state.budgets,
          accounts: Array.isArray(parsed.accounts) ? parsed.accounts : state.accounts,
          subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : state.subscriptions,
          debts: Array.isArray(parsed.debts) ? parsed.debts : state.debts,
          wishlistItems: Array.isArray(parsed.wishlistItems) ? parsed.wishlistItems : state.wishlistItems,
          settings: parsed.settings ? { ...state.settings, ...parsed.settings } : state.settings,
        }));

        const store = useExpenseStore.getState();
        if (store.session) {
          if (Array.isArray(parsed.expenses)) {
            parsed.expenses.forEach((exp: any) => {
              store.addPendingMutation({ type: 'INSERT_EXPENSE', payload: { ...exp, user_id: store.session?.user.id } });
            });
          }
          if (Array.isArray(parsed.accounts)) {
            parsed.accounts.forEach((acc: any) => {
              store.addPendingMutation({ type: 'INSERT_ACCOUNT', payload: { ...acc, user_id: store.session?.user.id } });
            });
          }
          if (Array.isArray(parsed.bills)) {
            parsed.bills.forEach((b: any) => {
              store.addPendingMutation({ type: 'INSERT_BILL', payload: { ...b, user_id: store.session?.user.id } });
            });
          }
          if (parsed.settings) {
            store.updateSettings(parsed.settings);
          }
          store.syncPendingMutations();
        }

        vibrate(20);
        if (settings.soundEnabled) playSuccessSound();
        toast.success("Backup restored successfully!");
      } catch (err) {
        console.error("Backup import error:", err);
        toast.error("Failed to parse backup JSON file");
      } finally {
        if (importInputRef.current) {
          importInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handleCsvExport = () => {
    if (!expenses.length) return;
    const headers = ["Date", "Description", "Category", "Amount", "Notes"];
    const rows = expenses.map(e => [
      e.date.split("T")[0],
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.amount.toString(),
      `"${(e.notes || "").replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-tracker-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      await eraseAllData();
      localStorage.removeItem("expense-tracker-storage");
      window.location.reload();
    }
  };

  const handleAddCat = () => {
    if (newCat.trim() && !settings.categories.includes(newCat.trim())) {
      addCategory(newCat.trim());
      setNewCat("");
    }
  };

  const handleEmojiSelect = (category: string, emoji: string) => {
    updateSettings({
      categoryEmojis: {
        ...(settings.categoryEmojis || {}),
        [category]: emoji
      }
    });
    setEditingEmojiFor(null);
  };

  const handleBudgetChange = (category: string, amount: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    updateBudget(category, amount === "" ? 0 : parseFloat(amount), currentMonth);
  };

  const handleAddQa = () => {
    if (qaName && qaAmount) {
      updateSettings({
        quickAdds: [
          ...(settings.quickAdds || []),
          { description: qaName, amount: parseFloat(qaAmount), category: qaCategory || settings.categories[0], icon: qaIcon }
        ]
      });
      setQaName("");
      setQaAmount("");
    }
  };

  const removeQa = (index: number) => {
    updateSettings({
      quickAdds: (settings.quickAdds || []).filter((_, i) => i !== index)
    });
  };

  const tabOptions = [
    { value: "general" as SettingsTab, label: "General", icon: SlidersHorizontal },
    { value: "categories" as SettingsTab, label: "Categories", icon: Layers },
    { value: "data" as SettingsTab, label: "Data & Storage", icon: Database },
    { value: "more" as SettingsTab, label: "More", icon: MoreHorizontal },
  ];

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header & Quick Profile Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Customize preferences, budget rules, categories, and account data
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareApp}
            className="rounded-2xl h-10 px-3.5 gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold shadow-2xs cursor-pointer select-none"
            title="Share app with friends"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-xs">Share App</span>
          </Button>

          {session?.user?.email && (
            <div className="flex items-center gap-2.5 bg-card/90 border border-border/60 py-1.5 px-3 rounded-2xl shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {session.user.email.substring(0, 1).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold leading-tight max-w-[130px] truncate">{session.user.email}</p>
                <p className="text-[10px] text-muted-foreground">Connected Cloud</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Segmented Control Bar */}
      <div className="sticky top-0 z-20 py-1 bg-background/80 backdrop-blur-md">
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={(val) => setActiveTab(val)}
          layoutId="settings-tabs-pill"
          className="bg-card/90 border-border/80 shadow-xs"
        />
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* TAB 1: GENERAL PREFERENCES */}
        {activeTab === "general" && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* Appearance & Sound */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <Sun className="w-4 h-4 text-primary" /> Appearance & Feedback
                </h3>

                {/* Dark Mode */}
                <div className="flex justify-between items-center py-1">
                  <div>
                    <span className="text-sm font-medium">Dark Mode</span>
                    <p className="text-xs text-muted-foreground">Toggle between light and dark visual palette</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl px-3 gap-2"
                    onClick={() => {
                      vibrate(10);
                      updateSettings({ darkMode: !settings.darkMode });
                    }}
                  >
                    {settings.darkMode ? (
                      <>
                        <Moon className="h-4 w-4 text-primary" />
                        <span>Dark</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4 text-amber-500" />
                        <span>Light</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Color Theme */}
                <div className="space-y-2.5 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Accent Color</span>
                      <p className="text-xs text-muted-foreground">App-wide tint and glow styling</p>
                    </div>
                    <span className="text-[11px] font-semibold text-primary capitalize">
                      {settings.theme === 'emerald'
                        ? 'Emerald Mint'
                        : settings.theme === 'rose'
                        ? 'Sunset Rose'
                        : settings.theme === 'violet'
                        ? 'Royal Violet'
                        : settings.theme === 'amber'
                        ? 'Amber Sunset'
                        : 'Ocean Blue'}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {[
                      { id: 'default', label: 'Ocean', gradient: 'from-blue-500 to-cyan-500' },
                      { id: 'emerald', label: 'Emerald', gradient: 'from-emerald-500 to-teal-500' },
                      { id: 'rose', label: 'Rose', gradient: 'from-rose-500 to-pink-500' },
                      { id: 'violet', label: 'Violet', gradient: 'from-violet-500 to-purple-500' },
                      { id: 'amber', label: 'Amber', gradient: 'from-amber-500 to-orange-500' },
                    ].map((themeItem) => {
                      const isSelected = (settings.theme || 'default') === themeItem.id;
                      return (
                        <button
                          key={themeItem.id}
                          type="button"
                          onClick={() => {
                            vibrate(12);
                            if (settings.soundEnabled) playTapSound();
                            updateSettings({ theme: themeItem.id });
                          }}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-primary/10 border-primary shadow-xs scale-[1.02]'
                              : 'bg-secondary/50 hover:bg-secondary border-border/60 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${themeItem.gradient} flex items-center justify-center shadow-xs ring-2 ring-white/40 dark:ring-white/15`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                          </div>
                          <span className={`text-[10px] font-bold tracking-tight ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                            {themeItem.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sound & Haptics */}
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Haptic & Sound FX</span>
                      <span className="text-xs text-muted-foreground">Tactile feedback & chime confirmations</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl px-3 gap-1.5"
                      onClick={() => {
                        const nextVal = !settings.soundEnabled;
                        updateSettings({ soundEnabled: nextVal });
                        if (nextVal) {
                          setTimeout(() => playSuccessSound(), 50);
                        }
                      }}
                    >
                      {settings.soundEnabled ? (
                        <>
                          <Volume2 className="h-4 w-4 text-primary" />
                          <span>On</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-4 w-4 text-muted-foreground" />
                          <span>Off</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {settings.soundEnabled && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground mr-1">Preview audio:</span>
                      <button
                        type="button"
                        onClick={() => {
                          vibrate(8);
                          playTapSound();
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors cursor-pointer"
                      >
                        <TouchAppOutlined className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Tap</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          vibrate(15);
                          playSuccessSound();
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors cursor-pointer"
                      >
                        <NotificationsActiveOutlined className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Chime</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          vibrate(15);
                          playDeleteSound();
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors cursor-pointer"
                      >
                        <DeleteOutlined className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Trash</span>
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Profile & Payments */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" /> Profile & Payment Identity
                </h3>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Display Name</label>
                  <Input 
                    placeholder="e.g. Nithin"
                    value={settings.userName || ""}
                    onChange={(e) => updateSettings({ userName: e.target.value })}
                    className="max-w-md bg-background rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">UPI ID (for Bill Splitting)</label>
                    {settings.upiId && (
                      <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                      </span>
                    )}
                  </div>
                  <Input 
                    placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                    value={settings.upiId || ""}
                    onChange={(e) => updateSettings({ upiId: e.target.value.trim() })}
                    className="max-w-md bg-background text-sm font-mono rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enables 1-tap Google Pay / PhonePe payments and QR codes when you split bills.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Financial Parameters */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Budgeting Rules
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Currency Symbol</label>
                    <Input 
                      value={settings.currency}
                      onChange={(e) => updateSettings({ currency: e.target.value })}
                      className="max-w-[120px] rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Monthly Income / Budget</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-muted-foreground text-sm">{settings.currency}</span>
                      <Input 
                        type="text"
                        inputMode="decimal"
                        value={settings.monthlyIncome}
                        onChange={(e) => updateSettings({ monthlyIncome: parseFloat(e.target.value) || 0 })}
                        className="pl-8 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Carry Forward Balance</span>
                    <span className="text-xs text-muted-foreground">Roll surplus or deficit balance into next month</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl px-3"
                    onClick={() => updateSettings({ carryForward: !settings.carryForward })}
                  >
                    {settings.carryForward ? "On" : "Off"}
                  </Button>
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Budget Cycle / Payday</label>
                    <span className="text-[11px] font-semibold text-primary">
                      {settings.salaryCycleDay && settings.salaryCycleDay > 1 
                        ? `${settings.salaryCycleDay}th of month`
                        : '1st (Calendar)'}
                    </span>
                  </div>
                  <select
                    value={settings.salaryCycleDay || 1}
                    onChange={(e) => {
                      vibrate(10);
                      updateSettings({ salaryCycleDay: parseInt(e.target.value, 10) || 1 });
                      toast.success("Budget cycle updated");
                    }}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value={1}>1st of Month (Standard Calendar)</option>
                    <option value={5}>5th of Month</option>
                    <option value={10}>10th of Month</option>
                    <option value={15}>15th of Month</option>
                    <option value={20}>20th of Month</option>
                    <option value={25}>25th of Month (Common Payday)</option>
                    <option value={28}>28th of Month</option>
                    <option value={30}>30th of Month</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Syncs month tracking and Safe-to-Spend runway with the date your salary arrives.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* TAB 2: CATEGORIES & QUICK ADDS */}
        {activeTab === "categories" && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* Category Management */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" /> Categories & Monthly Caps
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Drag grip to reorder. Tap icons to assign emojis. Set limits per category.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                    {settings.categories.length} total
                  </span>
                </div>

                <div className="flex gap-2">
                  <Input 
                    placeholder="New category name..." 
                    value={newCat} 
                    onChange={(e) => setNewCat(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCat()}
                    className="rounded-xl"
                  />
                  <Button onClick={handleAddCat} className="rounded-xl gap-1 px-4 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </Button>
                </div>

                <Reorder.Group
                  axis="y"
                  values={settings.categories}
                  onReorder={(newCategories) => {
                    vibrate(10);
                    reorderCategories(newCategories);
                  }}
                  className="flex flex-col gap-2 mt-2"
                >
                  {settings.categories.map((c) => (
                    <CategoryRowItem
                      key={c}
                      category={c}
                      currency={settings.currency}
                      emoji={settings.categoryEmojis?.[c]}
                      monthlyLimit={budgets.find(b => b.category === c && b.month === new Date().toISOString().slice(0, 7))?.monthlyLimit || ""}
                      editingEmoji={editingEmojiFor === c}
                      onToggleEmoji={() => setEditingEmojiFor(editingEmojiFor === c ? null : c)}
                      onBudgetChange={(val) => handleBudgetChange(c, val)}
                      onDelete={() => deleteCategory(c)}
                      onEmojiSelect={(emoji) => handleEmojiSelect(c, emoji)}
                    />
                  ))}
                </Reorder.Group>
              </CardContent>
            </Card>

            {/* Custom Quick-Adds */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <BoltOutlined className="w-4 h-4 text-primary" /> 1-Tap Quick-Add Shortcuts
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pre-set recurring frequent purchases (like morning coffee or daily commute)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Icon or category (e.g. coffee)" value={qaIcon} onChange={e => setQaIcon(e.target.value)} className="col-span-1 rounded-xl" />
                  <Input placeholder="Name (Coffee)" value={qaName} onChange={e => setQaName(e.target.value)} className="col-span-1 rounded-xl" />
                  <Input type="text" inputMode="decimal" placeholder="Amount" value={qaAmount} onChange={e => setQaAmount(e.target.value)} className="col-span-1 rounded-xl" />
                  <select
                    className="col-span-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                    value={qaCategory}
                    onChange={(e) => setQaCategory(e.target.value)}
                  >
                    {settings.categories.map((c) => (
                      <option key={c} value={c} className="bg-background">{c}</option>
                    ))}
                  </select>
                  <Button onClick={handleAddQa} className="col-span-2 rounded-xl cursor-pointer">
                    Add 1-Tap Shortcut
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {(settings.quickAdds || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No quick shortcuts added yet.</p>
                  ) : (
                    (settings.quickAdds || []).map((qa, index) => (
                      <div key={index} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-xl text-xs font-medium border border-border/60 shadow-2xs">
                        <span className="flex items-center gap-1.5">
                          <CategoryIcon category={qa.category || qa.description} icon={qa.icon} className="w-3.5 h-3.5 text-primary" />
                          <span>{qa.description}</span>
                          <span className="text-muted-foreground font-mono">({settings.currency}{qa.amount})</span>
                        </span>
                        <button 
                          onClick={() => removeQa(index)} 
                          className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors cursor-pointer"
                          title="Remove shortcut"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* TAB 3: DATA & STORAGE */}
        {activeTab === "data" && (
          <motion.div
            key="data"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* Backup & Exports */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" /> Reports & Backups
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-12 justify-start gap-2.5 rounded-2xl cursor-pointer" 
                    onClick={() => {
                      vibrate(10);
                      setIsStatementOpen(true);
                    }}
                  >
                    <Printer className="w-4 h-4 text-primary" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Printable Statement</div>
                      <div className="text-[10px] text-muted-foreground">Download formal PDF report</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="h-12 justify-start gap-2.5 rounded-2xl cursor-pointer" 
                    onClick={handleCsvExport}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Export Expenses (CSV)</div>
                      <div className="text-[10px] text-muted-foreground">Open in Excel or Google Sheets</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="h-12 justify-start gap-2.5 rounded-2xl cursor-pointer" 
                    onClick={handleExport}
                  >
                    <Download className="w-4 h-4 text-blue-500" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Export Backup (JSON)</div>
                      <div className="text-[10px] text-muted-foreground">Full data snapshot</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline" 
                    className="h-12 justify-start gap-2.5 rounded-2xl cursor-pointer" 
                    onClick={() => importInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 text-purple-500" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Restore Backup (JSON)</div>
                      <div className="text-[10px] text-muted-foreground">Load from previous backup</div>
                    </div>
                  </Button>
                </div>

                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportJson}
                />
              </CardContent>
            </Card>

            {/* Recycle Bin */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Recently Deleted</h4>
                      <p className="text-xs text-muted-foreground">Recover accidentally deleted items or wipe permanently</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl px-3 gap-1.5 cursor-pointer" 
                    onClick={() => {
                      vibrate(10);
                      setIsRecentlyDeletedOpen(true);
                    }}
                  >
                    <span>View</span>
                    {recentlyDeleted.length > 0 ? (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive">
                        {recentlyDeleted.length}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">(0)</span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Session & Danger Zone */}
            <Card className="rounded-3xl border border-destructive/20 bg-destructive/5 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Danger Zone & Account
                </h3>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  {session?.user && (
                    <Button 
                      variant="outline" 
                      className="flex-1 justify-center gap-2 rounded-xl cursor-pointer" 
                      onClick={() => supabase.auth.signOut()}
                    >
                      <LogOut className="w-4 h-4 text-muted-foreground" />
                      <span>Sign Out</span>
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    className="flex-1 justify-center gap-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer" 
                    onClick={handleReset}
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span>Erase All Data</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* TAB 4: MORE / COMMUNITY / BADGES / SECURITY */}
        {activeTab === "more" && (
          <motion.div
            key="more"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* Admin Console Shortcut (if user is admin) */}
            {isAdmin && (
              <div className="animate-in fade-in duration-300">
                <Card 
                  onClick={() => {
                    vibrate(15);
                    navigate('/admin');
                  }}
                  className="cursor-pointer border border-border hover:border-primary/50 transition-all active:scale-[0.98] bg-card shadow-xs hover:shadow-sm group rounded-3xl"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-secondary text-primary flex items-center justify-center shrink-0 border border-border shadow-xs">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground">Open Admin Portal</p>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                            Super Admin
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Analytics, push broadcaster & campaign scheduler
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Share Option Card */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-xs">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                    <Share2 className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-foreground tracking-tight">Share Expense Tracker</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                        Invite Friends
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Help friends track budgets, monitor cashflow & grow savings.
                    </p>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/80 hover:bg-background border border-border/50 text-[11px] text-muted-foreground hover:text-foreground font-mono transition-colors max-w-full cursor-pointer group"
                      title="Click to copy link"
                    >
                      <span className="truncate">{currentHost}</span>
                      {copiedLink ? (
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground group-hover:text-foreground shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="flex-1 sm:flex-initial h-9 px-3.5 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground transition-all inline-flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer select-none"
                    title="Copy app link"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <Button
                    onClick={handleShareApp}
                    className="flex-1 sm:flex-initial h-9 px-4 py-2 rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/25 active:scale-95 transition-all cursor-pointer select-none"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Achievement Badges */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <BadgeCabinet />
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" /> Notifications
                </h3>

                {!isSupported ? (
                  <p className="text-sm text-muted-foreground">Push notifications are not supported in this browser environment.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Push Reminders</p>
                        <p className="text-xs text-muted-foreground">Timely alerts for bills, subscriptions, and daily logs</p>
                      </div>
                      <Button 
                        variant={isSubscribed ? "destructive" : "default"}
                        size="sm"
                        disabled={loading}
                        className="rounded-xl px-3 cursor-pointer"
                        onClick={() => isSubscribed ? unsubscribe() : subscribe()}
                      >
                        {isSubscribed ? "Disable" : "Enable"}
                      </Button>
                    </div>
                    
                    {permission === 'denied' && (
                      <p className="text-xs text-destructive">Notifications are blocked by your browser. Please enable permissions in your site settings.</p>
                    )}
                    
                    {/iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 mt-2">
                        <strong>iOS Note:</strong> To enable notifications, first tap the Share button and select <em>"Add to Home Screen"</em>.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Privacy & Hardware Security */}
            <Card className="rounded-3xl border border-border/60 bg-card/90 shadow-2xs overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
                      <Shield className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">App Lock & Biometrics</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                          Native App Preview
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-md">
                        Face ID, Touch ID & PIN security will automatically engage in the upcoming native build.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border/60 text-xs font-semibold text-muted-foreground select-none">
                      <LockOutlined className="w-3.5 h-3.5 text-muted-foreground" />
                      Ready for Native
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recently Deleted Modal */}
      <RecentlyDeletedModal 
        isOpen={isRecentlyDeletedOpen} 
        onClose={() => setIsRecentlyDeletedOpen(false)} 
      />

      {/* Printable Statement Modal */}
      <PrintableStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
      />
    </div>
  );
}

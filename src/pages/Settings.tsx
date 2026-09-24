import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useExpenseStore } from "../store/useExpenseStore";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Moon, Sun, Download, RefreshCcw, Plus, Trash2, X, FileSpreadsheet, GripVertical, Volume2, VolumeX, ShieldCheck, ChevronRight, Printer, Lock, Fingerprint, KeyRound, Share2, Copy, Check, ScanFace, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { Reorder, useDragControls } from "framer-motion";
import { vibrate } from "../lib/utils";
import { playSuccessSound, playTapSound, playDeleteSound } from "../lib/sound";
import { RecentlyDeletedModal } from "../components/RecentlyDeletedModal";
import { checkIsAdmin } from "../lib/admin";
import { BadgeCabinet } from "../components/analytics/BadgeCabinet";
import { PrintableStatementModal } from "../components/analytics/PrintableStatementModal";
import { hashPin, registerBiometrics, clearStoredBiometrics, isAppleDevice } from "../lib/biometrics";
import { toast } from "sonner";
const COMMON_EMOJIS = ["🍔", "🚗", "🏠", "🛒", "✈️", "👗", "💊", "🎉", "🎮", "📚", "🐶", "☕", "📱", "🎁", "💡", "💰", "💪", "🎬"];

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
      className="flex flex-col gap-2 bg-secondary/50 p-2 rounded-md border shadow-sm select-none"
    >
      <div className="flex items-center gap-2">
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground touch-none rounded transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <button 
          onClick={onToggleEmoji}
          className="w-8 h-8 flex items-center justify-center bg-background rounded-full border shadow-sm hover:bg-muted transition-colors text-lg"
        >
          {emoji || category.substring(0, 2).toUpperCase()}
        </button>
        <span className="flex-1 font-medium">{category}</span>
        <div className="relative w-28">
          <span className="absolute left-2 top-2 text-xs text-muted-foreground">{currency}</span>
          <Input 
            type="text" 
            inputMode="decimal"
            placeholder="Limit (opt)" 
            className="h-8 text-xs pl-6 bg-background"
            value={monthlyLimit}
            onChange={(e) => onBudgetChange(e.target.value)}
          />
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {editingEmoji && (
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 mt-2 p-2 bg-background rounded-md border animate-in slide-in-from-top-2">
          {COMMON_EMOJIS.map(itemEmoji => (
            <button
              key={itemEmoji}
              onClick={() => onEmojiSelect(itemEmoji)}
              className="w-8 h-8 flex items-center justify-center hover:bg-secondary rounded text-lg transition-colors"
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
  const { settings, updateSettings, addCategory, deleteCategory, reorderCategories, eraseAllData, expenses, bills, session, budgets, updateBudget, recentlyDeleted = [] } = useExpenseStore();
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [editingEmojiFor, setEditingEmojiFor] = useState<string | null>(null);
  const [isRecentlyDeletedOpen, setIsRecentlyDeletedOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRegisteringBiometrics, setIsRegisteringBiometrics] = useState(false);
  const isApple = isAppleDevice();

  const handleToggleBiometrics = async () => {
    vibrate(10);
    if (settings.appLockBiometrics) {
      clearStoredBiometrics();
      updateSettings({ appLockBiometrics: false });
      toast.success(isApple ? 'Face ID / Touch ID disabled' : 'Biometric unlock disabled');
      return;
    }

    setIsRegisteringBiometrics(true);
    try {
      const res = await registerBiometrics();
      if (res.success) {
        updateSettings({ appLockBiometrics: true });
        vibrate([15, 30, 15]);
        if (settings.soundEnabled) playSuccessSound();
        toast.success(
          isApple
            ? 'Face ID / Touch ID configured successfully!'
            : 'Biometric unlock configured successfully!'
        );
      } else {
        toast.error(res.error || 'Failed to setup biometrics');
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message || 'Could not enable biometrics');
    } finally {
      setIsRegisteringBiometrics(false);
    }
  };

  const APP_SHARE_URL = "https://expense-tracker-captain12.vercel.app/";

  const copyToClipboard = async () => {
    vibrate(15);
    if (settings.soundEnabled) playSuccessSound();
    try {
      await navigator.clipboard.writeText(APP_SHARE_URL);
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

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Expense Tracker",
          text: "Check out this fluid Expense Tracker to manage your spending, budgets, and liquid wealth!",
          url: APP_SHARE_URL,
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

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    vibrate(15);
    const hash = await hashPin(pinInput);
    updateSettings({
      appLockPin: hash,
      appLockEnabled: true,
    });
    setPinInput('');
    setIsPinModalOpen(false);
    toast.success('Security PIN configured and App Lock enabled!');
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
  const [qaIcon, setQaIcon] = useState("✨");

  const handleExport = () => {
    const data = { expenses, bills, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  return (
    <div className="space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <div className="space-y-4">
        {session?.user?.email && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Account</h3>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {session.user.email.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{session.user.email}</p>
                    <p className="text-xs text-muted-foreground">Logged in via Supabase</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isAdmin && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Admin Console
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                    Super Admin
                  </span>
                </div>
                <Card 
                  onClick={() => {
                    vibrate(15);
                    navigate('/admin');
                  }}
                  className="cursor-pointer border-primary/30 hover:border-primary/60 transition-all active:scale-[0.98] bg-gradient-to-br from-primary/10 via-card to-card shadow-sm hover:shadow-md group rounded-2xl"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/25 shadow-inner">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          Open Admin Portal
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Analytics, push broadcaster & campaign scheduler
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Minimal & Attractive Share Option Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-white/10 bg-gradient-to-br from-primary/10 via-card/90 to-card/95 backdrop-blur-2xl p-4 sm:p-5 shadow-xs">
          {/* Subtle Ambient Bloom */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left Info */}
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/25">
                <Share2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-foreground tracking-tight">Share Expense Tracker</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                    Invite Friends
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Help friends track budgets, monitor cashflow & grow savings.
                </p>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/80 hover:bg-background border border-border/50 text-[11px] text-muted-foreground hover:text-foreground font-mono transition-colors max-w-full cursor-pointer group"
                  title="Click to copy link"
                >
                  <span className="truncate">expense-tracker-captain12.vercel.app</span>
                  {copiedLink ? (
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground group-hover:text-foreground shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={copyToClipboard}
                className="h-8.5 px-3 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary border border-border/60 text-foreground transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer select-none"
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
                    <span>Copy</span>
                  </>
                )}
              </button>

              <Button
                size="sm"
                onClick={handleShareApp}
                className="h-8.5 px-3.5 rounded-xl text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shadow-primary/25 active:scale-95 transition-all cursor-pointer select-none"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Card className="rounded-3xl border border-border/60 bg-card/85 backdrop-blur-xl shadow-xs overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <BadgeCabinet />
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Preferences</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Display Name</label>
                <Input 
                  placeholder="e.g. Nithin"
                  value={settings.userName || ""}
                  onChange={(e) => updateSettings({ userName: e.target.value })}
                  className="max-w-xs bg-background"
                />
              </div>

              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-sm font-medium">Dark Mode</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                >
                  {settings.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Haptic & Sound FX</span>
                    <span className="text-xs text-muted-foreground">Apple-style clicks and celebration chimes</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5"
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

                {/* Audio test preview triggers */}
                {settings.soundEnabled && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground mr-1">Test audio:</span>
                    <button
                      type="button"
                      onClick={() => {
                        vibrate(8);
                        playTapSound();
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 hover:bg-secondary border border-border/50 text-foreground transition-colors cursor-pointer"
                    >
                      🔘 Tap Click
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        vibrate(15);
                        playSuccessSound();
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 hover:bg-secondary border border-border/50 text-foreground transition-colors cursor-pointer"
                    >
                      ✨ Chime
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        vibrate(15);
                        playDeleteSound();
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 hover:bg-secondary border border-border/50 text-foreground transition-colors cursor-pointer"
                    >
                      🗑️ Trash Pop
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Color Theme</span>
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
                <div className="grid grid-cols-5 gap-2">
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

              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Carry Forward Balance</span>
                  <span className="text-xs text-muted-foreground">Add remaining budget to next month</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => updateSettings({ carryForward: !settings.carryForward })}
                >
                  {settings.carryForward ? "On" : "Off"}
                </Button>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Currency Symbol</label>
                <Input 
                  value={settings.currency}
                  onChange={(e) => updateSettings({ currency: e.target.value })}
                  className="max-w-[100px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Monthly Budget</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground">{settings.currency}</span>
                  <Input 
                    type="text"
                    inputMode="decimal"
                    value={settings.monthlyIncome}
                    onChange={(e) => updateSettings({ monthlyIncome: parseFloat(e.target.value) || 0 })}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Privacy & Security</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    <span>App Lock & Biometrics</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Require 4-digit PIN or Face ID to open app
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    vibrate(10);
                    if (!settings.appLockEnabled && !settings.appLockPin) {
                      setIsPinModalOpen(true);
                    } else {
                      updateSettings({ appLockEnabled: !settings.appLockEnabled });
                    }
                  }}
                >
                  {settings.appLockEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              {settings.appLockEnabled && (
                <>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Security PIN</span>
                      <span className="text-xs text-muted-foreground">Change your 4-digit access code</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        vibrate(10);
                        setIsPinModalOpen(true);
                      }}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Change PIN</span>
                    </Button>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        {isApple ? (
                          <ScanFace className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Fingerprint className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>{isApple ? 'Face ID / Touch ID' : 'Biometric Unlock'}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isApple
                          ? 'Unlock seamlessly with Apple Face ID or Touch ID'
                          : 'Use Face ID, Touch ID, or Windows Hello'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isRegisteringBiometrics}
                      className="gap-1.5"
                      onClick={handleToggleBiometrics}
                    >
                      {isRegisteringBiometrics ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      ) : isApple ? (
                        <ScanFace className="w-3.5 h-3.5" />
                      ) : (
                        <Fingerprint className="w-3.5 h-3.5" />
                      )}
                      <span>{settings.appLockBiometrics ? 'On' : 'Off'}</span>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Notifications</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              {!isSupported ? (
                <p className="text-sm text-muted-foreground">Push notifications are not supported in this browser.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Get reminders for bills and budgets</p>
                    </div>
                    <Button 
                      variant={isSubscribed ? "destructive" : "default"}
                      size="sm"
                      disabled={loading}
                      onClick={() => isSubscribed ? unsubscribe() : subscribe()}
                    >
                      {isSubscribed ? "Disable" : "Enable"}
                    </Button>
                  </div>
                  
                  {permission === 'denied' && (
                    <p className="text-xs text-destructive">Notifications are blocked by your browser. Please enable them in your browser settings.</p>
                  )}
                  
                  {/iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-amber-700 mt-2">
                      <strong>iOS Note:</strong> To enable notifications, you must first tap the Share button and select <em>"Add to Home Screen"</em>.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Categories & Budgets</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="New Category" 
                  value={newCat} 
                  onChange={(e) => setNewCat(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCat()}
                />
                <Button onClick={handleAddCat} size="icon"><Plus className="w-4 h-4" /></Button>
              </div>
              <Reorder.Group
                axis="y"
                values={settings.categories}
                onReorder={(newCategories) => {
                  vibrate(10);
                  reorderCategories(newCategories);
                }}
                className="flex flex-col gap-2 mt-4"
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
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Custom Quick-Adds</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Icon (☕)" value={qaIcon} onChange={e => setQaIcon(e.target.value)} className="col-span-1" />
                <Input placeholder="Name (Coffee)" value={qaName} onChange={e => setQaName(e.target.value)} className="col-span-1" />
                <Input type="text" inputMode="decimal" placeholder="Amount" value={qaAmount} onChange={e => setQaAmount(e.target.value)} className="col-span-1" />
                <select
                  className="col-span-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={qaCategory}
                  onChange={(e) => setQaCategory(e.target.value)}
                >
                  {settings.categories.map((c) => (
                    <option key={c} value={c} className="bg-background">{c}</option>
                  ))}
                </select>
                <Button onClick={handleAddQa} className="col-span-2">Add Shortcut</Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {(settings.quickAdds || []).map((qa, index) => (
                  <div key={index} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm border shadow-sm">
                    <span>{qa.icon} {qa.description} ({settings.currency}{qa.amount})</span>
                    <button onClick={() => removeQa(index)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Data Management</h3>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-between gap-2" 
                onClick={() => {
                  vibrate(10);
                  setIsRecentlyDeletedOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                  <span>Recently Deleted</span>
                </div>
                {recentlyDeleted.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive">
                    {recentlyDeleted.length} items
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Empty</span>
                )}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2" 
                onClick={() => {
                  vibrate(10);
                  setIsStatementOpen(true);
                }}
              >
                <Printer className="w-4 h-4 text-primary" />
                Generate Printable Statement (PDF)
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={handleCsvExport}>
                <FileSpreadsheet className="w-4 h-4" />
                Export Expenses (CSV)
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Export Full Backup (JSON)
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => supabase.auth.signOut()}>
                Sign Out
              </Button>
              <Button variant="destructive" className="w-full justify-start gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleReset}>
                <RefreshCcw className="w-4 h-4" />
                Erase All Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecentlyDeletedModal 
        isOpen={isRecentlyDeletedOpen} 
        onClose={() => setIsRecentlyDeletedOpen(false)} 
      />

      {/* PIN Setup Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsPinModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-xs rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-4 z-10 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">Set 4-Digit PIN</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Enter a 4-digit code to protect your financial data
              </p>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                autoFocus
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-2xl tracking-[0.5em] font-bold h-12 rounded-2xl bg-secondary/60"
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 rounded-xl text-xs"
                  onClick={() => setIsPinModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pinInput.length !== 4}
                  className="flex-1 rounded-xl text-xs font-semibold"
                >
                  Save PIN
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Statement Modal */}
      <PrintableStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
      />
    </div>
  );
}

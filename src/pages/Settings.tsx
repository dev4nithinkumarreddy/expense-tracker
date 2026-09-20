import { useState } from "react";
import { useExpenseStore } from "../store/useExpenseStore";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Moon, Sun, Download, RefreshCcw, Plus, Trash2, X, FileSpreadsheet, GripVertical, Volume2, VolumeX } from "lucide-react";
import { Button } from "../components/ui/button";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { Reorder, useDragControls } from "framer-motion";
import { vibrate } from "../lib/utils";
import { playSuccessSound, playTapSound, playDeleteSound } from "../lib/sound";
import { RecentlyDeletedModal } from "../components/RecentlyDeletedModal";
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
  const { settings, updateSettings, addCategory, deleteCategory, reorderCategories, eraseAllData, expenses, bills, session, budgets, updateBudget, recentlyDeleted = [] } = useExpenseStore();
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  
  const [newCat, setNewCat] = useState("");
  const [editingEmojiFor, setEditingEmojiFor] = useState<string | null>(null);
  const [isRecentlyDeletedOpen, setIsRecentlyDeletedOpen] = useState(false);
  
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
        )}

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

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Color Theme</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={settings.theme || 'default'}
                  onChange={(e) => updateSettings({ theme: e.target.value })}
                >
                  <option value="default">Ocean Blue</option>
                  <option value="emerald">Emerald Green</option>
                  <option value="rose">Sunset Rose</option>
                  <option value="violet">Royal Violet</option>
                </select>
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
    </div>
  );
}

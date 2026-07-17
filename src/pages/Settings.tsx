import { useState } from "react";
import { useExpenseStore } from "../store/useExpenseStore";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Moon, Sun, Download, RefreshCcw, Plus, Trash2, X, FileSpreadsheet } from "lucide-react";
import { Button } from "../components/ui/button";

export default function Settings() {
  const { settings, updateSettings, addCategory, deleteCategory, eraseAllData, expenses, bills } = useExpenseStore();
  
  const [newCat, setNewCat] = useState("");
  
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

  const toggleNotifications = async () => {
    if (settings.notificationsEnabled) {
      updateSettings({ notificationsEnabled: false });
    } else {
      if (typeof Notification === 'undefined') {
        alert("Notifications are not supported in this browser.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateSettings({ notificationsEnabled: true });
        new Notification("Expense Tracker", { body: "Reminders enabled! You'll be notified daily to log expenses." });
      } else {
        alert("Notification permission denied by browser.");
      }
    }
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

  const handleBudgetChange = (category: string, amount: string) => {
    const newBudgets = { ...(settings.categoryBudgets || {}) };
    if (amount === "" || parseFloat(amount) <= 0) {
      delete newBudgets[category];
    } else {
      newBudgets[category] = parseFloat(amount);
    }
    updateSettings({ categoryBudgets: newBudgets });
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
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Preferences</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Dark Mode</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                >
                  {settings.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
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

              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Daily Reminders</span>
                  <span className="text-xs text-muted-foreground">Get notified to log your expenses</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleNotifications}
                >
                  {settings.notificationsEnabled ? "On" : "Off"}
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
                <label className="text-sm font-medium">Monthly Income</label>
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
              <div className="flex flex-col gap-2 mt-4">
                {settings.categories.map(c => (
                  <div key={c} className="flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded-md text-sm border shadow-sm">
                    <span className="flex-1 font-medium">{c}</span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-2 text-xs text-muted-foreground">{settings.currency}</span>
                      <Input 
                        type="text" 
                        inputMode="decimal"
                        placeholder="Limit (opt)" 
                        className="h-8 text-xs pl-6 bg-background"
                        value={(settings.categoryBudgets || {})[c] || ""}
                        onChange={(e) => handleBudgetChange(c, e.target.value)}
                      />
                    </div>
                    <button onClick={() => deleteCategory(c)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
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
    </div>
  );
}

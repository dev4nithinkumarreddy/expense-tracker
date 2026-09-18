import { vibrate } from "../lib/utils";
import { useExpenseStore } from "../store/useExpenseStore";
import { useDashboardData } from "../hooks/useDashboardData";
import { Card, CardContent } from "../components/ui/card";
import { isThisMonth, isToday, isThisWeek, parseISO, format } from "date-fns";
import { cn } from "../lib/utils";
import { formatCurrency } from "../lib/formatCurrency";
import { Eye, EyeOff, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { calculateStreak } from "../lib/streak";

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse mt-4">
    <div className="flex justify-between items-end">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-secondary/80 rounded-md" />
        <div className="h-4 w-24 bg-secondary/80 rounded-md" />
      </div>
      <div className="h-9 w-9 bg-secondary/80 rounded-full" />
    </div>
    <div className="h-48 w-full bg-secondary/80 rounded-xl" />
    <div className="grid grid-cols-2 gap-4">
      <div className="h-24 bg-secondary/80 rounded-xl" />
      <div className="h-24 bg-secondary/80 rounded-xl" />
    </div>
    <div className="h-16 w-full bg-secondary/80 rounded-xl" />
    <div className="space-y-3">
      <div className="h-5 w-32 bg-secondary/80 rounded-md mb-2" />
      <div className="h-16 w-full bg-secondary/80 rounded-xl" />
      <div className="h-16 w-full bg-secondary/80 rounded-xl" />
    </div>
  </div>
);

export default function Dashboard() {
  const { settings, addExpense, updateSettings } = useExpenseStore();
  const { expenses, bills, budgets, isLoading } = useDashboardData();
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const quickAdds = settings.quickAdds || [];
  const currentStreak = useMemo(() => calculateStreak(expenses) || settings.currentStreak || 0, [expenses, settings.currentStreak]);

  const currentMonthRecords = expenses.filter(e => isThisMonth(parseISO(e.date)));
  const incomeRecords = currentMonthRecords.filter(e => e.category === 'Income');
  const currentMonthExpenses = currentMonthRecords.filter(e => e.category !== 'Income');

  const extraIncome = incomeRecords.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalBills = bills.reduce((sum, b) => sum + b.amount, 0);
  
  const totalBudget = settings.monthlyIncome + extraIncome;
  const remaining = totalBudget - totalBills - totalExpenses;
  const budgetUsedPercent = Math.min(100, Math.round(((totalExpenses + totalBills) / totalBudget) * 100) || 0);

  const todayExpenses = currentMonthExpenses.filter(e => isToday(parseISO(e.date))).reduce((sum, e) => sum + e.amount, 0);
  const weekExpenses = currentMonthExpenses.filter(e => isThisWeek(parseISO(e.date))).reduce((sum, e) => sum + e.amount, 0);

  const isOverBudget = remaining < 0;

  // Recent expenses (last 5)
  const recentExpenses = [...currentMonthRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const handleAddIncome = () => {
    if (!incomeSource || !incomeAmount) return;
    vibrate();
    addExpense({
      amount: parseFloat(incomeAmount),
      description: incomeSource,
      category: "Income",
      date: new Date().toISOString()
    });
    setIncomeSource("");
    setIncomeAmount("");
    setIsIncomeModalOpen(false);
  };

  // Generate smart insight
  let insightText = "No expenses logged this month yet.";
  if (currentMonthExpenses.length > 0) {
    const categoryTotals = currentMonthExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    
    let topCategory = "";
    let maxSpend = 0;
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
      if (amount > maxSpend) {
        maxSpend = amount;
        topCategory = cat;
      }
    });

    if (isOverBudget) {
      insightText = `You are over budget! You've spent the most on ${topCategory} (${settings.currency}${maxSpend.toLocaleString()}).`;
    } else if (maxSpend > 0) {
      insightText = `You've spent the most on ${topCategory} (${settings.currency}${maxSpend.toLocaleString()}). You have ${settings.currency}${remaining.toLocaleString()} left.`;
    } else {
      insightText = `You've made ${currentMonthExpenses.length} transactions this month. Keep tracking!`;
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        {currentStreak > 0 ? (
          <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-full font-medium text-sm border border-orange-500/20 shadow-sm animate-in fade-in zoom-in">
            <span>🔥</span>
            <span>{currentStreak} Day Streak</span>
          </div>
        ) : null}
      </div>

      <header className="flex justify-end items-center">
        <button 
          onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 rounded-full"
        >
          {settings.privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Stats Card */}
      <Card className={cn("border-none shadow-md overflow-hidden relative", isOverBudget ? "bg-destructive/10" : "bg-primary/5")}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                Budget
                <button 
                  onClick={() => { vibrate(); setIsIncomeModalOpen(true); }}
                  className="w-4 h-4 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground rounded-full flex items-center justify-center transition-colors"
                  aria-label="Add Extra Income"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </p>
              <p className="text-lg font-semibold flex items-baseline gap-1">
                {formatCurrency(settings.monthlyIncome, settings.currency, settings.privacyMode)}
                {!settings.privacyMode && extraIncome > 0 && (
                  <span className="text-xs text-green-600 font-medium">+{formatCurrency(extraIncome, settings.currency, settings.privacyMode)}</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Bills</p>
              <p className="text-lg font-semibold">{formatCurrency(totalBills, settings.currency)}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Remaining</p>
              <h2 className={cn("text-3xl font-bold tracking-tight", isOverBudget ? "text-destructive" : "text-primary")}>
                {formatCurrency(remaining, settings.currency)}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Spent</p>
              <p className="text-xl font-semibold">{formatCurrency(totalExpenses, settings.currency)}</p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-xs font-medium">
              <span>Budget Used</span>
              <span className={cn(budgetUsedPercent >= 90 ? "text-destructive" : "text-muted-foreground")}>{budgetUsedPercent}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", budgetUsedPercent >= 90 ? "bg-destructive" : budgetUsedPercent >= 75 ? "bg-warning" : "bg-primary")}
                style={{ width: `${budgetUsedPercent}%` }}
              />
            </div>
          </div>
          {isOverBudget && (
            <p className="text-xs text-destructive mt-3 font-medium flex items-center">
              ⚠️ You exceeded your monthly budget.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Income Modal */}
      {isIncomeModalOpen && (
        <Card className="border-primary animate-in fade-in slide-in-from-top-4 shadow-lg border-2 border-green-500/20">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium text-sm text-green-600">Add Extra Income</h3>
            <div className="space-y-3">
              <Input 
                placeholder="Source (e.g. Sold bike, Bonus)" 
                value={incomeSource}
                onChange={(e) => setIncomeSource(e.target.value)}
                autoFocus
              />
              <Input 
                type="number" 
                placeholder="Amount" 
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
              />
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsIncomeModalOpen(false)}>Cancel</Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAddIncome}>Add Income</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Spending */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground mb-1">Today</p>
            <p className="text-xl font-bold">{formatCurrency(todayExpenses, settings.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground mb-1">This Week</p>
            <p className="text-xl font-bold">{formatCurrency(weekExpenses, settings.currency)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Insights */}
      <Card className="bg-secondary/50 border-none shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm font-medium">💡 Monthly Insight</p>
          <p className="text-xs text-muted-foreground mt-1">
            {insightText}
          </p>
        </CardContent>
      </Card>

      {/* Category Budgets */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Category Budgets</h3>
          <div className="space-y-4">
            {budgets.filter(b => b.month === new Date().toISOString().slice(0, 7) && settings.categories.includes(b.category)).length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border/50 rounded-lg">
                No budgets set for this month. Head over to <span className="font-medium text-foreground">Settings</span> to create limits!
              </div>
            ) : (
              budgets
                .filter(b => b.month === new Date().toISOString().slice(0, 7) && settings.categories.includes(b.category))
                .map((budget) => {
                const cat = budget.category;
                const limit = budget.monthlyLimit;
                const spent = currentMonthExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                const percentage = Math.min((spent / limit) * 100, 100);
                const isWarning = percentage > 85;
                const isDanger = percentage >= 100;

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(spent, settings.currency)} / {formatCurrency(limit, settings.currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isDanger ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-primary'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Add */}
      {quickAdds.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">Quick Add</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {quickAdds.map(qa => (
              <button 
                key={qa.description}
                onClick={() => {
                  vibrate();
                  addExpense({
                    amount: qa.amount,
                    description: qa.description,
                    category: qa.category,
                    date: new Date().toISOString(),
                  });
                }}
                className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary px-4 py-2.5 rounded-xl whitespace-nowrap shrink-0 transition-colors border shadow-sm"
              >
                <span className="text-xl">{qa.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-medium leading-none">{qa.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(qa.amount, settings.currency)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Bills */}
      {bills.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Upcoming Bills</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {bills.map(bill => (
              <div key={bill.id} className="bg-card border rounded-xl p-3 shrink-0 w-[140px] shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{bill.autoDeduct ? 'Auto-deduct' : 'Manual'}</p>
                <p className="font-medium text-sm truncate">{bill.title}</p>
                <p className="font-semibold mt-1">{formatCurrency(bill.amount, settings.currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Recent Expenses</h3>
        </div>
        <div className="space-y-3">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-10 bg-card border rounded-xl shadow-sm flex flex-col items-center">
              <div className="bg-primary/10 p-3 rounded-full mb-3 text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
              </div>
              <p className="text-foreground text-sm font-medium">No expenses logged yet.</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-[200px]">Tap the + button below to add your first expense!</p>
            </div>
          ) : (
            recentExpenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center p-3 bg-card border rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                    {expense.category.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm leading-none">{expense.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(parseISO(expense.date), 'MMM d')}</p>
                  </div>
                </div>
                <div className="font-semibold">
                  {formatCurrency(expense.amount, settings.currency)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

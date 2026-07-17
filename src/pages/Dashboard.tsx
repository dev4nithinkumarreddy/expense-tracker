import { useState } from "react";
import { vibrate } from "../lib/utils";
import { useExpenseStore } from "../store/useExpenseStore";
import { Card, CardContent } from "../components/ui/card";
import { Plus } from "lucide-react";
import { isThisMonth, isToday, isThisWeek, parseISO, format } from "date-fns";
import { cn } from "../lib/utils";
import { AddExpenseModal } from "../components/AddExpenseModal";

export default function Dashboard() {
  const { expenses, bills, settings, addExpense } = useExpenseStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const quickAdds = settings.quickAdds || [];

  const currentMonthExpenses = expenses.filter(e => isThisMonth(parseISO(e.date)));
  const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const totalBills = bills.reduce((sum, b) => sum + b.amount, 0);
  
  const remaining = settings.monthlyIncome - totalBills - totalExpenses;
  const budgetUsedPercent = Math.min(100, Math.round(((totalExpenses + totalBills) / settings.monthlyIncome) * 100));

  const todayExpenses = currentMonthExpenses.filter(e => isToday(parseISO(e.date))).reduce((sum, e) => sum + e.amount, 0);
  const weekExpenses = currentMonthExpenses.filter(e => isThisWeek(parseISO(e.date))).reduce((sum, e) => sum + e.amount, 0);

  const isOverBudget = remaining < 0;

  // Recent expenses (last 5)
  const recentExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

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
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm">Your monthly snapshot</p>
        </div>
      </header>

      {/* Main Stats Card */}
      <Card className={cn("border-none shadow-md overflow-hidden relative", isOverBudget ? "bg-destructive/10" : "bg-primary/5")}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Income</p>
              <p className="text-lg font-semibold">{settings.currency}{settings.monthlyIncome.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Bills</p>
              <p className="text-lg font-semibold">{settings.currency}{totalBills.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Remaining</p>
              <h2 className={cn("text-3xl font-bold tracking-tight", isOverBudget ? "text-destructive" : "text-primary")}>
                {settings.currency}{remaining.toLocaleString()}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Spent</p>
              <p className="text-xl font-semibold">{settings.currency}{totalExpenses.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-xs font-medium">
              <span>Budget Used</span>
              <span className={cn(budgetUsedPercent >= 90 ? "text-destructive" : "text-muted-foreground")}>{budgetUsedPercent}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", budgetUsedPercent >= 90 ? "bg-destructive" : budgetUsedPercent >= 75 ? "bg-orange-500" : "bg-primary")}
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

      {/* Daily Spending */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground mb-1">Today</p>
            <p className="text-xl font-bold">{settings.currency}{todayExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground mb-1">This Week</p>
            <p className="text-xl font-bold">{settings.currency}{weekExpenses.toLocaleString()}</p>
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
            {Object.keys(settings.categoryBudgets || {}).filter(cat => settings.categories.includes(cat)).length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border/50 rounded-lg">
                No budgets set. Head over to <span className="font-medium text-foreground">Settings</span> to create limits!
              </div>
            ) : (
              Object.entries(settings.categoryBudgets)
                .filter(([cat]) => settings.categories.includes(cat))
                .map(([cat, limit]) => {
                const spent = currentMonthExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                const percentage = Math.min((spent / limit) * 100, 100);
                const isWarning = percentage > 85;
                const isDanger = percentage >= 100;

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat}</span>
                      <span className="text-muted-foreground">
                        {settings.currency}{spent.toLocaleString()} / {settings.currency}{limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isDanger ? 'bg-destructive' : isWarning ? 'bg-orange-500' : 'bg-primary'}`}
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
                  <p className="text-xs text-muted-foreground mt-0.5">{settings.currency}{qa.amount}</p>
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
                <p className="font-semibold mt-1">{settings.currency}{bill.amount.toLocaleString()}</p>
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
            <p className="text-muted-foreground text-sm text-center py-4">No expenses yet.</p>
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
                  {settings.currency}{expense.amount.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-28 right-4 sm:right-auto sm:left-1/2 sm:ml-[160px] w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

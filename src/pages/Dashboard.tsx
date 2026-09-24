import { Link } from "react-router-dom";
import { vibrate } from "../lib/utils";
import { useExpenseStore } from "../store/useExpenseStore";
import { useDashboardData } from "../hooks/useDashboardData";
import { Card, CardContent } from "../components/ui/card";
import { isThisMonth, isToday, isThisWeek, parseISO, format, subDays, isSameDay, startOfWeek, addDays } from "date-fns";
import { cn } from "../lib/utils";
import { formatCurrency } from "../lib/formatCurrency";
import { Eye, EyeOff, Plus, Clock, X, Settings as SettingsIcon, CopyPlus, ReceiptText, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { calculateStreak } from "../lib/streak";
import { calculateCashflowSummary } from "../lib/cashflow";
import { parseNLPExpense } from "../lib/nlpExpenseParser";
import { detectAnomalies } from "../lib/anomalyDetector";
import { SafeToSpendCard } from "../components/dashboard/SafeToSpendCard";
import { AccountsSummaryBar } from "../components/accounts/AccountsSummaryBar";
import { motion, AnimatePresence } from "framer-motion";
import { BudgetRing } from "../components/ui/BudgetRing";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { playSuccessSound } from "../lib/sound";
import { toast } from "sonner";
import { CategoryBadge } from "../components/ui/CategoryBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { checkIsAdmin } from "../lib/admin";

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse mt-2">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-secondary/80 rounded-xl" />
        <div className="h-4 w-24 bg-secondary/80 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-9 bg-secondary/80 rounded-full" />
        <div className="h-9 w-9 bg-secondary/80 rounded-full" />
      </div>
    </div>
    <div className="h-10 w-full bg-secondary/80 rounded-2xl" />
    <div className="h-56 w-full bg-secondary/80 rounded-3xl" />
    <div className="h-40 w-full bg-secondary/80 rounded-3xl" />
    <div className="grid grid-cols-2 gap-4">
      <div className="h-32 bg-secondary/80 rounded-3xl" />
      <div className="h-32 bg-secondary/80 rounded-3xl" />
    </div>
    <div className="h-36 w-full bg-secondary/80 rounded-3xl" />
  </div>
);

export default function Dashboard() {
  const { settings, addExpense, deleteExpense, updateSettings, session, subscriptions, fetchCloudData } = useExpenseStore();
  const { expenses, bills, budgets, isLoading } = useDashboardData();
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const [dismissedAnomalyId, setDismissedAnomalyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dashboardSmartInput, setDashboardSmartInput] = useState("");

  const handleDashboardSmartSubmit = async () => {
    if (!dashboardSmartInput.trim()) return;
    const parsed = parseNLPExpense(dashboardSmartInput, settings.categories);
    if (!parsed.amount) {
      toast.error('Could not detect an amount. E.g. "Coffee 150"');
      return;
    }
    vibrate(20);
    if (settings.soundEnabled) playSuccessSound();
    const defaultAccount = useExpenseStore.getState().accounts?.[0]?.id;
    const newId = await addExpense({
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.category || settings.categories[0] || 'Other',
      date: parsed.date ? new Date(`${parsed.date}T12:00:00.000Z`).toISOString() : new Date().toISOString(),
      notes: parsed.tags.length > 0 ? parsed.tags.join(' ') : undefined,
      account_id: defaultAccount || undefined,
    });
    setDashboardSmartInput('');
    toast.success(`Logged ${parsed.description} (${formatCurrency(parsed.amount, settings.currency)})`, {
      action: {
        label: 'Undo',
        onClick: () => {
          vibrate(15);
          deleteExpense(newId);
          toast.info(`Undone: ${parsed.description} removed`);
        },
      },
    });
  };

  useEffect(() => {
    if (session?.user?.email || session?.user?.id) {
      checkIsAdmin(session.user.email, session.user.id).then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [session]);

  useEffect(() => {
    useExpenseStore.getState().reconcileAccountsWithBudget?.();
  }, []);

  const displayName = useMemo(() => {
    if (settings.userName?.trim()) return settings.userName.trim();
    const fullName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
    if (fullName) return fullName.split(' ')[0];
    const emailPrefix = session?.user?.email?.split('@')[0];
    if (emailPrefix) {
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return "Nithin";
  }, [settings.userName, session]);

  const currentStreak = useMemo(() => calculateStreak(expenses) || settings.currentStreak || 0, [expenses, settings.currentStreak]);

  const upcomingAlert = useMemo(() => {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const dueSub = (subscriptions || []).find(s => {
      if (!s.next_billing_date) return false;
      const d = new Date(s.next_billing_date);
      return d <= in48h && d >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
    });

    if (dueSub && dueSub.id !== dismissedAlertId) {
      return {
        id: dueSub.id,
        name: dueSub.name,
        amount: dueSub.amount,
        category: dueSub.category || 'Bills',
        dueDate: dueSub.next_billing_date,
      };
    }
    return null;
  }, [subscriptions, dismissedAlertId]);

  const activeAnomaly = useMemo(() => {
    const list = detectAnomalies(expenses, subscriptions, bills);
    return list.find((a) => a.id !== dismissedAnomalyId) || null;
  }, [expenses, subscriptions, bills, dismissedAnomalyId]);

  // Must stay above the early return so this hook is called unconditionally
  const cashflow = useMemo(() => {
    return calculateCashflowSummary(
      settings.monthlyIncome,
      expenses,
      bills,
      subscriptions,
      new Date()
    );
  }, [settings.monthlyIncome, expenses, bills, subscriptions]);

  const quickAdds = settings.quickAdds || [];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const currentMonthRecords = expenses.filter(e => isThisMonth(parseISO(e.date)));
  const incomeRecords = currentMonthRecords.filter(e => e.category === 'Income');
  const currentMonthExpenses = currentMonthRecords.filter(e => e.category !== 'Income' && e.category !== 'Transfer');

  const extraIncome = incomeRecords.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = cashflow.totalExpenses;
  const totalDueObligations = cashflow.dueBillsAmount + cashflow.dueSubsAmount;
  const upcomingObligations = cashflow.upcomingObligationsTotal;
  
  const totalBudget = cashflow.totalBudget;
  const remaining = cashflow.availableBalance;
  const budgetUsedPercent = Math.min(100, Math.round(((totalExpenses + totalDueObligations) / (totalBudget || 1)) * 100) || 0);

  const todayExpenses = currentMonthExpenses.filter(e => isToday(parseISO(e.date))).reduce((sum, e) => sum + e.amount, 0);
  const weekExpenses = currentMonthExpenses.filter(e => isThisWeek(parseISO(e.date))).reduce((sum, e) => sum + e.amount, 0);

  const yesterday = subDays(new Date(), 1);
  const yesterdayExpenses = currentMonthExpenses
    .filter(e => isSameDay(parseISO(e.date), yesterday))
    .reduce((sum, e) => sum + e.amount, 0);

  const diffYesterday = todayExpenses - yesterdayExpenses;
  const pctYesterday = Math.round((Math.abs(diffYesterday) / (yesterdayExpenses || 1)) * 100);
  let todayComparison = { text: "Equal to yesterday", color: "muted" };
  if (todayExpenses === 0 && yesterdayExpenses === 0) {
    todayComparison = { text: "No spend today", color: "emerald" };
  } else if (yesterdayExpenses === 0 && todayExpenses > 0) {
    todayComparison = { text: "First spend today", color: "muted" };
  } else if (diffYesterday < 0) {
    todayComparison = { text: `↓ ${pctYesterday}% vs yesterday`, color: "emerald" };
  } else if (diffYesterday > 0) {
    todayComparison = { text: `↑ ${pctYesterday}% vs yesterday`, color: "amber" };
  }

  const now = new Date();
  const currentDayIdx = (now.getDay() + 6) % 7;
  const daysElapsed = currentDayIdx + 1;
  const dailyAvg = Math.round(weekExpenses / daysElapsed);

  // Daily Allowance Calculation for Today
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeftInMonth = Math.max(1, daysInCurrentMonth - now.getDate() + 1);
  const dailyBudgetAllowance = Math.max(0, Math.round(remaining / daysLeftInMonth));
  const todayRemainingAllowance = dailyBudgetAllowance - todayExpenses;

  // 7-Day Micro Sparkline Data
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDailySpends = Array.from({ length: 7 }, (_, i) => {
    const pipDate = addDays(weekStart, i);
    const daySpend = currentMonthExpenses
      .filter(e => isSameDay(parseISO(e.date), pipDate))
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
      name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      amount: daySpend,
      isCurrentDay: i === currentDayIdx,
      isPast: i < currentDayIdx,
      isFuture: i > currentDayIdx,
    };
  });
  const maxDaySpend = Math.max(...weekDailySpends.map(d => d.amount), 1);

  // Weekly Pacing Status
  let paceStatus = { text: "On Track", color: "emerald" };
  if (remaining <= 0) {
    paceStatus = { text: "Over Budget", color: "destructive" };
  } else if (dailyBudgetAllowance > 0 && dailyAvg > dailyBudgetAllowance * 1.25) {
    paceStatus = { text: "High Pace", color: "amber" };
  } else if (dailyAvg <= dailyBudgetAllowance) {
    paceStatus = { text: "On Track", color: "emerald" };
  }

  const weekIntelligence = { dailyAvg, dailySpends: weekDailySpends, maxDaySpend, paceStatus };

  const isOverBudget = remaining < 0;

  // Recent expenses (last 5, showing latest non-income transactions across month boundaries)
  const recentExpenses = [...expenses]
    .filter(e => e.category !== 'Income')
    .sort((a, b) => {
      const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return expenses.indexOf(b) - expenses.indexOf(a);
    })
    .slice(0, 5);

  const handleAddIncome = () => {
    if (!incomeSource || !incomeAmount) return;
    vibrate();
    const defaultAccount = useExpenseStore.getState().accounts?.[0]?.id;
    addExpense({
      amount: parseFloat(incomeAmount),
      description: incomeSource,
      category: "Income",
      date: new Date().toISOString(),
      account_id: defaultAccount || undefined,
    });
    setIncomeSource("");
    setIncomeAmount("");
    setIsIncomeModalOpen(false);
  };

  return (
    <PullToRefresh onRefresh={fetchCloudData}>
      <div className="space-y-5 sm:space-y-6 pb-12">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold display-title leading-tight truncate">
              {displayName}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 truncate">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentStreak > 0 ? (
              <div className="flex items-center gap-1 bg-orange-500/10 text-orange-500 px-2 sm:px-3 py-1.5 rounded-full font-medium text-xs sm:text-sm border border-orange-500/20 shadow-xs animate-in fade-in zoom-in">
                <span>🔥</span>
                <span>
                  {currentStreak}
                  <span className="hidden sm:inline"> Day Streak</span>
                  <span className="sm:hidden">d</span>
                </span>
              </div>
            ) : null}

            <button 
              onClick={() => {
                vibrate(15);
                updateSettings({ privacyMode: !settings.privacyMode });
              }}
              aria-label={settings.privacyMode ? "Show budget" : "Hide budget"}
              className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-100 bg-secondary/60 hover:bg-secondary rounded-full shadow-xs border border-border/50 select-none cursor-pointer"
            >
              {settings.privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => vibrate(15)}
                aria-label="Admin Portal"
                title="Admin Portal"
                className="w-9 h-9 flex items-center justify-center text-primary hover:text-primary active:scale-95 transition-all duration-100 bg-primary/10 hover:bg-primary/20 rounded-full shadow-xs border border-primary/25 select-none animate-in fade-in"
              >
                <ShieldCheck className="w-4 h-4" />
              </Link>
            )}

            <Link
              to="/settings"
              onClick={() => vibrate(15)}
              aria-label="Settings"
              className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-100 bg-secondary/60 hover:bg-secondary rounded-full shadow-xs border border-border/50 select-none"
            >
              <SettingsIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Smart Quick-Log Magic Bar */}
        <div className="flex items-center gap-2 bg-card/85 dark:bg-card/75 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-1.5 px-3.5 shadow-xs transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary">
          <Sparkles className="w-4 h-4 text-primary shrink-0 animate-pulse" />
          <input
            type="text"
            placeholder="Smart log: 'Coffee 150' or 'Uber 300'..."
            value={dashboardSmartInput}
            onChange={(e) => setDashboardSmartInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDashboardSmartSubmit();
              }
            }}
            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          {dashboardSmartInput && (
            <div className="flex items-center gap-1 shrink-0 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => setDashboardSmartInput('')}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <Button
                size="sm"
                className="h-7 text-xs px-2.5 rounded-xl font-medium cursor-pointer"
                onClick={handleDashboardSmartSubmit}
              >
                Log
              </Button>
            </div>
          )}
        </div>

        {/* Upcoming Due Date Pill */}
        <AnimatePresence>
          {upcomingAlert && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="flex items-center justify-between gap-3 p-3 px-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 backdrop-blur-md shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    ⚡ {upcomingAlert.name} due soon
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {formatCurrency(upcomingAlert.amount, settings.currency)} • Due {format(parseISO(upcomingAlert.dueDate), 'MMM d')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  className="h-7 text-xs px-3 rounded-full shadow-xs bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => {
                    vibrate(20);
                    if (settings.soundEnabled) playSuccessSound();
                    const defaultAccount = useExpenseStore.getState().accounts?.[0]?.id;
                    addExpense({
                      amount: upcomingAlert.amount,
                      description: `${upcomingAlert.name} Payment`,
                      category: upcomingAlert.category,
                      date: new Date().toISOString(),
                      notes: "Paid via Upcoming Due Alert",
                      account_id: defaultAccount || undefined,
                    });
                    toast.success(`${upcomingAlert.name} marked as paid!`);
                    setDismissedAlertId(upcomingAlert.id);
                  }}
                >
                  Pay
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
                  onClick={() => {
                    vibrate(10);
                    setDismissedAlertId(upcomingAlert.id);
                  }}
                  aria-label="Dismiss alert"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spending Anomaly Alert Pill */}
        <AnimatePresence>
          {activeAnomaly && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="flex items-center justify-between gap-3 p-3 px-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 backdrop-blur-md shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {activeAnomaly.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeAnomaly.description}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full shrink-0 cursor-pointer"
                onClick={() => {
                  vibrate(10);
                  setDismissedAnomalyId(activeAnomaly.id);
                }}
                aria-label="Dismiss anomaly alert"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Stats Card with Integrated Daily Safe-to-Spend Runway */}
        <Card className={cn(
          "border shadow-xl overflow-hidden relative rounded-3xl backdrop-blur-2xl transition-all duration-500",
          "border-t border-white/40 dark:border-white/20",
          isOverBudget 
            ? "bg-destructive/10 border-destructive/25 shadow-destructive/10" 
            : budgetUsedPercent >= 75
            ? "bg-amber-500/10 border-amber-500/25 shadow-amber-500/10"
            : "bg-card/85 dark:bg-card/65 border-white/20 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
        )}>
          {/* Dynamic Ambient Rim Bloom */}
          <div 
            className={cn(
              "absolute -top-14 -right-14 w-52 h-52 rounded-full blur-3xl pointer-events-none transition-colors duration-1000",
              isOverBudget ? "bg-rose-500/30" : budgetUsedPercent >= 75 ? "bg-amber-500/25" : "bg-primary/20"
            )} 
          />
          {/* Subtle inner sheen */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent dark:from-white/5 pointer-events-none" />
          <CardContent className="p-4 sm:p-6 relative z-10 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                  <span>Monthly Budget</span>
                  <button 
                    onClick={() => { vibrate(15); setIsIncomeModalOpen(true); }}
                    className="w-4 h-4 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground active:scale-90 rounded-full flex items-center justify-center transition-all duration-100 cursor-pointer shrink-0"
                    aria-label="Add Extra Income"
                    title="Add Extra Income"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </p>
                <div className="text-lg sm:text-xl font-bold flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 display-number leading-tight">
                  <AnimatedNumber
                    value={settings.monthlyIncome}
                    formatFn={(val) => formatCurrency(val, settings.currency, settings.privacyMode)}
                  />
                  {!settings.privacyMode && extraIncome > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">+{formatCurrency(extraIncome, settings.currency, settings.privacyMode)}</span>
                  )}
                </div>
              </div>
              <div className="text-right min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Bills (Due)</p>
                <p className="text-lg sm:text-xl font-bold display-number leading-tight">
                  <AnimatedNumber
                    value={totalDueObligations}
                    formatFn={(val) => formatCurrency(val, settings.currency)}
                  />
                </p>
                {upcomingObligations > 0 && (
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate" title="Upcoming bills & subscriptions due later this month">
                    +{formatCurrency(upcomingObligations, settings.currency)} upcoming
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Remaining Budget</p>
                <h2 className={cn("text-2xl sm:text-3xl font-bold display-number tracking-tight leading-tight truncate", isOverBudget ? "text-destructive" : "text-primary")}>
                  <AnimatedNumber
                    value={remaining}
                    formatFn={(val) => formatCurrency(val, settings.currency)}
                  />
                </h2>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Spent: <span className="font-semibold text-foreground"><AnimatedNumber value={totalExpenses} formatFn={(val) => formatCurrency(val, settings.currency)} /></span>
                </p>
              </div>
              <div className="shrink-0 flex items-center justify-center">
                <BudgetRing
                  value={budgetUsedPercent}
                  size={76}
                  strokeWidth={7.5}
                  isOverBudget={isOverBudget}
                />
              </div>
            </div>

            {isOverBudget && (
              <p className="text-xs text-destructive mt-1 font-medium flex items-center gap-1">
                ⚠️ You exceeded your monthly budget.
              </p>
            )}

            {/* Seamless Integrated Safe-to-Spend Daily Runway */}
            <div className="pt-3.5 border-t border-border/40 dark:border-white/10">
              <SafeToSpendCard
                availableBalance={remaining}
                upcomingObligations={upcomingObligations}
                currency={settings.currency}
                totalMonthlyBudget={settings.monthlyIncome}
                variant="embedded"
              />
            </div>
          </CardContent>
        </Card>

        {/* Multi-Account & Net-Worth Summary */}
        <AccountsSummaryBar />

        {/* Add Extra Income Modal Dialog */}
        <AnimatePresence>
          {isIncomeModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsIncomeModalOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 450, damping: 28 }}
                className="relative w-full max-w-sm rounded-3xl bg-card border border-border/60 shadow-2xl p-5 space-y-4 z-10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Add Extra Income</h3>
                      <p className="text-[11px] text-muted-foreground">Boost your budget for this month</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-full text-muted-foreground cursor-pointer"
                    onClick={() => setIsIncomeModalOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddIncome();
                  }}
                  className="space-y-3.5"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Income Source
                    </label>
                    <Input 
                      placeholder="e.g. Sold old phone, Freelance, Bonus" 
                      value={incomeSource}
                      onChange={(e) => setIncomeSource(e.target.value)}
                      autoFocus
                      required
                      className="rounded-xl bg-secondary/50 border-border/50 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Amount ({settings.currency})
                    </label>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value)}
                      required
                      className="rounded-xl bg-secondary/50 border-border/50 text-sm font-bold display-number"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button variant="ghost" size="sm" type="button" onClick={() => setIsIncomeModalOpen(false)} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium cursor-pointer">
                      Add Income
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      {/* Daily Spending & Contextual Intelligence */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Today Card */}
        <Card className="rounded-3xl border border-white/20 dark:border-white/10 bg-card/85 dark:bg-card/75 backdrop-blur-2xl shadow-xs overflow-hidden">
          <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full space-y-2">
            <div>
              <div className="h-5 flex items-center justify-between gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today</p>
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0",
                  todayComparison.color === "emerald" 
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                    : todayComparison.color === "amber" 
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {todayComparison.text}
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-bold display-number tracking-tight mt-1 text-foreground leading-tight truncate">
                <AnimatedNumber value={todayExpenses} formatFn={(v) => formatCurrency(v, settings.currency)} />
              </p>
            </div>

            {/* Daily Allowance Context */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-1">
                <span className="truncate">Daily allowance</span>
                <span className={cn(
                  "font-semibold display-number text-[11px] shrink-0",
                  todayRemainingAllowance < 0 ? "text-amber-500" : "text-foreground"
                )}>
                  {formatCurrency(Math.max(0, todayRemainingAllowance), settings.currency)} left
                </span>
              </div>
              <div className="w-full h-1.5 bg-secondary/80 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    dailyBudgetAllowance === 0 
                      ? "bg-muted-foreground/30 w-0" 
                      : todayExpenses > dailyBudgetAllowance 
                      ? "bg-amber-500" 
                      : "bg-primary"
                  )}
                  style={{
                    width: dailyBudgetAllowance > 0 
                      ? `${Math.min(100, Math.round((todayExpenses / dailyBudgetAllowance) * 100))}%` 
                      : '0%'
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Week Card */}
        <Card className="rounded-3xl border border-white/20 dark:border-white/10 bg-card/85 dark:bg-card/75 backdrop-blur-2xl shadow-xs overflow-hidden">
          <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full space-y-2">
            <div>
              <div className="h-5 flex items-center justify-between gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This Week</p>
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0",
                  weekIntelligence.paceStatus.color === "emerald"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : weekIntelligence.paceStatus.color === "amber"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-destructive/15 text-destructive"
                )}>
                  {weekIntelligence.paceStatus.text}
                </span>
              </div>
              <div className="mt-1">
                <p className="text-xl sm:text-2xl font-bold display-number tracking-tight text-foreground leading-tight truncate">
                  <AnimatedNumber value={weekExpenses} formatFn={(v) => formatCurrency(v, settings.currency)} />
                </p>
                <span className="text-[10.5px] font-medium text-muted-foreground block truncate">
                  Avg {formatCurrency(weekIntelligence.dailyAvg, settings.currency)}/d
                </span>
              </div>
            </div>

            {/* 7-Day Apple Micro-Sparkline */}
            <div className="flex items-end justify-between gap-1 pt-1 h-9">
              {weekIntelligence.dailySpends.map((day, idx) => {
                const barPercent = weekIntelligence.maxDaySpend > 0 && day.amount > 0
                  ? Math.max(25, Math.round((day.amount / weekIntelligence.maxDaySpend) * 100))
                  : 14;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                    title={`${day.name}: ${formatCurrency(day.amount, settings.currency)}`}
                  >
                    <div className="w-full flex items-end justify-center h-5">
                      <div
                        style={{ height: `${barPercent}%` }}
                        className={cn(
                          "w-2 rounded-full transition-all duration-300",
                          day.isCurrentDay
                            ? "bg-primary shadow-[0_0_8px_rgba(0,122,255,0.4)]"
                            : day.amount > 0
                            ? "bg-primary/65 group-hover:bg-primary/90"
                            : day.isPast
                            ? "bg-muted-foreground/20"
                            : "bg-muted/40"
                        )}
                      />
                    </div>
                    <span className={cn(
                      "text-[9px] font-medium transition-colors",
                      day.isCurrentDay ? "text-primary font-bold" : "text-muted-foreground/70"
                    )}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Budgets */}
      <Card className="rounded-3xl border border-white/20 dark:border-white/10 bg-card/85 dark:bg-card/75 backdrop-blur-2xl shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">Category Budgets</h3>
            <Link to="/settings" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
              Manage →
            </Link>
          </div>
          <div className="space-y-3.5">
            {budgets.filter(b => b.month === new Date().toISOString().slice(0, 7) && settings.categories.includes(b.category)).length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border/50 rounded-2xl">
                No budgets set for this month. Head over to <Link to="/settings" className="font-medium text-foreground underline">Settings</Link> to create limits!
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
                    <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{settings.categoryEmojis?.[cat] || '🏷️'}</span>
                        <span className="font-medium truncate">{cat}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground text-xs display-number">
                        <span>{formatCurrency(spent, settings.currency)}</span>
                        <span>/</span>
                        <span>{formatCurrency(limit, settings.currency)}</span>
                        <span className={cn(
                          "ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                          isDanger ? "bg-rose-500/15 text-rose-500" : isWarning ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground"
                        )}>
                          {Math.round(percentage)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary/80 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isDanger ? 'bg-destructive' : isWarning ? 'bg-amber-500' : 'bg-primary'
                        )}
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
          <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wider mb-2.5">Quick Add</h3>
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-3.5 sm:-mx-4 px-3.5 sm:px-4 scrollbar-hide">
            {quickAdds.map(qa => (
              <motion.button 
                key={qa.description}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                onClick={async () => {
                  vibrate(15);
                  if (settings.soundEnabled) playSuccessSound();
                  const defaultAccount = useExpenseStore.getState().accounts?.[0]?.id;
                  const newId = await addExpense({
                    amount: qa.amount,
                    description: qa.description,
                    category: qa.category,
                    date: new Date().toISOString(),
                    account_id: defaultAccount || undefined,
                  });
                  toast.success(`Logged ${qa.description} (${formatCurrency(qa.amount, settings.currency)})`, {
                    action: {
                      label: "Undo",
                      onClick: () => {
                        vibrate(15);
                        deleteExpense(newId);
                        toast.info(`Undone: ${qa.description} removed`);
                      }
                    }
                  });
                }}
                className="flex items-center gap-2.5 bg-card/85 hover:bg-card border border-white/20 dark:border-white/10 px-3.5 py-2.5 rounded-2xl whitespace-nowrap shrink-0 transition-colors shadow-xs select-none cursor-pointer"
              >
                <span className="text-xl">{qa.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-semibold leading-none">{qa.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 display-number">{formatCurrency(qa.amount, settings.currency)}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Bills */}
      {bills.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">Upcoming Bills</h3>
            <Link to="/planned" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
              View all →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-3.5 sm:-mx-4 px-3.5 sm:px-4 scrollbar-hide">
            {bills.map(bill => (
              <div key={bill.id} className="bg-card/85 dark:bg-card/75 border border-white/20 dark:border-white/10 rounded-2xl p-3 shrink-0 w-[140px] shadow-xs flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 truncate">
                    {bill.due_day ? `Due ${bill.due_day}th` : bill.due_date ? `Due ${format(parseISO(bill.due_date), 'MMM d')}` : bill.autoDeduct ? 'Auto-deduct' : 'Manual'}
                  </p>
                  <p className="font-semibold text-sm truncate text-foreground leading-tight">{bill.title}</p>
                </div>
                <p className="font-bold text-sm mt-2 text-foreground display-number">{formatCurrency(bill.amount, settings.currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">Recent Expenses</h3>
          <Link to="/expenses" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
            View all →
          </Link>
        </div>
        <div className="space-y-2.5">
          {recentExpenses.length === 0 ? (
            <EmptyState
              icon={<ReceiptText className="w-7 h-7" />}
              title="No expenses logged yet"
              description="Tap the quick-add buttons above or + to record today's spending."
              compact
              actionLabel="+ Add Expense"
              onAction={() => useExpenseStore.getState().setModalOpen(true)}
            />
          ) : (
            recentExpenses.map((expense) => (
              <motion.div
                key={expense.id}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 450, damping: 26 }}
                className="flex justify-between items-center p-3 sm:p-3.5 bg-card/85 dark:bg-card/75 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xs hover:border-primary/30 transition-colors"
              >
                <Link to="/expenses" className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0 shadow-xs">
                    {settings.categoryEmojis?.[expense.category] || expense.category.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-tight truncate text-foreground">{expense.description}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-muted-foreground">{format(parseISO(expense.date), 'MMM d')}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <CategoryBadge category={expense.category} size="xs" />
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="font-bold text-sm display-number text-foreground">
                    {formatCurrency(expense.amount, settings.currency)}
                  </div>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      vibrate(20);
                      if (settings.soundEnabled) playSuccessSound();
                      const defaultAccount = useExpenseStore.getState().accounts?.[0]?.id;
                      const newId = await addExpense({
                        amount: expense.amount,
                        description: expense.description,
                        category: expense.category,
                        date: new Date().toISOString(),
                        notes: expense.notes,
                        account_id: expense.account_id || defaultAccount || undefined,
                      });
                      toast.success(`Logged ${expense.description} (${formatCurrency(expense.amount, settings.currency)}) for today`, {
                        action: {
                          label: "Undo",
                          onClick: () => {
                            vibrate(15);
                            deleteExpense(newId);
                            toast.info(`Undone: ${expense.description} removed`);
                          }
                        }
                      });
                    }}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-90 transition-all select-none cursor-pointer"
                    title="Log again for today"
                    aria-label={`Log ${expense.description} again for today`}
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      </div>
    </PullToRefresh>
  );
}

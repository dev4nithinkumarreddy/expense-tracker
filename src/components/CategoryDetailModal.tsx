import { motion, AnimatePresence } from "framer-motion";
import { X, Receipt, TrendingUp, TrendingDown, CopyPlus, PieChart as PieIcon, Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Expense } from "../store/useExpenseStore";
import { formatCurrency } from "../lib/formatCurrency";
import { Button } from "./ui/button";
import { vibrate, cn } from "../lib/utils";

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  emoji?: string;
  monthLabel: string;
  currency: string;
  expenses: Expense[];
  previousMonthSpend?: number;
  totalMonthExpenses?: number;
  categoryBudget?: number;
  onLogAgain?: (expense: Expense) => void;
}

export function CategoryDetailModal({
  isOpen,
  onClose,
  category,
  emoji,
  monthLabel,
  currency,
  expenses,
  previousMonthSpend,
  totalMonthExpenses,
  categoryBudget,
  onLogAgain
}: CategoryDetailModalProps) {
  const totalCurrent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const txCount = expenses.length;
  const avgTx = txCount > 0 ? Math.round(totalCurrent / txCount) : 0;
  const sharePercent = totalMonthExpenses && totalMonthExpenses > 0 
    ? ((totalCurrent / totalMonthExpenses) * 100).toFixed(1) 
    : null;

  // Month-over-Month calculation
  let momComparison: { text: string; color: "emerald" | "amber" | "muted"; icon: typeof TrendingUp | null } | null = null;
  if (previousMonthSpend !== undefined) {
    const diff = totalCurrent - previousMonthSpend;
    if (previousMonthSpend === 0 && totalCurrent > 0) {
      momComparison = { text: "New category this month", color: "emerald", icon: null };
    } else if (previousMonthSpend > 0) {
      const pct = Math.round((Math.abs(diff) / previousMonthSpend) * 100);
      if (diff > 0) {
        momComparison = { 
          text: `+${pct}% vs last mo (+${formatCurrency(diff, currency)})`, 
          color: "amber", 
          icon: TrendingUp 
        };
      } else if (diff < 0) {
        momComparison = { 
          text: `-${pct}% vs last mo (-${formatCurrency(Math.abs(diff), currency)})`, 
          color: "emerald", 
          icon: TrendingDown 
        };
      } else {
        momComparison = { text: "Same as last month", color: "muted", icon: null };
      }
    }
  }

  // Category Budget Calculation
  const isBudgeted = categoryBudget !== undefined && categoryBudget > 0;
  const budgetUsedPct = isBudgeted ? Math.min(100, Math.round((totalCurrent / categoryBudget) * 100)) : 0;
  const isOverBudget = isBudgeted && totalCurrent > categoryBudget;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            onClick={() => {
              vibrate(10);
              onClose();
            }}
            className="fixed inset-0 bg-background/70 backdrop-blur-md"
          />

          {/* Centered Apple Floating Card */}
          <motion.div 
            initial={{ scale: 0.94, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 14 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 340,
              mass: 0.85
            }}
            className="w-full max-w-lg bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-[32px] overflow-hidden flex flex-col max-h-[88vh] z-10 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 pt-4 pb-3 border-b border-border/50 shrink-0 bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl bg-card border border-border/60 shadow-xs">
                  {emoji || category.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight tracking-tight text-foreground">{category}</h2>
                  <p className="text-xs text-muted-foreground">{monthLabel} · {txCount} {txCount === 1 ? 'transaction' : 'transactions'}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  vibrate(10);
                  onClose();
                }} 
                aria-label="Close modal"
                className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground active:scale-95"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Total Spent & MoM Insights Hero */}
            <div className="px-5 py-4 bg-secondary/20 border-b border-border/50 space-y-3 shrink-0">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Spent</span>
                  <div className="text-3xl font-black text-foreground tracking-tight display-number mt-0.5">
                    {formatCurrency(totalCurrent, currency)}
                  </div>
                </div>

                {momComparison && (
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1",
                    momComparison.color === "emerald" 
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                      : momComparison.color === "amber" 
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {momComparison.icon && <momComparison.icon className="w-3.5 h-3.5" />}
                    <span>{momComparison.text}</span>
                  </span>
                )}
              </div>

              {/* Quick Metrics Pills */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {sharePercent && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-background/80 border border-border/50 text-xs">
                    <PieIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground truncate">Share of month:</span>
                    <span className="font-semibold text-foreground ml-auto">{sharePercent}%</span>
                  </div>
                )}
                <div className="flex items-center gap-2 p-2 rounded-xl bg-background/80 border border-border/50 text-xs">
                  <span className="text-muted-foreground truncate">Avg per expense:</span>
                  <span className="font-semibold text-foreground ml-auto display-number">{formatCurrency(avgTx, currency)}</span>
                </div>
              </div>

              {/* Category Budget Pacing Gauge */}
              {isBudgeted && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Category Budget</span>
                    </span>
                    <span className={cn("font-semibold display-number", isOverBudget ? "text-destructive" : "text-muted-foreground")}>
                      {formatCurrency(totalCurrent, currency)} / {formatCurrency(categoryBudget, currency)} ({budgetUsedPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isOverBudget ? "bg-destructive" : budgetUsedPct >= 80 ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${budgetUsedPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Individual Transactions List */}
            <div className="overflow-y-auto p-4 space-y-2 flex-1 divide-y divide-border/30 scrollbar-hide">
              {expenses.length === 0 ? (
                <div className="text-center py-10 space-y-1">
                  <p className="text-foreground text-sm font-medium">No expenses logged for {category}</p>
                  <p className="text-xs text-muted-foreground">Transactions logged for {monthLabel} will appear here.</p>
                </div>
              ) : (
                expenses.map((expense) => {
                  let displayDate = expense.date.split('T')[0];
                  try {
                    displayDate = format(parseISO(expense.date), 'EEE, MMM d');
                  } catch {
                    // fallback
                  }

                  return (
                    <div key={expense.id} className="pt-2.5 first:pt-0 flex justify-between items-center gap-3 group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug truncate text-foreground">{expense.description || category}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{displayDate}</span>
                          {expense.receipt_url && (
                            <span className="inline-flex items-center text-[10px] text-primary gap-0.5 bg-primary/10 px-1.5 py-0.5 rounded-full font-medium">
                              <Receipt className="w-3 h-3" /> Receipt
                            </span>
                          )}
                        </div>
                        {expense.notes && (
                          <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-1 italic">{expense.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold display-number">
                          {formatCurrency(expense.amount, currency)}
                        </span>

                        {onLogAgain && (
                          <button
                            type="button"
                            onClick={() => onLogAgain(expense)}
                            className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-90 transition-all select-none"
                            title="Log again for today"
                            aria-label={`Log ${expense.description} again for today`}
                          >
                            <CopyPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border/50 bg-secondary/30 shrink-0 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  vibrate(10);
                  onClose();
                }}
                className="rounded-full px-4 text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

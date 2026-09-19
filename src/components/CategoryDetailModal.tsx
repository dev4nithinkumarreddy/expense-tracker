import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Expense } from "../store/useExpenseStore";
import { formatCurrency } from "../lib/formatCurrency";
import { Button } from "./ui/button";
import { vibrate } from "../lib/utils";

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  emoji?: string;
  monthLabel: string;
  currency: string;
  expenses: Expense[];
}

export function CategoryDetailModal({
  isOpen,
  onClose,
  category,
  emoji,
  monthLabel,
  currency,
  expenses
}: CategoryDetailModalProps) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/70 backdrop-blur-md"
          />
          <motion.div 
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_e, info: PanInfo) => {
              if (info.offset.y > 100 || info.velocity.y > 350) {
                vibrate(20);
                onClose();
              }
            }}
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 320,
            }}
            className="glass-card text-card-foreground w-full max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden z-10 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto my-2.5 shrink-0 cursor-grab active:cursor-grabbing" />

            {/* Header */}
            <div className="flex justify-between items-center px-4 pb-3 border-b shrink-0 bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-background border shadow-xs">
                  {emoji || category.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold leading-tight tracking-tight">{category}</h2>
                  <p className="text-xs text-muted-foreground">{monthLabel} · {expenses.length} transactions</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Total Banner */}
            <div className="px-5 py-3 bg-secondary/20 flex justify-between items-center border-b">
              <span className="text-xs font-medium text-muted-foreground">Total Spent</span>
              <span className="text-lg font-bold text-foreground display-number">{formatCurrency(total, currency)}</span>
            </div>

            {/* Expense List */}
            <div className="overflow-y-auto p-4 space-y-2.5 flex-1 divide-y divide-border/40 scrollbar-hide">
              {expenses.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No expenses logged for {category} in {monthLabel}.</p>
              ) : (
                expenses.map((expense) => {
                  let displayDate = expense.date.split('T')[0];
                  try {
                    displayDate = format(parseISO(expense.date), 'MMM d, yyyy');
                  } catch {
                    // fallback
                  }

                  return (
                    <div key={expense.id} className="pt-2.5 first:pt-0 flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug truncate">{expense.description || category}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{displayDate}</span>
                          {expense.receipt_url && (
                            <span className="inline-flex items-center text-[10px] text-primary gap-0.5 bg-primary/10 px-1.5 py-0.5 rounded-full">
                              <Receipt className="w-3 h-3" /> Receipt
                            </span>
                          )}
                        </div>
                        {expense.notes && (
                          <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1 italic">{expense.notes}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold shrink-0 display-number">
                        {formatCurrency(expense.amount, currency)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-secondary/30 shrink-0 flex justify-end">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

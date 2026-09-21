import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  X, 
  Calendar, 
  Plus, 
  CopyPlus, 
  Clock 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import type { Expense } from '../../store/useExpenseStore';
import { getExpenseLocalDate } from '../../lib/streak';

interface DateTransactionsInspectorProps {
  selectedDate: Date | null;
  onClose: () => void;
  expenses: Expense[];
  currency: string;
  onLogAgain?: (expense: Expense) => void;
}

export function DateTransactionsInspector({
  selectedDate,
  onClose,
  expenses,
  currency,
  onLogAgain
}: DateTransactionsInspectorProps) {
  const navigate = useNavigate();

  if (!selectedDate) return null;

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const dayExpenses = expenses.filter(
    (e) => getExpenseLocalDate(e.date) === dateKey && e.category !== 'Income' && e.amount > 0
  );

  const dayTotal = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className="p-5 sm:p-6 rounded-3xl bg-card/90 dark:bg-card/75 backdrop-blur-2xl border border-primary/25 shadow-lg shadow-primary/5 space-y-4 relative overflow-hidden"
      >
        {/* Ambient Top Highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground truncate">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {dayExpenses.length === 0
                  ? 'No transactions logged'
                  : `${dayExpenses.length} transaction${dayExpenses.length === 1 ? '' : 's'} recorded`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                vibrate(10);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        </div>

        {/* Day Total Banner */}
        <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/50 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Total Spent on this Date:</span>
          <span className="text-lg font-bold text-foreground font-mono">
            {formatCurrency(dayTotal, currency)}
          </span>
        </div>

        {/* Transactions List */}
        {dayExpenses.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-muted-foreground italic">
              No expenses were tracked on this date.
            </p>
            <button
              type="button"
              onClick={() => {
                vibrate(12);
                navigate(`/add?date=${dateKey}`);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Expense for this Date
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {dayExpenses.map((exp) => {
              let timeFormatted = '';
              try {
                timeFormatted = format(new Date(exp.date), 'h:mm a');
              } catch {
                timeFormatted = '';
              }

              return (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-all flex items-center justify-between gap-3 text-xs shadow-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">
                      {exp.description || 'Untitled Transaction'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-secondary/80 font-medium text-[10px]">
                        {exp.category}
                      </span>
                      {timeFormatted && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 opacity-60" />
                            {timeFormatted}
                          </span>
                        </>
                      )}
                      {exp.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{exp.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-bold text-sm text-foreground font-mono">
                      {formatCurrency(exp.amount, currency)}
                    </span>

                    {onLogAgain && (
                      <button
                        type="button"
                        onClick={() => onLogAgain(exp)}
                        className="p-1.5 rounded-xl bg-secondary/80 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                        title="Log again for today"
                      >
                        <CopyPlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

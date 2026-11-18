import React from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronRight } from 'lucide-react';
import { useExpenseStore, type Trip } from '../../store/useExpenseStore';
import { calculateTripSummary, isTripActiveOnDate } from '../../lib/tripCalculations';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';

interface ActiveTripBannerProps {
  onOpenTripDetails: (trip: Trip) => void;
  onAddTripExpense: (trip: Trip) => void;
}

export const ActiveTripBanner: React.FC<ActiveTripBannerProps> = ({
  onOpenTripDetails,
  onAddTripExpense
}) => {
  const { trips, activeTripId, expenses, debts, settings } = useExpenseStore();

  // Find active trip
  const activeTrip = React.useMemo(() => {
    if (activeTripId) {
      const found = trips.find((t) => t.id === activeTripId && t.status !== 'completed');
      if (found) return found;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return trips.find((t) => isTripActiveOnDate(t, todayStr)) || null;
  }, [trips, activeTripId]);

  if (!activeTrip) return null;

  const summary = calculateTripSummary(activeTrip, expenses, debts);
  const currency = activeTrip.currency || settings.currency || '₹';

  const healthColor =
    summary.budgetHealth === 'over'
      ? 'text-rose-500 bg-rose-500/10 border-rose-500/30'
      : summary.budgetHealth === 'warning'
      ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';

  const progressBg =
    summary.budgetHealth === 'over'
      ? 'bg-rose-500'
      : summary.budgetHealth === 'warning'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-5 shadow-sm"
    >
      {/* Decorative subtle backdrop pill */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl sm:text-4xl select-none p-2 bg-background/80 rounded-2xl border border-border/50 shadow-2xs">
            {activeTrip.coverEmoji || '🏖️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                Active Trip Mode
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${healthColor}`}>
                Day {summary.currentDay} of {summary.totalDays}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight mt-0.5">
              {activeTrip.name}
            </h3>
            {activeTrip.destination && (
              <p className="text-xs text-muted-foreground">{activeTrip.destination}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            vibrate(10);
            onOpenTripDetails(activeTrip);
          }}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors cursor-pointer"
          title="View Trip Breakdown"
          aria-label="View Trip Breakdown"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar & Pacing */}
      <div className="space-y-1.5 mb-3.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            Spent: <span className="font-semibold text-foreground">{formatCurrency(summary.totalSpent, currency)}</span>
            {activeTrip.budget > 0 && ` of ${formatCurrency(activeTrip.budget, currency)}`}
          </span>
          <span className="font-medium text-foreground">
            {summary.percentSpent}%
          </span>
        </div>
        <div className="h-2 w-full bg-secondary/80 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressBg} transition-all duration-300 rounded-full`}
            style={{ width: `${Math.min(100, summary.percentSpent)}%` }}
          />
        </div>
      </div>

      {/* Stats & Quick Action */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {summary.dailyAllowanceRemaining > 0 ? (
            <div>
              <span className="block text-[10px] uppercase tracking-wider">Daily Allowance</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(summary.dailyAllowanceRemaining, currency)}/day
              </span>
            </div>
          ) : (
            <div>
              <span className="block text-[10px] uppercase tracking-wider">Avg Daily Spent</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(summary.dailyAverageSpent, currency)}/day
              </span>
            </div>
          )}

          {summary.totalToCollect > 0 && (
            <div>
              <span className="block text-[10px] uppercase tracking-wider">To Collect</span>
              <span className="font-semibold text-emerald-500">
                +{formatCurrency(summary.totalToCollect, currency)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              vibrate(15);
              onAddTripExpense(activeTrip);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Trip Expense</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

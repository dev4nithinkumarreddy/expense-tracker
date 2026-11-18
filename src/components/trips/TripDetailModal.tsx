import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit2,
  Trash2,
  Share2,
  Plus,
  Calendar,
  MapPin,
  CheckCircle2,
  Link2,
  Link2Off
} from 'lucide-react';
import { useExpenseStore, type Trip } from '../../store/useExpenseStore';
import { calculateTripSummary } from '../../lib/tripCalculations';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { CategoryIcon } from '../ui/CategoryIcon';
import { isIncomeCategory } from '../../lib/categoryStyles';

interface TripDetailModalProps {
  isOpen: boolean;
  trip: Trip | null;
  onClose: () => void;
  onEditTrip: (trip: Trip) => void;
  onAddExpense: (trip: Trip) => void;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  isOpen,
  trip,
  onClose,
  onEditTrip,
  onAddExpense
}) => {
  const { expenses, debts, deleteTrip, updateTrip, deleteExpense, updateExpense, settings } = useExpenseStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'splits'>('overview');

  const unlinkedRecentExpenses = React.useMemo(() => {
    return expenses
      .filter((e) => !e.trip_id && !isIncomeCategory(e.category) && e.category !== 'Transfer')
      .slice(0, 10);
  }, [expenses]);

  if (!isOpen || !trip) return null;

  const summary = calculateTripSummary(trip, expenses, debts);
  const currency = trip.currency || settings.currency || '₹';

  const handleShareSummary = async () => {
    vibrate(10);
    const lines = [
      `${trip.coverEmoji || '🌴'} ${trip.name} Summary`,
      trip.destination ? `📍 ${trip.destination}` : '',
      `📅 ${trip.startDate} to ${trip.endDate} (${summary.totalDays} days)`,
      `💰 Total Spent: ${formatCurrency(summary.totalSpent, currency)} ${
        trip.budget > 0 ? `of ${formatCurrency(trip.budget, currency)} (${summary.percentSpent}%)` : ''
      }`,
      '',
      'Category Breakdown:',
      ...summary.categoryBreakdown.map(
        (c) => `• ${c.category}: ${formatCurrency(c.amount, currency)} (${c.percentage}%)`
      ),
      '',
      summary.totalToCollect > 0
        ? `🤝 Pending to collect from friends: ${formatCurrency(summary.totalToCollect, currency)}`
        : ''
    ]
      .filter(Boolean)
      .join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${trip.name} Expense Summary`,
          text: lines
        });
        toast.success('Summary shared!');
        return;
      } catch (err) {
        // User cancelled or fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(lines);
      toast.success('Trip summary copied to clipboard! 📋');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete trip "${trip.name}"? (Expenses will remain saved in your records)`)) {
      vibrate(20);
      deleteTrip(trip.id);
      toast.info(`Trip "${trip.name}" deleted`);
      onClose();
    }
  };

  const handleToggleStatus = () => {
    vibrate(10);
    const nextStatus = trip.status === 'completed' ? 'active' : 'completed';
    updateTrip(trip.id, { status: nextStatus });
    toast.success(`Trip marked as ${nextStatus}!`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-card border border-border/80 shadow-2xl rounded-3xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Top Banner / Hero Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-br from-primary/15 via-card to-card border-b border-border/50 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-4xl sm:text-5xl select-none p-2.5 bg-background/90 rounded-2xl border border-border/50 shadow-xs">
                  {trip.coverEmoji || '🌴'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        trip.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : trip.status === 'completed'
                          ? 'bg-secondary text-muted-foreground border-border/60'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      }`}
                    >
                      {trip.status === 'active' ? 'Active Trip' : trip.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {trip.startDate} to {trip.endDate} ({summary.totalDays}d)
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">{trip.name}</h2>
                  {trip.destination && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {trip.destination}
                    </p>
                  )}
                </div>
              </div>

              {/* Top Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleShareSummary}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  title="Share Trip Summary"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEditTrip(trip)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  title="Edit Trip Details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Delete Trip"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick KPI Stat Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
              <div className="bg-background/80 rounded-2xl p-3 border border-border/40">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Total Spent
                </span>
                <span className="text-lg font-bold text-foreground mt-0.5 block">
                  {formatCurrency(summary.totalSpent, currency)}
                </span>
              </div>
              <div className="bg-background/80 rounded-2xl p-3 border border-border/40">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Trip Budget
                </span>
                <span className="text-lg font-bold text-foreground mt-0.5 block">
                  {trip.budget > 0 ? formatCurrency(trip.budget, currency) : 'No limit'}
                </span>
              </div>
              <div className="bg-background/80 rounded-2xl p-3 border border-border/40">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Remaining
                </span>
                <span
                  className={`text-lg font-bold mt-0.5 block ${
                    summary.remainingBudget < 0 ? 'text-rose-500' : 'text-emerald-500'
                  }`}
                >
                  {formatCurrency(summary.remainingBudget, currency)}
                </span>
              </div>
              <div className="bg-background/80 rounded-2xl p-3 border border-border/40">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Daily Runway
                </span>
                <span className="text-lg font-bold text-foreground mt-0.5 block">
                  {formatCurrency(summary.dailyAllowanceRemaining, currency)}/d
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-border/50 px-5 pt-2 gap-4 bg-card">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Overview & Analytics
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'expenses'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Expenses ({summary.tripExpenses.length})
            </button>
            <button
              onClick={() => setActiveTab('splits')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'splits'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Splits & Debts ({summary.tripDebts.length})
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Budget Progress Meter */}
                {trip.budget > 0 && (
                  <div className="space-y-1.5 bg-secondary/30 p-4 rounded-2xl border border-border/40">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Budget Utilized</span>
                      <span>
                        {summary.percentSpent}% ({formatCurrency(summary.totalSpent, currency)} /{' '}
                        {formatCurrency(trip.budget, currency)})
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          summary.percentSpent > 100
                            ? 'bg-rose-500'
                            : summary.percentSpent >= 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, summary.percentSpent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Day-by-Day Spend Timeline */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Daily Spend Timeline
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {summary.dailySpendTimeline.map((day) => (
                      <div
                        key={day.date}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          day.amount > 0
                            ? 'bg-secondary/60 border-primary/20 shadow-2xs'
                            : 'bg-secondary/20 border-border/40 opacity-70'
                        }`}
                      >
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                          Day {day.dayIndex}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {day.date.slice(5)}
                        </span>
                        <span className="text-sm font-bold text-foreground mt-1 block">
                          {formatCurrency(day.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Breakdown */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                    Category Spending
                  </h4>
                  {summary.categoryBreakdown.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                      No expenses logged for this trip yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {summary.categoryBreakdown.map((item) => (
                        <div
                          key={item.category}
                          className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border/40"
                        >
                          <div className="flex items-center gap-2.5">
                            <CategoryIcon category={item.category} className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{item.category}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                            <span className="text-sm font-bold">
                              {formatCurrency(item.amount, currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {trip.notes && (
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 text-xs">
                    <span className="font-semibold text-muted-foreground block mb-1">
                      Notes & Itinerary
                    </span>
                    <p className="text-foreground whitespace-pre-wrap">{trip.notes}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">
                    {summary.tripExpenses.length} transactions in this trip
                  </span>
                  <Button
                    size="sm"
                    onClick={() => onAddExpense(trip)}
                    className="h-8 gap-1 rounded-xl text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Expense
                  </Button>
                </div>

                {summary.tripExpenses.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                    No transactions yet. Click "+ Add Expense" to log your first trip purchase!
                  </div>
                ) : (
                  summary.tripExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-background border border-border/50">
                          <CategoryIcon category={exp.category} className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{exp.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {exp.date.split('T')[0]} • {exp.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">
                          {formatCurrency(exp.amount, currency)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              vibrate(10);
                              updateExpense(exp.id, { trip_id: null });
                              toast.info(`"${exp.description}" unlinked from trip`);
                            }}
                            title="Unlink from this trip"
                            aria-label="Unlink from this trip"
                            className="p-1.5 text-muted-foreground hover:text-amber-500 rounded-lg hover:bg-secondary/60 transition-colors cursor-pointer"
                          >
                            <Link2Off className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${exp.description}"?`)) {
                                deleteExpense(exp.id);
                                toast.info('Expense deleted');
                              }
                            }}
                            className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-secondary/60 transition-colors cursor-pointer"
                            title="Delete transaction"
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Link Recent Unlinked Expenses */}
                {unlinkedRecentExpenses.length > 0 && (
                  <div className="pt-4 border-t border-border/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-primary" />
                        Link Recent Expenses to This Trip
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">({unlinkedRecentExpenses.length} unassigned)</span>
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                      {unlinkedRecentExpenses.map((unlinked) => (
                        <div
                          key={unlinked.id}
                          className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-secondary/25 border border-border/40 hover:border-primary/40 transition-colors"
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            <CategoryIcon category={unlinked.category} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{unlinked.description}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {unlinked.date.split('T')[0]} • {formatCurrency(unlinked.amount, currency)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              vibrate(15);
                              updateExpense(unlinked.id, { trip_id: trip.id });
                              toast.success(`Linked "${unlinked.description}" to ${trip.name}!`);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            Link
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'splits' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Group Splits & Debts
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Track who paid for what and settle with friends
                    </p>
                  </div>
                </div>

                {summary.tripDebts.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                    No debts or split bills recorded for this trip.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {summary.tripDebts.map((debt) => (
                      <div
                        key={debt.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/40"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{debt.person_name}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                debt.status === 'settled'
                                  ? 'bg-secondary text-muted-foreground'
                                  : debt.type === 'lent'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}
                            >
                              {debt.status === 'settled'
                                ? 'Settled'
                                : debt.type === 'lent'
                                ? 'Owes You'
                                : 'You Owe'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{debt.date}</p>
                        </div>
                        <span className="text-sm font-bold">
                          {formatCurrency(debt.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card">
            <button
              onClick={handleToggleStatus}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>
                {trip.status === 'completed' ? 'Reopen as Active Trip' : 'Mark Trip as Completed'}
              </span>
            </button>

            <Button
              onClick={() => onAddExpense(trip)}
              className="h-10 px-5 rounded-2xl gap-1.5 font-semibold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense to Trip</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Wallet, 
  Receipt, 
  Bell, 
  BellOff, 
  Copy, 
  Check, 
  Loader2, 
  PieChart, 
  Clock 
} from 'lucide-react';
import { fetchUserDetails, type UserInspectorDetails } from '../../lib/admin';
import { formatCurrency } from '../../lib/formatCurrency';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface UserInspectorSheetProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNudgeUser: (user: { id: string; name?: string; email?: string }) => void;
}

export function UserInspectorSheet({ userId, isOpen, onClose, onNudgeUser }: UserInspectorSheetProps) {
  const [details, setDetails] = useState<UserInspectorDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) {
      setDetails(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchUserDetails(userId)
      .then((data) => {
        if (isMounted) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch user inspector details:", err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  const handleCopyId = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopied(true);
    toast.success("User ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-lg h-full bg-card/95 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border/60 flex items-center justify-between gap-4 bg-muted/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  {details?.name ? details.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold truncate leading-tight text-foreground">
                    {details?.name || 'User Inspector'}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {details?.email || userId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Gathering user deep-dive telemetry...</p>
                </div>
              ) : !details ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p className="text-sm">Could not load details for this user.</p>
                </div>
              ) : (
                <>
                  {/* Action & Identifier Bar */}
                  <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground shrink-0">UID:</span>
                      <code className="font-mono text-[11px] truncate text-foreground">
                        {details.id}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Copy ID"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* 1-on-1 Nudge CTA */}
                  <button
                    type="button"
                    onClick={() => {
                      onNudgeUser({ id: details.id, name: details.name, email: details.email });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                  >
                    <Send className="w-4 h-4" />
                    Send 1-on-1 Direct Nudge
                  </button>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Total Spend</span>
                        <Wallet className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-xl font-bold tracking-tight text-foreground">
                        {formatCurrency(details.totalSpent)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Across {details.expenseCount} entries
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Average Entry</span>
                        <Receipt className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-xl font-bold tracking-tight text-foreground">
                        {formatCurrency(details.averageExpense)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Per transaction
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Push Status</span>
                        {details.hasPush ? (
                          <Bell className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <BellOff className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${details.hasPush ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                        <span className="text-sm font-bold text-foreground">
                          {details.hasPush ? 'Subscribed' : 'Not Subscribed'}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {details.pushTokensCount} device{details.pushTokensCount === 1 ? '' : 's'} linked
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Last Active</span>
                        <Clock className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="text-sm font-bold truncate text-foreground mt-0.5">
                        {details.lastExpenseDate
                          ? format(new Date(details.lastExpenseDate), 'MMM d, yyyy')
                          : 'No expenses'}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate">
                        Joined {details.createdAt ? format(new Date(details.createdAt), 'MMM yyyy') : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Top Spending Categories */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <PieChart className="w-3.5 h-3.5" />
                        Top Categories
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {details.topCategories.length} categories
                      </span>
                    </div>

                    {details.topCategories.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No category logs recorded yet.</p>
                    ) : (
                      <div className="space-y-2.5 p-4 rounded-2xl bg-muted/20 border border-border/50">
                        {details.topCategories.map((cat) => (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground">{cat.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-mono">{formatCurrency(cat.total)}</span>
                                <span className="text-[11px] font-semibold text-primary">{cat.percent}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(5, cat.percent))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Transactions Stream */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5" />
                        Recent Transactions
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        Last {details.recentExpenses.length} entries
                      </span>
                    </div>

                    {details.recentExpenses.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No transactions recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {details.recentExpenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="p-3 rounded-2xl bg-card border border-border/50 flex items-center justify-between gap-3 text-xs hover:border-primary/40 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {expense.title || 'Untitled Expense'}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                <span className="px-1.5 py-0.5 rounded-md bg-muted/60 text-[10px]">
                                  {expense.category || 'General'}
                                </span>
                                <span>•</span>
                                <span>
                                  {expense.date ? format(new Date(expense.date), 'MMM d, h:mm a') : 'Recent'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-sm text-foreground">
                                {formatCurrency(expense.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

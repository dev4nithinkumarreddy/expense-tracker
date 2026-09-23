import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore, type Account } from '../../store/useExpenseStore';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import { playTapSound, playSuccessSound } from '../../lib/sound';
import { 
  Building2, 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  ArrowRightLeft, 
  Plus, 
  X, 
  Check, 
  Calendar 
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export function AccountsSummaryBar() {
  const { accounts = [], settings, transferFunds, addAccount } = useExpenseStore();
  
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // Transfer state
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');

  // Add Account state
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<Account['type']>('bank');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccLimit, setNewAccLimit] = useState('');

  // Liquid net worth calculation: Bank + Cash + Savings - Credit Card Owed
  const netWorth = useMemo(() => {
    return accounts.reduce((acc, a) => {
      if (a.type === 'credit_card') {
        return acc - (a.balance || 0);
      }
      return acc + (a.balance || 0);
    }, 0);
  }, [accounts]);

  const handleOpenTransfer = (defaultFrom?: string) => {
    vibrate(10);
    playTapSound();
    const from = defaultFrom || accounts[0]?.id || '';
    setFromAccountId(from);
    const to = accounts.find((a) => a.id !== from)?.id || '';
    setToAccountId(to);
    setTransferAmount('');
    setTransferNotes('');
    setIsTransferOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!fromAccountId || !toAccountId || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid transfer amount');
      return;
    }
    if (fromAccountId === toAccountId) {
      toast.error('Source and destination accounts must be different');
      return;
    }

    vibrate(20);
    if (settings.soundEnabled) playSuccessSound();
    await transferFunds(fromAccountId, toAccountId, amt, transferNotes.trim() || undefined);
    setIsTransferOpen(false);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      toast.error('Account name is required');
      return;
    }
    const bal = parseFloat(newAccBalance) || 0;
    const limit = newAccType === 'credit_card' ? parseFloat(newAccLimit) || 0 : undefined;

    const icons: Record<Account['type'], string> = {
      bank: '🏦',
      cash: '💵',
      credit_card: '💳',
      savings: '💰',
    };

    vibrate(15);
    if (settings.soundEnabled) playSuccessSound();
    await addAccount({
      name: newAccName.trim(),
      type: newAccType,
      balance: bal,
      currency: settings.currency,
      icon: icons[newAccType],
      credit_limit: limit,
    });

    setNewAccName('');
    setNewAccBalance('');
    setNewAccLimit('');
    setIsAddAccountOpen(false);
  };

  const getAccountIcon = (acc: Account) => {
    if (acc.icon) return <span className="text-base select-none">{acc.icon}</span>;
    switch (acc.type) {
      case 'bank': return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'cash': return <Wallet className="w-4 h-4 text-emerald-500" />;
      case 'credit_card': return <CreditCard className="w-4 h-4 text-purple-500" />;
      case 'savings': return <PiggyBank className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Accounts & Net Worth
            </span>
          </div>
          <p className="text-lg font-bold tracking-tight text-foreground">
            {settings.privacyMode ? '••••••' : formatCurrency(netWorth, settings.currency)}
            <span className="text-[11px] font-normal text-muted-foreground ml-1.5">
              liquid total
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenTransfer()}
            className="h-8 px-2.5 rounded-xl text-xs gap-1.5 bg-card/60 backdrop-blur-md border-border/50 hover:bg-card shadow-2xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
            <span>Transfer</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              vibrate(10);
              playTapSound();
              setIsAddAccountOpen(true);
            }}
            className="h-8 w-8 p-0 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 hover:bg-card text-muted-foreground hover:text-foreground shadow-2xs"
            aria-label="Add Account"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Apple Wallet Style Horizontal Carousel */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {accounts.map((acc) => {
          const isCard = acc.type === 'credit_card';
          return (
            <motion.div
              key={acc.id}
              whileTap={{ scale: 0.98 }}
              className={`shrink-0 w-52 sm:w-56 p-3.5 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all shadow-xs ${
                isCard
                  ? 'bg-gradient-to-br from-purple-900/20 via-card/80 to-card/90 border-purple-500/25 dark:border-purple-400/20'
                  : acc.type === 'cash'
                  ? 'bg-gradient-to-br from-emerald-900/15 via-card/80 to-card/90 border-emerald-500/25 dark:border-emerald-400/20'
                  : 'bg-gradient-to-br from-blue-900/15 via-card/80 to-card/90 border-blue-500/25 dark:border-blue-400/20'
              }`}
            >
              {/* Account Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-background/80 flex items-center justify-center shadow-2xs">
                    {getAccountIcon(acc)}
                  </div>
                  <span className="text-xs font-semibold truncate max-w-[100px] text-foreground">
                    {acc.name}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-background/60 text-muted-foreground border border-border/40">
                  {acc.type.replace('_', ' ')}
                </span>
              </div>

              {/* Account Balance */}
              <div className="mt-1">
                <p className="text-[10px] text-muted-foreground">
                  {isCard ? 'Owed Balance' : 'Available Balance'}
                </p>
                <p className="text-base font-bold tracking-tight text-foreground">
                  {settings.privacyMode
                    ? '••••••'
                    : formatCurrency(acc.balance, acc.currency || settings.currency)}
                </p>
              </div>

              {/* Credit card extra details */}
              {isCard && acc.credit_limit ? (
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Available Credit:</span>
                  <span className="font-semibold text-foreground">
                    {settings.privacyMode
                      ? '••••'
                      : formatCurrency(
                          Math.max(0, acc.credit_limit - acc.balance),
                          acc.currency || settings.currency
                        )}
                  </span>
                </div>
              ) : null}

              {/* Statement day badge if present */}
              {acc.statement_day ? (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="w-3 h-3 text-primary/70" />
                  <span>Statement Day {acc.statement_day}</span>
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      {/* Quick Transfer Modal */}
      <AnimatePresence>
        {isTransferOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransferOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-3xl bg-card border border-border/60 shadow-2xl p-5 space-y-4 z-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Transfer Funds</h3>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full text-muted-foreground"
                  onClick={() => setIsTransferOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleExecuteTransfer} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      From Account
                    </label>
                    <select
                      value={fromAccountId}
                      onChange={(e) => setFromAccountId(e.target.value)}
                      className="w-full text-xs rounded-xl bg-secondary/50 border border-border/50 p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency || settings.currency}{a.balance})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      To Account
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="w-full text-xs rounded-xl bg-secondary/50 border border-border/50 p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Transfer Amount ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full text-sm font-bold rounded-xl bg-secondary/50 border border-border/50 p-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Credit card bill payment"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    className="w-full text-xs rounded-xl bg-secondary/50 border border-border/50 p-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <Button type="submit" className="w-full rounded-xl gap-2 font-semibold">
                  <Check className="w-4 h-4" />
                  Confirm Transfer
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Account Modal */}
      <AnimatePresence>
        {isAddAccountOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddAccountOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-3xl bg-card border border-border/60 shadow-2xl p-5 space-y-4 z-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Add New Account</h3>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full text-muted-foreground"
                  onClick={() => setIsAddAccountOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, Chase Sapphire, Petty Cash"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="w-full text-xs rounded-xl bg-secondary/50 border border-border/50 p-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Account Type
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['bank', 'cash', 'credit_card', 'savings'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          vibrate(8);
                          playTapSound();
                          setNewAccType(t);
                        }}
                        className={`py-2 px-1 rounded-xl text-[11px] font-semibold capitalize border transition-all text-center ${
                          newAccType === t
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary'
                        }`}
                      >
                        {t === 'credit_card' ? 'Card' : t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {newAccType === 'credit_card' ? 'Current Balance Owed' : 'Opening Balance'} ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl bg-secondary/50 border border-border/50 p-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {newAccType === 'credit_card' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Credit Limit ({settings.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 100000"
                      value={newAccLimit}
                      onChange={(e) => setNewAccLimit(e.target.value)}
                      className="w-full text-xs font-semibold rounded-xl bg-secondary/50 border border-border/50 p-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                <Button type="submit" className="w-full rounded-xl gap-2 font-semibold">
                  <Plus className="w-4 h-4" />
                  Create Account
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore, type Account } from '../../store/useExpenseStore';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate, cn } from '../../lib/utils';
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
  HelpCircle,
  Sparkles,
  Pencil
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export function AccountsSummaryBar() {
  const { 
    accounts = [], 
    settings, 
    transferFunds, 
    addAccount, 
    updateAccount,
    syncAccountWithBalance 
  } = useExpenseStore();
  
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState('');

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

  const handleOpenEditBalance = (acc: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate(10);
    playTapSound();
    setEditingAccount(acc);
    setEditBalanceValue(String(acc.balance));
  };

  const handleSaveEditBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const val = parseFloat(editBalanceValue);
    if (isNaN(val)) {
      toast.error('Please enter a valid balance amount');
      return;
    }
    vibrate(15);
    if (settings.soundEnabled) playSuccessSound();
    updateAccount(editingAccount.id, { balance: val });
    toast.success(`${editingAccount.name} balance updated to ${formatCurrency(val, editingAccount.currency || settings.currency)}`);
    setEditingAccount(null);
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
    <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-card/85 dark:bg-card/75 backdrop-blur-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Accounts & Net Worth
            </span>
            <button
              type="button"
              onClick={() => {
                vibrate(10);
                playTapSound();
                setIsGuideOpen(true);
              }}
              className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded-full cursor-pointer"
              title="How Accounts & Balances Work"
              aria-label="How Accounts & Balances Work"
            >
              <HelpCircle className="w-3.5 h-3.5 text-primary/80" />
            </button>
          </div>
          <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground display-number">
            {settings.privacyMode ? '••••••' : formatCurrency(netWorth, settings.currency)}
            <span className="text-[11px] font-normal text-muted-foreground ml-1.5">
              liquid wealth
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              vibrate(12);
              playTapSound();
              syncAccountWithBalance();
            }}
            className="h-8 px-2 sm:px-2.5 rounded-xl text-xs gap-1 sm:gap-1.5 bg-secondary/50 hover:bg-secondary border-border/50 shadow-2xs cursor-pointer text-primary"
            title="Sync Bank balance to match your remaining monthly budget"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Sync with Budget</span>
            <span className="sm:hidden">Sync</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenTransfer()}
            className="h-8 px-2 sm:px-2.5 rounded-xl text-xs gap-1 sm:gap-1.5 bg-secondary/50 hover:bg-secondary border-border/50 shadow-2xs cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Transfer</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              vibrate(10);
              playTapSound();
              setIsAddAccountOpen(true);
            }}
            className="h-8 px-2 sm:px-2.5 rounded-xl text-xs gap-1 sm:gap-1.5 bg-secondary/50 hover:bg-secondary border-border/50 text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
            aria-label="Add Account"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Add</span>
          </Button>
        </div>
      </div>

      {/* Responsive Inset Grouped Accounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {accounts.map((acc) => {
          const isCard = acc.type === 'credit_card';
          return (
            <motion.div
              key={acc.id}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              onClick={() => handleOpenTransfer(acc.id)}
              className={cn(
                "p-3 sm:p-3.5 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all shadow-xs cursor-pointer flex flex-col justify-between min-h-[96px]",
                isCard
                  ? "bg-gradient-to-br from-purple-500/10 via-card/90 to-card/95 border-purple-500/25 dark:border-purple-400/20 hover:border-purple-500/40"
                  : acc.type === "cash"
                  ? "bg-gradient-to-br from-emerald-500/10 via-card/90 to-card/95 border-emerald-500/25 dark:border-emerald-400/20 hover:border-emerald-500/40"
                  : "bg-gradient-to-br from-blue-500/10 via-card/90 to-card/95 border-blue-500/25 dark:border-blue-400/20 hover:border-blue-500/40"
              )}
            >
              {/* Account Header */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-background/80 flex items-center justify-center shadow-2xs shrink-0">
                    {getAccountIcon(acc)}
                  </div>
                  <span className="text-xs font-semibold truncate text-foreground leading-tight">
                    {acc.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-background/60 text-muted-foreground border border-border/40">
                    {acc.type === 'credit_card' ? 'Credit' : acc.type}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditBalance(acc, e)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                    title={`Edit ${acc.name} balance`}
                    aria-label={`Edit ${acc.name} balance`}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Account Balance */}
              <div className="my-auto py-0.5">
                <p className="text-[10px] text-muted-foreground">
                  {isCard ? 'Owed Balance' : 'Available Balance'}
                </p>
                <p className={cn(
                  "text-base sm:text-lg font-bold tracking-tight display-number leading-tight truncate",
                  isCard && acc.balance > 0 ? "text-purple-600 dark:text-purple-400" : "text-foreground"
                )}>
                  {settings.privacyMode
                    ? '••••••'
                    : formatCurrency(acc.balance, acc.currency || settings.currency)}
                </p>
              </div>

              {/* Footer row */}
              <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground gap-1">
                {isCard && acc.credit_limit && acc.credit_limit > 0 ? (
                  <>
                    <span className="truncate">Avail. Credit:</span>
                    <span className="font-semibold text-foreground shrink-0">
                      {settings.privacyMode
                        ? '••••'
                        : formatCurrency(
                            Math.max(0, acc.credit_limit - acc.balance),
                            acc.currency || settings.currency
                          )}
                    </span>
                  </>
                ) : isCard ? (
                  <>
                    <span>Credit Line</span>
                    <span className="text-purple-500 font-medium">Revolving</span>
                  </>
                ) : acc.type === 'bank' ? (
                  <>
                    <span>Primary</span>
                    <span className="text-blue-500 font-medium">UPI / NetBanking</span>
                  </>
                ) : acc.type === 'cash' ? (
                  <>
                    <span>Physical</span>
                    <span className="text-emerald-500 font-medium">In Pocket</span>
                  </>
                ) : (
                  <>
                    <span>Savings</span>
                    <span className="text-amber-500 font-medium">Reserve</span>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Edit Balance Modal */}
      <AnimatePresence>
        {editingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingAccount(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xs rounded-3xl bg-card border border-border/60 shadow-2xl p-5 space-y-4 z-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Edit Balance</h3>
                    <p className="text-[11px] text-muted-foreground">{editingAccount.name}</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full text-muted-foreground cursor-pointer"
                  onClick={() => setEditingAccount(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleSaveEditBalance} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {editingAccount.type === 'credit_card' ? 'Current Owed Balance' : 'Current Real Balance'} ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    required
                    placeholder="0.00"
                    value={editBalanceValue}
                    onChange={(e) => setEditBalanceValue(e.target.value)}
                    className="w-full text-base font-bold rounded-xl bg-secondary/50 border border-border/50 p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <Button type="submit" className="w-full rounded-xl gap-2 font-semibold cursor-pointer">
                  <Check className="w-4 h-4" />
                  Save Balance
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Guide Modal: How Accounts & Balances Work */}
      <AnimatePresence>
        {isGuideOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGuideOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-full max-w-md rounded-3xl bg-card border border-border/60 shadow-2xl p-5 sm:p-6 space-y-4.5 z-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">How Accounts & Budget Sync</h3>
                    <p className="text-[11px] text-muted-foreground">Understanding your balance breakdown</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full text-muted-foreground cursor-pointer"
                  onClick={() => setIsGuideOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Guide Content */}
              <div className="space-y-4 text-xs text-foreground/90 leading-relaxed">
                {/* 1. Monthly Budget vs Accounts */}
                <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-1.5">
                  <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>1. Monthly Budget vs. Liquid Wealth</span>
                  </p>
                  <p className="text-muted-foreground">
                    • <strong className="text-foreground">Monthly Budget Remaining</strong> (e.g. ₹402) is your self-imposed monthly spending limit. It tells you: <em>"How much can I spend before I hit my budget goal for this month?"</em>
                  </p>
                  <p className="text-muted-foreground">
                    • <strong className="text-foreground">Liquid Accounts</strong> (e.g. ₹402) is the real money you actually possess across your Bank and Cash wallets minus credit card debt.
                  </p>
                </div>

                {/* 2. Account Types */}
                <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-2">
                  <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <span>🏦</span>
                    <span>2. What Each Account Type Represents</span>
                  </p>
                  <div className="space-y-1.5 text-muted-foreground">
                    <p>
                      • <strong>Bank Account:</strong> Real money in your checking or savings account. Used when paying with UPI, Debit Cards, or Net Banking.
                    </p>
                    <p>
                      • <strong>Cash Wallet:</strong> Physical rupee notes and coins in your pocket or drawer.
                    </p>
                    <p>
                      • <strong>Credit Card:</strong> A borrowed line of credit. When you swipe a card, you haven't paid real money yet — you owe it. The balance shows <strong>Owed</strong> debt.
                    </p>
                  </div>
                </div>

                {/* 3. How Spending Syncs */}
                <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/40 space-y-2">
                  <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>3. How Expenses Sync in Real Time</span>
                  </p>
                  <div className="space-y-1.5 text-muted-foreground">
                    <p>
                      • When you log an expense with <strong>Bank or Cash</strong>: That account's balance drops, and your monthly remaining budget drops too.
                    </p>
                    <p>
                      • When you log an expense with <strong>Credit Card</strong>: Your credit card owed balance increases, and your monthly remaining budget drops.
                    </p>
                    <p>
                      • <strong>Paying Your Credit Card Bill (Transfer):</strong> When you repay your credit card using the <strong className="text-primary">Transfer</strong> button, money moves from Bank to Credit Card. It does <em>not</em> count as a new expense, so your monthly budget isn't double-counted!
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setIsGuideOpen(false)}
                className="w-full rounded-xl font-medium cursor-pointer"
              >
                Got It
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  className="h-7 w-7 rounded-full text-muted-foreground cursor-pointer"
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

                <Button type="submit" className="w-full rounded-xl gap-2 font-semibold cursor-pointer">
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
                  className="h-7 w-7 rounded-full text-muted-foreground cursor-pointer"
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
                        className={`py-2 px-1 rounded-xl text-[11px] font-semibold capitalize border transition-all text-center cursor-pointer ${
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

                <Button type="submit" className="w-full rounded-xl gap-2 font-semibold cursor-pointer">
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

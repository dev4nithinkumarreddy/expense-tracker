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

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => a.type !== 'credit_card'),
    [accounts]
  );

  // Liquid net worth calculation: Bank + Cash + Savings
  const netWorth = useMemo(() => {
    return visibleAccounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  }, [visibleAccounts]);

  const handleOpenTransfer = (defaultFrom?: string) => {
    vibrate(10);
    playTapSound();
    const from = defaultFrom || visibleAccounts[0]?.id || '';
    setFromAccountId(from);
    const to = visibleAccounts.find((a) => a.id !== from)?.id || '';
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
    <div className="space-y-3">
      {/* Section Header Row directly on Canvas */}
      <div className="flex items-center justify-between gap-2 px-0.5 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(99,102,241,0.12)]">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[15px] sm:text-base font-bold tracking-tight text-foreground leading-tight">
                Accounts & Net Worth
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 display-number">
                {settings.privacyMode ? '••••••' : formatCurrency(netWorth, settings.currency)}
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
          </div>
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
            className="h-8 px-2.5 sm:px-3 rounded-full text-xs font-bold gap-1 sm:gap-1.5 bg-primary/10 hover:bg-primary/18 border-primary/25 shadow-2xs cursor-pointer text-primary"
            title="Sync Bank balance to match your remaining monthly budget"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Sync Budget</span>
            <span className="sm:hidden">Sync</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenTransfer()}
            className="h-8 px-2.5 sm:px-3 rounded-full text-xs font-bold gap-1 sm:gap-1.5 bg-card hover:bg-secondary border-border/80 shadow-2xs cursor-pointer text-foreground"
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
            className="h-8 px-2.5 rounded-full text-xs font-bold gap-1 bg-card hover:bg-secondary border-border/80 text-foreground shadow-2xs cursor-pointer"
            aria-label="Add Account"
          >
            <Plus className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span>Add</span>
          </Button>
        </div>
      </div>

      {/* Standalone Elevated Account Cards (Side-by-Side like Today & This Week) */}
      <div className="grid grid-cols-2 gap-3">
        {visibleAccounts.map((acc) => {
          const isCash = acc.type === 'cash';
          const isSavings = acc.type === 'savings';
          return (
            <motion.div
              key={acc.id}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              onClick={() => handleOpenTransfer(acc.id)}
              className="p-3.5 sm:p-4 rounded-3xl border border-border/85 dark:border-white/10 bg-card/95 dark:bg-card/80 backdrop-blur-xl relative overflow-hidden transition-all shadow-xs hover:border-primary/35 cursor-pointer flex flex-col justify-between min-h-[112px]"
            >
              {/* Account Header */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "w-7 h-7 rounded-xl border flex items-center justify-center shadow-2xs shrink-0",
                    isCash
                      ? "bg-emerald-500/10 border-emerald-500/25"
                      : isSavings
                      ? "bg-amber-500/10 border-amber-500/25"
                      : "bg-blue-500/10 border-blue-500/25"
                  )}>
                    {getAccountIcon(acc)}
                  </div>
                  <span className="text-xs sm:text-[13px] font-bold truncate text-foreground leading-tight">
                    {acc.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={cn(
                    "hidden sm:inline-flex text-[9.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                    isCash
                      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                      : isSavings
                      ? "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25"
                      : "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25"
                  )}>
                    {acc.type}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditBalance(acc, e)}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors border border-transparent hover:border-border/50"
                    title={`Edit ${acc.name} balance`}
                    aria-label={`Edit ${acc.name} balance`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Account Balance */}
              <div className="my-auto py-0.5">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Available Balance
                </p>
                <p className="text-lg sm:text-xl font-extrabold tracking-tight display-number leading-tight truncate text-foreground mt-0.5">
                  {settings.privacyMode
                    ? '••••••'
                    : formatCurrency(acc.balance, acc.currency || settings.currency)}
                </p>
              </div>

              {/* Footer row */}
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground gap-1">
                {acc.type === 'bank' ? (
                  <>
                    <span>Primary</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">UPI / Bank</span>
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
                      {visibleAccounts.map((a) => (
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
                      {visibleAccounts.map((a) => (
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
                    placeholder="e.g. ATM withdrawal or savings transfer"
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
                    placeholder="e.g. HDFC Bank, Emergency Savings, Petty Cash"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="w-full text-xs rounded-xl bg-secondary/50 border border-border/50 p-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Account Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['bank', 'cash', 'savings'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          vibrate(8);
                          playTapSound();
                          setNewAccType(t);
                        }}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold capitalize border transition-all text-center cursor-pointer ${
                          newAccType === t
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Opening Balance ({settings.currency})
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

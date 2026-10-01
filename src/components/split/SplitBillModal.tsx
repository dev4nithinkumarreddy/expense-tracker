import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserPlus, Trash2, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { toast } from 'sonner';
import { useExpenseStore } from '../../store/useExpenseStore';
import { formatCurrency } from '../../lib/formatCurrency';
import { calculateSplit, type SplitMode } from '../../lib/upi';
import { SplitShareSheet, type SplitShareItem } from './SplitShareSheet';
import { vibrate } from '../../lib/utils';
import type { SplitParticipant } from '../../store/types';

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number | string;
  initialDescription?: string;
  initialCategory?: string;
  initialAccountId?: string;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  onClose,
  initialAmount = '',
  initialDescription = '',
  initialCategory = 'Food',
  initialAccountId,
}) => {
  const { settings, accounts, debts, addExpense, addDebt } = useExpenseStore();
  const currency = settings.currency || '₹';

  const [totalAmount, setTotalAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [accountId, setAccountId] = useState<string>('');
  const [mode, setMode] = useState<SplitMode>('equal');
  const [logOnlyMyShare, setLogOnlyMyShare] = useState<boolean>(true);

  const [participants, setParticipants] = useState<SplitParticipant[]>([
    { id: 'self', name: settings.userName || 'You', amount: 0, isSelf: true },
  ]);
  const [friendNameInput, setFriendNameInput] = useState<string>('');

  // Share Sheet state after successful split
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [createdShareItems, setCreatedShareItems] = useState<SplitShareItem[]>([]);

  // Unique recent friends from existing debts
  const recentFriends = useMemo(() => {
    const names = debts.map((d) => d.person_name?.trim()).filter(Boolean);
    const existing = new Set(participants.map((p) => p.name.toLowerCase()));
    return Array.from(new Set(names))
      .filter((n) => !existing.has(n.toLowerCase()))
      .slice(0, 6);
  }, [debts, participants]);

  useEffect(() => {
    if (isOpen) {
      setTotalAmount(initialAmount ? String(initialAmount) : '');
      setDescription(initialDescription || '');
      setCategory(initialCategory || settings.categories[0] || 'Food');
      setAccountId(initialAccountId || accounts[0]?.id || 'acc-bank-1');
      setMode('equal');
      setLogOnlyMyShare(true);
      setParticipants([
        { id: 'self', name: settings.userName || 'You', amount: 0, isSelf: true },
      ]);
      setFriendNameInput('');
      setIsShareSheetOpen(false);
    }
  }, [isOpen, initialAmount, initialDescription, initialCategory, initialAccountId, accounts, settings]);

  const numTotal = parseFloat(totalAmount) || 0;

  // Real-time calculation of shares
  const { shares, difference, isBalanced } = useMemo(() => {
    return calculateSplit(numTotal, participants, mode);
  }, [numTotal, participants, mode]);

  // Map calculated shares into participants for display
  const calculatedParticipants = useMemo(() => {
    const shareMap = new Map(shares.map((s) => [s.id, s]));
    return participants.map((p) => {
      const share = shareMap.get(p.id);
      return {
        ...p,
        amount: share ? share.amount : p.amount,
        percentage: share ? share.percentage : p.percentage,
      };
    });
  }, [participants, shares]);

  const selfParticipant = calculatedParticipants.find((p) => p.isSelf);
  const myShareAmount = selfParticipant?.amount || 0;
  const toCollectAmount = Number((numTotal - myShareAmount).toFixed(2));

  const handleAddFriend = (nameToAdd?: string) => {
    const name = (nameToAdd || friendNameInput).trim();
    if (!name) return;

    if (participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`${name} is already in the split`);
      return;
    }

    vibrate(10);
    const newParticipant: SplitParticipant = {
      id: crypto.randomUUID(),
      name,
      amount: 0,
      isSelf: false,
    };

    setParticipants((prev) => [...prev, newParticipant]);
    setFriendNameInput('');
  };

  const handleRemoveFriend = (id: string) => {
    vibrate(10);
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCustomAmountChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, amount: val } : p))
    );
  };

  const handleCustomPercentageChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, percentage: val } : p))
    );
  };

  const handleConfirmSplit = async () => {
    if (numTotal <= 0) {
      vibrate(10);
      toast.error('Please enter a valid bill amount');
      return;
    }
    if (participants.length < 2) {
      vibrate(10);
      toast.error(`Please add at least one friend (e.g. tap a quick add chip like + ${recentFriends[0] || 'friend'} above)`);
      return;
    }
    if (!isBalanced) {
      vibrate(10);
      toast.error(`Amounts must sum to ${formatCurrency(numTotal, currency)}. Difference: ${difference}`);
      return;
    }

    vibrate(20);
    const finalDesc = description.trim() || 'Group Expense Split';
    const expenseDate = new Date().toISOString();

    // 1. Log the Expense
    // If logOnlyMyShare is true, record only the user's portion; otherwise the full bill
    const recordedExpenseAmount = logOnlyMyShare ? myShareAmount : numTotal;

    const expenseId = await addExpense({
      amount: recordedExpenseAmount,
      description: finalDesc,
      category,
      date: expenseDate,
      account_id: accountId || undefined,
      notes: `Split Total: ${formatCurrency(numTotal, currency)} (${participants.length} ways). Your share: ${formatCurrency(myShareAmount, currency)}`,
    });

    // 2. Create Debt entries for each friend
    const shareItems: SplitShareItem[] = [];

    calculatedParticipants.forEach((p) => {
      if (!p.isSelf && p.amount > 0) {
        addDebt({
          person_name: p.name,
          amount: p.amount,
          type: 'lent',
          status: 'pending',
          date: expenseDate,
          notes: `Split: ${finalDesc}`,
          expense_id: expenseId,
        });

        shareItems.push({
          name: p.name,
          amount: p.amount,
        });
      }
    });

    toast.success(`Split recorded! Added ${shareItems.length} IOUs.`);
    setCreatedShareItems(shareItems);
    setIsShareSheetOpen(true);
  };

  const handleCloseAll = () => {
    setIsShareSheetOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85dvh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-muted/20 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base sm:text-lg">Split with Friends</h3>
                  <p className="text-xs text-muted-foreground">Split bills & request UPI payment instantly</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Bill Details */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Total Bill Amount</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                        {currency}
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        className="pl-8 text-lg font-bold"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Paid From Account</label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {accounts.map((acc, idx) => (
                        <option key={acc.id || `acc-${idx}-${acc.name}`} value={acc.id}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description / Note</label>
                  <Input
                    placeholder="e.g. Dinner at Biryani House, Movie, Groceries"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Split Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">Split Method</label>
                <div className="flex p-1 bg-muted/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      vibrate(10);
                      setMode('equal');
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      mode === 'equal' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Equally ({participants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      vibrate(10);
                      setMode('exact');
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      mode === 'exact' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Exact Amounts
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      vibrate(10);
                      setMode('percentage');
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      mode === 'percentage' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Percentages (%)
                  </button>
                </div>
              </div>

              {/* Add Friends Section */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">Who is in this split?</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter friend's name..."
                    value={friendNameInput}
                    onChange={(e) => setFriendNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFriend();
                      }
                    }}
                  />
                  <Button type="button" onClick={() => handleAddFriend()} size="sm" className="px-4 gap-1.5">
                    <UserPlus className="w-4 h-4" /> Add
                  </Button>
                </div>

                {/* Quick Add Chips */}
                {recentFriends.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-muted-foreground mr-1">Quick add:</span>
                    {recentFriends.map((friend) => (
                      <button
                        key={`recent-${friend}`}
                        type="button"
                        onClick={() => handleAddFriend(friend)}
                        className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 shadow-xs"
                      >
                        + {friend}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Participants Split List */}
              <div className="space-y-2.5">
                {calculatedParticipants.map((p) => (
                  <div
                    key={p.id || `p-${p.name}`}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                      p.isSelf ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          p.isSelf ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {p.name} {p.isSelf && <span className="text-[11px] font-normal text-primary">(You)</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {mode === 'percentage' ? `${p.percentage || 0}%` : p.isSelf ? 'Paid by you' : 'Owes you'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {mode === 'equal' && (
                        <span className="font-bold text-sm text-foreground">
                          {formatCurrency(p.amount, currency)}
                        </span>
                      )}

                      {mode === 'exact' && (
                        <div className="w-24">
                          <Input
                            type="number"
                            placeholder="0"
                            value={p.amount || ''}
                            onChange={(e) => handleCustomAmountChange(p.id, e.target.value)}
                            className="h-8 text-right text-xs font-bold"
                          />
                        </div>
                      )}

                      {mode === 'percentage' && (
                        <div className="w-20 relative">
                          <Input
                            type="number"
                            placeholder="0"
                            value={p.percentage || ''}
                            onChange={(e) => handleCustomPercentageChange(p.id, e.target.value)}
                            className="h-8 text-right pr-6 text-xs font-bold"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            %
                          </span>
                        </div>
                      )}

                      {!p.isSelf && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(p.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Summary Bar */}
              <Card className="border-border/60 bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Your Personal Share:</span>
                    <span className="font-bold text-foreground">{formatCurrency(myShareAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">To Collect from Friends:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(toCollectAmount, currency)}
                    </span>
                  </div>

                  {!isBalanced && (
                    <div className="pt-2 border-t border-border/40 flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Unallocated amount: {formatCurrency(Math.abs(difference), currency)}{' '}
                        {difference > 0 ? 'remaining' : 'over-allocated'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Accounting Toggle */}
              <div
                onClick={() => {
                  vibrate(10);
                  setLogOnlyMyShare(!logOnlyMyShare);
                }}
                className="flex items-start gap-3 p-3 rounded-2xl bg-muted/20 border border-border/40 cursor-pointer select-none"
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    logOnlyMyShare ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'
                  }`}
                >
                  {logOnlyMyShare && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Log only my share in budget</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Records {formatCurrency(myShareAmount, currency)} in your expenses so monthly budget calculations stay accurate.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer - Sticky with Safe Area */}
            <div className="px-6 py-3.5 border-t border-border/40 bg-card/95 backdrop-blur-md shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))]">
              {participants.length < 2 ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Add at least 1 friend above to split</span>
                </div>
              ) : !isBalanced ? (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Difference: {formatCurrency(Math.abs(difference), currency)}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground hidden sm:block">
                  {participants.length} people • Your share {formatCurrency(myShareAmount, currency)}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 sm:flex-initial">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmSplit}
                  className="gap-2 px-5 font-semibold flex-1 sm:flex-initial shadow-md transition-all active:scale-95 bg-primary text-primary-foreground hover:opacity-90"
                >
                  Confirm & Request <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Share Sheet on completion */}
      <SplitShareSheet
        isOpen={isShareSheetOpen}
        onClose={handleCloseAll}
        splitTitle={description || 'Group Expense'}
        totalAmount={numTotal}
        participants={createdShareItems}
        payerUpiId={settings.upiId}
        payerName={settings.userName || 'Me'}
        currency={currency}
      />
    </>
  );
};

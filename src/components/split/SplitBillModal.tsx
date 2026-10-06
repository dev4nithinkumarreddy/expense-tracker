import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Users, 
  UserPlus, 
  Trash2, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Wand2, 
  Scale, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { toast } from 'sonner';
import { useExpenseStore } from '../../store/useExpenseStore';
import { formatCurrency } from '../../lib/formatCurrency';
import { 
  calculateSplit, 
  autoBalanceToSelf, 
  distributeRemainingEqually, 
  convertSharesOnModeChange, 
  isValidUpiId,
  type SplitMode 
} from '../../lib/upi';
import { SplitShareSheet, type SplitShareItem } from './SplitShareSheet';
import { vibrate } from '../../lib/utils';
import type { SplitParticipant } from '../../store/types';

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSplitCompleted?: () => void;
  initialAmount?: number | string;
  initialDescription?: string;
  initialCategory?: string;
  initialAccountId?: string;
  initialFriends?: string[];
  existingExpenseId?: string;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  onClose,
  onSplitCompleted,
  initialAmount = '',
  initialDescription = '',
  initialCategory = 'Food',
  initialAccountId,
  initialFriends,
  existingExpenseId,
}) => {
  const { 
    settings, 
    accounts, 
    debts, 
    addExpense, 
    updateExpense, 
    addDebt, 
    updateSettings 
  } = useExpenseStore();
  const currency = settings.currency || '₹';

  const [totalAmount, setTotalAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [accountId, setAccountId] = useState<string>('');
  const [mode, setMode] = useState<SplitMode>('equal');
  const [logOnlyMyShare, setLogOnlyMyShare] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Raw string input caches to support seamless decimal typing (e.g. "12." or "0.") without parseFloat resetting
  const [inputAmounts, setInputAmounts] = useState<Record<string, string>>({});
  const [inputPercentages, setInputPercentages] = useState<Record<string, string>>({});

  const [participants, setParticipants] = useState<SplitParticipant[]>([
    { id: 'self', name: settings.userName || 'You', amount: 0, isSelf: true },
  ]);
  const [friendNameInput, setFriendNameInput] = useState<string>('');

  // Inline UPI ID quick config if user has not set it yet
  const [inlineUpiId, setInlineUpiId] = useState<string>('');
  const [showUpiPrompt, setShowUpiPrompt] = useState<boolean>(false);

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

  // Transition-guarded initialization: ONLY re-runs on false -> true transition of isOpen
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setTotalAmount(initialAmount ? String(initialAmount) : '');
      setDescription(initialDescription || '');
      setCategory(initialCategory || settings.categories[0] || 'Food');
      setAccountId(initialAccountId || accounts[0]?.id || 'acc-bank-1');
      setMode('equal');
      setLogOnlyMyShare(true);
      setIsSubmitting(false);

      const selfParticipant: SplitParticipant = {
        id: 'self',
        name: settings.userName || 'You',
        amount: 0,
        isSelf: true,
      };

      const initialList: SplitParticipant[] = [selfParticipant];
      if (initialFriends && initialFriends.length > 0) {
        initialFriends.forEach((f) => {
          const trimmed = f.trim();
          if (trimmed && !initialList.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
            initialList.push({
              id: crypto.randomUUID(),
              name: trimmed,
              amount: 0,
              isSelf: false,
            });
          }
        });
      }

      setParticipants(initialList);
      setInputAmounts({});
      setInputPercentages({});
      setFriendNameInput('');
      setIsShareSheetOpen(false);
      setInlineUpiId(settings.upiId || '');
      setShowUpiPrompt(!settings.upiId);
    }
    prevIsOpenRef.current = isOpen;
  }, [
    isOpen,
    initialAmount,
    initialDescription,
    initialCategory,
    initialAccountId,
    initialFriends,
    accounts,
    settings,
  ]);

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

  // Seamless Mode Switcher with Share Conversion
  const handleSwitchMode = (nextMode: SplitMode) => {
    if (nextMode === mode) return;
    vibrate(10);
    const converted = convertSharesOnModeChange(numTotal, participants, mode, nextMode);
    setParticipants(converted);

    // Sync raw input buffers so inputs immediately reflect existing calculations
    const newAmtInputs: Record<string, string> = {};
    const newPctInputs: Record<string, string> = {};
    converted.forEach((p) => {
      if (p.amount != null) newAmtInputs[p.id] = String(p.amount);
      if (p.percentage != null) newPctInputs[p.id] = String(p.percentage);
    });
    setInputAmounts(newAmtInputs);
    setInputPercentages(newPctInputs);
    setMode(nextMode);
  };

  // Add friend(s) with multi-name comma-separated support
  const handleAddFriend = (nameToAdd?: string) => {
    const raw = (nameToAdd || friendNameInput).trim();
    if (!raw) return;

    // Split by commas to allow entering "Alex, Rahul, Sam"
    const names = raw.split(',').map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;

    let addedCount = 0;
    setParticipants((prev) => {
      const next = [...prev];
      names.forEach((name) => {
        if (!next.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
          next.push({
            id: crypto.randomUUID(),
            name,
            amount: 0,
            percentage: 0,
            isSelf: false,
          });
          addedCount++;
        }
      });
      return next;
    });

    vibrate(10);
    setFriendNameInput('');
    if (addedCount === 0 && names.length === 1) {
      toast.error(`${names[0]} is already in the split`);
    }
  };

  const handleRemoveFriend = (id: string) => {
    vibrate(10);
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setInputAmounts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setInputPercentages((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Safe string-based decimal input handlers
  const handleCustomAmountChange = (id: string, value: string) => {
    setInputAmounts((prev) => ({ ...prev, [id]: value }));
    const val = parseFloat(value) || 0;
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, amount: val } : p))
    );
  };

  const handleCustomPercentageChange = (id: string, value: string) => {
    setInputPercentages((prev) => ({ ...prev, [id]: value }));
    const val = parseFloat(value) || 0;
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, percentage: val } : p))
    );
  };

  // 1-Click Auto-Balance to current user ("You")
  const handleAutoBalanceSelf = () => {
    vibrate(12);
    const balanced = autoBalanceToSelf(numTotal, participants, mode);
    setParticipants(balanced);

    const selfP = balanced.find((p) => p.isSelf);
    if (selfP) {
      if (mode === 'exact' && selfP.amount != null) {
        setInputAmounts((prev) => ({ ...prev, [selfP.id]: String(selfP.amount) }));
      } else if (mode === 'percentage' && selfP.percentage != null) {
        setInputPercentages((prev) => ({ ...prev, [selfP.id]: String(selfP.percentage) }));
      }
    }
    toast.success('Balanced remaining amount to your share!');
  };

  // 1-Click Distribute Remaining Difference Equally
  const handleDistributeRemaining = () => {
    vibrate(12);
    const distributed = distributeRemainingEqually(numTotal, participants, mode);
    setParticipants(distributed);

    const newAmtInputs = { ...inputAmounts };
    const newPctInputs = { ...inputPercentages };
    distributed.forEach((p) => {
      if (p.amount != null) newAmtInputs[p.id] = String(p.amount);
      if (p.percentage != null) newPctInputs[p.id] = String(p.percentage);
    });
    setInputAmounts(newAmtInputs);
    setInputPercentages(newPctInputs);
    toast.success('Distributed remaining amount equally!');
  };

  const handleSaveInlineUpi = () => {
    if (!inlineUpiId.trim()) return;
    if (!isValidUpiId(inlineUpiId.trim())) {
      toast.error('Please enter a valid UPI ID (e.g. name@okaxis)');
      return;
    }
    vibrate(10);
    updateSettings({ upiId: inlineUpiId.trim() });
    setShowUpiPrompt(false);
    toast.success('UPI ID saved to profile!');
  };

  const handleConfirmSplit = async () => {
    if (isSubmitting) return;

    if (numTotal <= 0) {
      vibrate(10);
      toast.error('Please enter a valid bill amount');
      return;
    }
    if (participants.length < 2) {
      vibrate(10);
      toast.error(
        `Please add at least one friend (e.g. tap a quick add chip like + ${recentFriends[0] || 'friend'} above)`
      );
      return;
    }
    if (!isBalanced) {
      vibrate(10);
      toast.error(
        `Amounts must sum to ${formatCurrency(numTotal, currency)}. Difference: ${formatCurrency(Math.abs(difference), currency)}`
      );
      return;
    }

    // Auto-save inline UPI ID if user entered one
    if (inlineUpiId.trim() && isValidUpiId(inlineUpiId.trim()) && !settings.upiId) {
      updateSettings({ upiId: inlineUpiId.trim() });
    }

    setIsSubmitting(true);
    vibrate(20);

    try {
      const finalDesc = description.trim() || 'Group Expense Split';
      const expenseDate = new Date().toISOString();
      const recordedExpenseAmount = logOnlyMyShare ? myShareAmount : numTotal;
      const expenseNotes = `Split Total: ${formatCurrency(numTotal, currency)} (${participants.length} ways). Your share: ${formatCurrency(myShareAmount, currency)}`;

      let expenseId: string;
      if (existingExpenseId) {
        updateExpense(existingExpenseId, {
          amount: recordedExpenseAmount,
          description: finalDesc,
          category,
          date: expenseDate,
          account_id: accountId || undefined,
          notes: expenseNotes,
        });
        expenseId = existingExpenseId;
      } else {
        expenseId = await addExpense({
          amount: recordedExpenseAmount,
          description: finalDesc,
          category,
          date: expenseDate,
          account_id: accountId || undefined,
          notes: expenseNotes,
        });
      }

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
    } catch (err) {
      console.error('Failed to create split:', err);
      toast.error('Failed to save split. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAll = () => {
    setIsShareSheetOpen(false);
    if (onSplitCompleted) {
      onSplitCompleted();
    } else {
      onClose();
    }
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
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Optional Inline UPI ID Banner if not yet configured */}
              {showUpiPrompt && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Set your UPI ID to receive payments
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUpiPrompt(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. yourname@okhdfcbank"
                      value={inlineUpiId}
                      onChange={(e) => setInlineUpiId(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveInlineUpi}
                      className="h-8 text-xs px-3"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Bill Details */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Total Bill Amount
                    </label>
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
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Paid From Account
                    </label>
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
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Description / Note
                  </label>
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
                    onClick={() => handleSwitchMode('equal')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      mode === 'equal'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Equally ({participants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('exact')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      mode === 'exact'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Exact Amounts
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('percentage')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      mode === 'percentage'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Percentages (%)
                  </button>
                </div>
              </div>

              {/* Add Friends Section */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">
                  Who is in this split?
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter friend names (e.g. Rahul, Priya)..."
                    value={friendNameInput}
                    onChange={(e) => setFriendNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFriend();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddFriend()}
                    size="sm"
                    className="px-4 gap-1.5 shrink-0"
                  >
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
                        className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 shadow-xs cursor-pointer"
                      >
                        + {friend}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Participants Split List */}
              <div className="space-y-2.5">
                {calculatedParticipants.map((p) => {
                  const rawAmountStr = inputAmounts[p.id] !== undefined ? inputAmounts[p.id] : (p.amount ? String(p.amount) : '');
                  const rawPercentageStr = inputPercentages[p.id] !== undefined ? inputPercentages[p.id] : (p.percentage ? String(p.percentage) : '');

                  return (
                    <div
                      key={p.id || `p-${p.name}`}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                        p.isSelf ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
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
                            {mode === 'percentage'
                              ? `${p.percentage || 0}%`
                              : p.isSelf
                              ? 'Paid by you'
                              : 'Owes you'}
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
                              step="any"
                              placeholder="0"
                              value={rawAmountStr}
                              onChange={(e) => handleCustomAmountChange(p.id, e.target.value)}
                              className="h-8 text-right text-xs font-bold"
                            />
                          </div>
                        )}

                        {mode === 'percentage' && (
                          <div className="w-20 relative">
                            <Input
                              type="number"
                              step="any"
                              placeholder="0"
                              value={rawPercentageStr}
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
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            aria-label={`Remove ${p.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          Unallocated amount: {formatCurrency(Math.abs(difference), currency)}{' '}
                          {difference > 0 ? 'remaining' : 'over-allocated'}
                        </span>
                      </div>

                      {/* 1-Click Auto Balance Action Helpers */}
                      <div className="flex gap-2 pt-1 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAutoBalanceSelf}
                          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Wand2 className="w-3 h-3" /> Auto-balance You
                        </Button>
                        {difference > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDistributeRemaining}
                            className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <Scale className="w-3 h-3" /> Split Remaining
                          </Button>
                        )}
                      </div>
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
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose} 
                  className="flex-1 sm:flex-initial"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmSplit}
                  disabled={isSubmitting || participants.length < 2 || !isBalanced || numTotal <= 0}
                  className="gap-2 px-5 font-semibold flex-1 sm:flex-initial shadow-md transition-all active:scale-95 bg-primary text-primary-foreground hover:opacity-90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Recording...
                    </>
                  ) : (
                    <>
                      Confirm & Request <ArrowRight className="w-4 h-4" />
                    </>
                  )}
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
        payerUpiId={settings.upiId || inlineUpiId}
        payerName={settings.userName || 'Me'}
        currency={currency}
      />
    </>
  );
};

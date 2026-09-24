import { useState, useMemo } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useExpenseStore } from "../store/useExpenseStore";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Trash2, CheckCircle2, ShoppingBag, Check, CalendarDays, HandCoins } from "lucide-react";
import { vibrate } from "../lib/utils";
import { formatCurrency } from "../lib/formatCurrency";
import { toast } from "sonner";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { playSuccessSound } from "../lib/sound";
import { EmptyState } from "../components/ui/EmptyState";
import { calculateCashflowSummary, getBillDueStatus, getSubscriptionDueStatus } from "../lib/cashflow";

export default function Planned() {
  const [activeTab, setActiveTab] = useState<"bills" | "subs" | "wishlist" | "iou">("bills");
  const { settings, expenses, bills, subscriptions } = useExpenseStore();

  const cashflow = useMemo(() => {
    return calculateCashflowSummary(
      settings.monthlyIncome,
      expenses,
      bills,
      subscriptions,
      new Date()
    );
  }, [settings.monthlyIncome, expenses, bills, subscriptions]);

  const totalDeducted = cashflow.dueBillsAmount + cashflow.dueSubsAmount;
  const upcomingTotal = cashflow.upcomingObligationsTotal;

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planned</h1>
          <p className="text-muted-foreground text-sm">Bills, Subscriptions, Wishlist & IOUs</p>
        </div>
      </header>

      {/* Cashflow & Deductions Overview */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="p-4 rounded-3xl bg-card/92 dark:bg-card/78 border border-border/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold text-foreground">Deducted So Far</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-foreground mt-2 display-number">
            {formatCurrency(totalDeducted, settings.currency)}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
            Due date arrived this month
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-card/92 dark:bg-card/78 border border-border/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold text-foreground">Upcoming</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 display-number">
            {formatCurrency(upcomingTotal, settings.currency)}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
            Deducts on due dates
          </span>
        </div>
      </div>

      <SegmentedControl
        options={[
          { label: "Bills", value: "bills" },
          { label: "Subs", value: "subs" },
          { label: "Wishlist", value: "wishlist" },
          { label: "IOUs", value: "iou" }
        ]}
        value={activeTab}
        onChange={(val) => setActiveTab(val as any)}
        className="w-full"
      />

      {activeTab === "bills" && <BillsTab />}
      {activeTab === "subs" && <SubscriptionsTab />}
      {activeTab === "wishlist" && <WishlistTab />}
      {activeTab === "iou" && <IOUTab />}
    </div>
  );
}

function SwipeablePayRow({
  children,
  onPay,
  payLabel = "Swipe to Pay"
}: {
  children: React.ReactNode;
  onPay: () => void;
  payLabel?: string;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [10, 60], [0, 1]);
  const scale = useTransform(x, [10, 60], [0.8, 1]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs select-none">
      {/* Background Pay Indicator */}
      <div className="absolute inset-0 bg-emerald-500/15 flex items-center pl-4 font-semibold text-xs text-emerald-600 dark:text-emerald-400">
        <motion.div style={{ opacity, scale }} className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{payLabel}</span>
        </motion.div>
      </div>

      {/* Draggable Foreground */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 80 }}
        dragElastic={0.45}
        style={{ x }}
        onDragEnd={(_e, info) => {
          if (info.offset.x > 60 || info.velocity.x > 250) {
            onPay();
          }
        }}
        className="relative bg-card touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

function SubscriptionsTab() {
  const { subscriptions, addSubscription, deleteSubscription, settings, addExpense } = useExpenseStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [nextDate, setNextDate] = useState("");

  const handleSave = () => {
    if (!newName || !newAmount || !nextDate) return;
    vibrate();
    addSubscription({
      name: newName,
      amount: parseFloat(newAmount),
      billing_cycle: billingCycle,
      next_billing_date: nextDate,
      category: "Bills"
    });
    setNewName("");
    setNewAmount("");
    setNextDate("");
    setIsAdding(false);
  };

  const handleLogPayment = (sub: any) => {
    vibrate(20);
    if (settings.soundEnabled) playSuccessSound();
    addExpense({
      amount: sub.amount,
      description: `${sub.name} Subscription`,
      category: sub.category || "Bills",
      date: new Date().toISOString(),
      notes: "Manually logged from Subscriptions page"
    });
    toast.success(`${sub.name} payment logged!`);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Subscriptions</h2>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant="outline">
          <Plus className="w-4 h-4 mr-1" /> Add Sub
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary animate-in fade-in">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium text-sm">Add New Subscription</h3>
            <div className="space-y-3">
              <Input 
                placeholder="Name (e.g. Netflix, Rent)" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Amount" 
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as any)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <Input 
                  type="date"
                  placeholder="Next Billing Date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {subscriptions.length === 0 && !isAdding ? (
          <EmptyState
            icon={<CalendarDays className="w-6 h-6" />}
            title="No subscriptions tracked"
            description="Keep tabs on your recurring services like Netflix, Spotify, or gym memberships."
            compact
            actionLabel="+ Add Subscription"
            onAction={() => setIsAdding(true)}
          />
        ) : (
          subscriptions.map(sub => {
            const dueStatus = getSubscriptionDueStatus(sub);
            return (
              <SwipeablePayRow key={sub.id} onPay={() => handleLogPayment(sub)} payLabel="Log Payment">
                <div className="p-4 flex justify-between items-center pl-5 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l" />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{sub.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        dueStatus.badgeColor === 'emerald'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : dueStatus.badgeColor === 'amber'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-muted text-muted-foreground border-border/50'
                      }`}>
                        {dueStatus.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      {formatCurrency(sub.amount, settings.currency)} 
                      <span className="text-[10px] uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {sub.billing_cycle}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next bill: {new Date(sub.next_billing_date).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-7 text-xs px-2"
                      onClick={() => handleLogPayment(sub)}
                    >
                      Log Payment
                    </Button>
                    <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                      (or swipe right to log)
                    </span>
                  </div>
                </div>
                <div className="flex items-start h-full self-start shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {
                    vibrate();
                    if(confirm("Delete this subscription?")) deleteSubscription(sub.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SwipeablePayRow>
          );
        }))}
      </div>
    </div>
  );
}

function WishlistTab() {
  const { wishlistItems, addWishlistItem, updateWishlistItem, deleteWishlistItem, addExpense, settings } = useExpenseStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [enableCoolingLock, setEnableCoolingLock] = useState(true);
  const [reflectingItem, setReflectingItem] = useState<any | null>(null);

  const handleSave = () => {
    if (!newName.trim()) return;
    vibrate(10);
    const coolingEnds = enableCoolingLock
      ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      : null;

    addWishlistItem({
      item_name: newName.trim(),
      estimated_amount: newAmount ? parseFloat(newAmount) : undefined,
      category: "Shopping",
      cooling_ends_at: coolingEnds,
      is_impulse_locked: enableCoolingLock,
    });

    setNewName("");
    setNewAmount("");
    setIsAdding(false);
    toast.success(
      enableCoolingLock
        ? `Added "${newName}" with a 72-hour reflection lock 🔒`
        : `Added "${newName}" to wishlist`
    );
  };

  const handleAttemptPurchase = (item: any) => {
    vibrate(10);
    const now = new Date();
    const isLocked = item.is_impulse_locked && item.cooling_ends_at && new Date(item.cooling_ends_at) > now;
    if (isLocked) {
      setReflectingItem(item);
      return;
    }
    proceedWithPurchase(item);
  };

  const proceedWithPurchase = (item: any) => {
    if (confirm(`Mark "${item.item_name}" as purchased and log as an expense?`)) {
      vibrate(15);
      const actualCostStr = prompt(
        `Enter final cost for ${item.item_name}:`,
        item.estimated_amount?.toString() || "0"
      );
      if (actualCostStr === null) return;

      const actualCost = parseFloat(actualCostStr);
      if (isNaN(actualCost)) return;

      addExpense({
        amount: actualCost,
        description: `Purchased: ${item.item_name}`,
        category: item.category || "Shopping",
        date: new Date().toISOString(),
        notes: "Logged from Wishlist",
      });

      updateWishlistItem(item.id, { is_purchased: true });
      toast.success(`Purchased "${item.item_name}"!`);
      setReflectingItem(null);
    }
  };

  const handleAvoidImpulse = (item: any) => {
    vibrate(20);
    deleteWishlistItem(item.id);
    setReflectingItem(null);
    toast.success(
      `🎉 Masterful discipline! You avoided an impulse buy and saved ${
        item.estimated_amount ? formatCurrency(item.estimated_amount, settings.currency) : 'money'
      }!`,
      { duration: 4000 }
    );
  };

  const pendingItems = wishlistItems.filter((i) => !i.is_purchased);
  const completedItems = wishlistItems.filter((i) => i.is_purchased);
  const totalEstimated = pendingItems.reduce((acc, curr) => acc + (curr.estimated_amount || 0), 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Wishlist & Goals</h2>
          {totalEstimated > 0 && (
            <p className="text-xs text-muted-foreground">
              Est. Total: {formatCurrency(totalEstimated, settings.currency)}
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant="outline">
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary animate-in fade-in">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium text-sm">Add to Wishlist</h3>
            <div className="space-y-3">
              <Input
                placeholder="Item Name (e.g. Sony WH-1000XM5)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Estimated Amount (Optional)"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />

              {/* 72h Cooling off checkbox */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-secondary/40 border border-border/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableCoolingLock}
                  onChange={(e) => setEnableCoolingLock(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>🔒 72-Hour Cooling-Off Lock</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary">Recommended</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Pauses immediate buying impulse so you can reflect before spending
                  </p>
                </div>
              </label>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save to Wishlist
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wishlist Items List */}
      <div className="space-y-3">
        {pendingItems.length === 0 && !isAdding ? (
          <EmptyState
            icon={<ShoppingBag className="w-6 h-6" />}
            title="Your wishlist is empty"
            description="Save purchases you're planning for, estimate costs, and curb impulse spending."
            compact
            actionLabel="+ Add Item"
            onAction={() => setIsAdding(true)}
          />
        ) : (
          pendingItems.map((item) => {
            const now = new Date();
            const isLocked =
              item.is_impulse_locked &&
              item.cooling_ends_at &&
              new Date(item.cooling_ends_at) > now;

            const remainingMs = item.cooling_ends_at
              ? new Date(item.cooling_ends_at).getTime() - now.getTime()
              : 0;
            const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
            const remainingMins = Math.max(0, Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)));

            return (
              <Card
                key={item.id}
                className={`overflow-hidden border-l-4 transition-all ${
                  isLocked ? 'border-l-amber-500 bg-amber-500/[0.03]' : 'border-l-emerald-500'
                }`}
              >
                <CardContent className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <button
                      onClick={() => handleAttemptPurchase(item)}
                      title={isLocked ? "In 72h reflection period" : "Mark as purchased"}
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isLocked ? 'border-amber-500 text-amber-500' : 'border-muted-foreground'
                      }`}>
                        {isLocked && <span className="text-[10px]">🔒</span>}
                      </div>
                    </button>

                    <div className="truncate">
                      <p className="font-medium truncate text-sm text-foreground">{item.item_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.estimated_amount ? (
                          <span className="text-xs font-semibold text-muted-foreground">
                            Est. {formatCurrency(item.estimated_amount, settings.currency)}
                          </span>
                        ) : null}

                        {isLocked ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/25">
                            ⏳ {remainingHours}h {remainingMins}m cooling
                          </span>
                        ) : item.is_impulse_locked ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/25">
                            ✅ Cooled off
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* 1-tap impulse avoidance button */}
                    {isLocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAvoidImpulse(item)}
                        title="I decided not to buy this!"
                        className="text-[11px] h-7 px-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium rounded-lg"
                      >
                        Don't Need It
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8"
                      onClick={() => deleteWishlistItem(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Reflection Intervention Modal */}
        {reflectingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setReflectingItem(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="relative w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl p-5 space-y-4 z-10 text-center animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center text-2xl">
                ⏳
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">72-Hour Impulse Lock</h3>
                <p className="text-xs text-muted-foreground mt-1 px-2">
                  You locked <span className="font-semibold text-foreground">{reflectingItem.item_name}</span> to pause the urge. Do you genuinely still need this?
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => handleAvoidImpulse(reflectingItem)}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                >
                  🎉 I Don't Need It (Save {reflectingItem.estimated_amount ? formatCurrency(reflectingItem.estimated_amount, settings.currency) : 'Money'}!)
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setReflectingItem(null)}
                  className="w-full rounded-xl text-xs"
                >
                  Keep Waiting (Cooling Off)
                </Button>

                <button
                  onClick={() => proceedWithPurchase(reflectingItem)}
                  className="w-full text-[11px] text-muted-foreground hover:text-foreground pt-1 underline cursor-pointer"
                >
                  I really need this now (Override)
                </button>
              </div>
            </div>
          </div>
        )}

        {completedItems.length > 0 && (
          <div className="pt-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Purchased</h3>
            <div className="space-y-2">
              {completedItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 px-3 rounded-lg bg-muted/50 opacity-60">
                  <div className="flex items-center gap-3 truncate">
                     <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                     <p className="text-sm line-through truncate">{item.item_name}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0 h-6 w-6"
                    onClick={() => deleteWishlistItem(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IOUTab() {
  const { debts, addDebt, updateDebt, deleteDebt, addExpense, settings } = useExpenseStore();
  const [isAdding, setIsAdding] = useState(false);
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"lent" | "borrowed">("lent");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!personName || !amount) return;
    vibrate();
    addDebt({
      person_name: personName,
      amount: parseFloat(amount),
      type,
      status: "pending",
      date: new Date().toISOString(),
      notes
    });
    setPersonName("");
    setAmount("");
    setNotes("");
    setIsAdding(false);
  };

  const handleSettle = (debt: any) => {
    if (confirm(`Mark debt with ${debt.person_name} as settled?`)) {
      vibrate();
      updateDebt(debt.id, { status: "settled" });
      
      if (debt.type === "lent" && confirm("Would you like to log this returned money as Income?")) {
        addExpense({
          amount: debt.amount,
          description: `Settled: ${debt.person_name}`,
          category: "Income",
          date: new Date().toISOString(),
          notes: debt.notes
        });
      } else if (debt.type === "borrowed" && confirm("Would you like to log this payment as an Expense?")) {
        addExpense({
          amount: debt.amount,
          description: `Repaid: ${debt.person_name}`,
          category: "Other", // Or 'Debt Repayment' if it exists
          date: new Date().toISOString(),
          notes: debt.notes
        });
      }
    }
  };

  const pendingDebts = debts.filter(d => d.status === "pending");
  const lentTotal = pendingDebts.filter(d => d.type === "lent").reduce((a, b) => a + b.amount, 0);
  const borrowedTotal = pendingDebts.filter(d => d.type === "borrowed").reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">IOUs</h2>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant="outline">
          <Plus className="w-4 h-4 mr-1" /> Add IOU
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-emerald-600 mb-1">To Collect</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(lentTotal, settings.currency)}</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/10 border-rose-500/20">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-rose-600 mb-1">To Pay</p>
            <p className="text-xl font-bold text-rose-600">{formatCurrency(borrowedTotal, settings.currency)}</p>
          </CardContent>
        </Card>
      </div>

      {isAdding && (
        <Card className="border-primary animate-in fade-in">
          <CardContent className="p-4 space-y-4">
            <div className="flex bg-muted p-1 rounded-md">
              <button
                onClick={() => setType("lent")}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${type === "lent" ? "bg-background shadow text-emerald-600" : "text-muted-foreground"}`}
              >
                I Lent Money
              </button>
              <button
                onClick={() => setType("borrowed")}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${type === "borrowed" ? "bg-background shadow text-rose-600" : "text-muted-foreground"}`}
              >
                I Borrowed Money
              </button>
            </div>
            <div className="space-y-3">
              <Input 
                placeholder="Person Name" 
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Amount" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input 
                placeholder="Notes (opt)" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 mt-4">
        {pendingDebts.length === 0 && !isAdding ? (
          <EmptyState
            icon={<HandCoins className="w-6 h-6" />}
            title="No pending IOUs"
            description="Track money you lent to friends or need to pay back."
            compact
            actionLabel="+ Add IOU"
            onAction={() => setIsAdding(true)}
          />
        ) : (
          pendingDebts.map(debt => (
            <Card key={debt.id} className="overflow-hidden">
              <CardContent className="p-0 flex items-center relative">
                <div className={`w-2 h-full absolute left-0 top-0 bottom-0 ${debt.type === 'lent' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div className="p-4 pl-6 flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-medium text-sm">
                        {debt.type === 'lent' ? `Collect from ${debt.person_name}` : `Pay ${debt.person_name}`}
                      </h3>
                      {debt.notes && <p className="text-xs text-muted-foreground mt-0.5">{debt.notes}</p>}
                    </div>
                    <span className={`font-semibold ${debt.type === 'lent' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(debt.amount, settings.currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-7 text-xs px-2"
                      onClick={() => handleSettle(debt)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Mark Settled
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:bg-destructive/10 shrink-0 mx-2"
                  onClick={() => deleteDebt(debt.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
function BillsTab() {
  const { bills, addBill, deleteBill, updateBill, settings, addExpense } = useExpenseStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDay, setNewDueDay] = useState("5");

  const handleSave = () => {
    if (!newTitle || !newAmount) return;
    vibrate();
    addBill({
      title: newTitle,
      amount: parseFloat(newAmount),
      autoDeduct: true,
      category: "Bills",
      due_day: Math.min(31, Math.max(1, parseInt(newDueDay) || 1))
    });
    setNewTitle("");
    setNewAmount("");
    setNewDueDay("5");
    setIsAdding(false);
  };

  const handlePayNow = (bill: any) => {
    vibrate(20);
    if (settings.soundEnabled) playSuccessSound();
    addExpense({
      amount: bill.amount,
      description: `Manual Payment: ${bill.title}`,
      category: bill.category || "Bills",
      date: new Date().toISOString(),
      notes: "Manually logged from Bills page"
    });
    toast.success(`${bill.title} marked as paid!`);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Monthly Bills</h2>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant="outline">
          <Plus className="w-4 h-4 mr-1" /> Add Bill
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary animate-in fade-in">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium text-sm">Add New Bill</h3>
            <div className="space-y-3">
              <Input 
                placeholder="Bill Name (e.g. Internet, Rent)" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Amount" 
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Due Day of the Month (1 - 31)</label>
                <Input 
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Day (e.g. 5 for 5th of each month)" 
                  value={newDueDay}
                  onChange={(e) => setNewDueDay(e.target.value)}
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Deducts from available balance on this day each month
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {bills.length === 0 && !isAdding ? (
          <EmptyState
            icon={<CalendarDays className="w-6 h-6" />}
            title="No monthly bills"
            description="Add recurring monthly obligations like rent, utilities, electricity, or internet."
            compact
            actionLabel="+ Add Bill"
            onAction={() => setIsAdding(true)}
          />
        ) : (
          bills.map(bill => {
            const dueStatus = getBillDueStatus(bill);
            return (
              <SwipeablePayRow key={bill.id} onPay={() => handlePayNow(bill)} payLabel="Pay Bill">
                <div className="p-4 flex justify-between items-center">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{bill.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        dueStatus.badgeColor === 'emerald'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : dueStatus.badgeColor === 'amber'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-muted text-muted-foreground border-border/50'
                      }`}>
                        {dueStatus.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {formatCurrency(bill.amount, settings.currency)} / month
                    </p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <button 
                        onClick={() => updateBill(bill.id, { autoDeduct: !bill.autoDeduct })}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <CheckCircle2 className={`w-4 h-4 ${bill.autoDeduct ? "text-primary" : "text-muted"}`} />
                        Auto Deduct
                      </button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-7 text-xs px-2"
                        onClick={() => handlePayNow(bill)}
                      >
                        Pay Now
                      </Button>
                      <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                        (or swipe right to pay)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start h-full shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {
                      vibrate();
                      if(confirm("Delete this bill?")) deleteBill(bill.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SwipeablePayRow>
            );
          })
        )}
      </div>
    </div>
  );
}
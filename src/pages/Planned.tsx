import { useState } from "react";
import { useExpenseStore } from "../store/useExpenseStore";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Trash2, CheckCircle2, ShoppingBag } from "lucide-react";
import { vibrate } from "../lib/utils";
import { formatCurrency } from "../lib/formatCurrency";

export default function Planned() {
  const [activeTab, setActiveTab] = useState<"bills" | "subs" | "wishlist" | "iou">("bills");

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planned</h1>
          <p className="text-muted-foreground text-sm">Bills, Subscriptions, Wishlist & IOUs</p>
        </div>
      </header>

      <div className="flex bg-muted p-1 rounded-lg overflow-x-auto scrollbar-hide">
        <button
          onClick={() => { vibrate(10); setActiveTab("bills"); }}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors shrink-0 ${activeTab === "bills" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Bills
        </button>
        <button
          onClick={() => { vibrate(10); setActiveTab("subs"); }}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors shrink-0 ${activeTab === "subs" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Subs
        </button>
        <button
          onClick={() => { vibrate(10); setActiveTab("wishlist"); }}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors shrink-0 ${activeTab === "wishlist" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Wishlist
        </button>
        <button
          onClick={() => { vibrate(10); setActiveTab("iou"); }}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors shrink-0 ${activeTab === "iou" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          IOUs
        </button>
      </div>

      {activeTab === "bills" && <BillsTab />}
      {activeTab === "subs" && <SubscriptionsTab />}
      {activeTab === "wishlist" && <WishlistTab />}
      {activeTab === "iou" && <IOUTab />}
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
    vibrate();
    addExpense({
      amount: sub.amount,
      description: `${sub.name} Subscription`,
      category: sub.category || "Bills",
      date: new Date().toISOString(),
      notes: "Manually logged from Subscriptions page"
    });
    alert(`${sub.name} payment logged!`);
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
          <p className="text-center text-muted-foreground py-8">No subscriptions tracked yet.</p>
        ) : (
          subscriptions.map(sub => (
            <Card key={sub.id} className="overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <CardContent className="p-4 flex justify-between items-center pl-5">
                <div className="space-y-1">
                  <p className="font-semibold">{sub.name}</p>
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
                  </div>
                </div>
                <div className="flex items-start h-full self-start">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {
                    vibrate();
                    if(confirm("Delete this subscription?")) deleteSubscription(sub.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function WishlistTab() {
  const { wishlistItems, addWishlistItem, updateWishlistItem, deleteWishlistItem, settings, addExpense } = useExpenseStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const handleSave = () => {
    if (!newName) return;
    vibrate();
    addWishlistItem({
      item_name: newName,
      estimated_amount: newAmount ? parseFloat(newAmount) : undefined,
      category: "Shopping"
    });
    setNewName("");
    setNewAmount("");
    setIsAdding(false);
  };

  const handlePurchase = (item: any) => {
    if (confirm(`Mark "${item.item_name}" as purchased and log as an expense?`)) {
      vibrate();
      const actualCostStr = prompt(`Enter final cost for ${item.item_name}:`, item.estimated_amount?.toString() || "0");
      if (actualCostStr === null) return;
      
      const actualCost = parseFloat(actualCostStr);
      if (isNaN(actualCost)) return;

      addExpense({
        amount: actualCost,
        description: `Purchased: ${item.item_name}`,
        category: item.category || "Shopping",
        date: new Date().toISOString(),
        notes: "Logged from Wishlist"
      });
      
      updateWishlistItem(item.id, { is_purchased: true });
    }
  };

  const pendingItems = wishlistItems.filter(i => !i.is_purchased);
  const completedItems = wishlistItems.filter(i => i.is_purchased);

  const totalEstimated = pendingItems.reduce((acc, curr) => acc + (curr.estimated_amount || 0), 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Wishlist</h2>
          {totalEstimated > 0 && (
             <p className="text-xs text-muted-foreground">Est. Total: {formatCurrency(totalEstimated, settings.currency)}</p>
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
                placeholder="Item Name (e.g. New Headphones)" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Estimated Amount (Optional)" 
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {pendingItems.length === 0 && !isAdding ? (
          <div className="text-center text-muted-foreground py-8 flex flex-col items-center">
            <ShoppingBag className="w-8 h-8 mb-2 opacity-50" />
            <p>Your wishlist is empty.</p>
          </div>
        ) : (
          pendingItems.map(item => (
            <Card key={item.id} className="overflow-hidden border-l-4 border-l-orange-500">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <button onClick={() => handlePurchase(item)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                     <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center" />
                  </button>
                  <div className="truncate">
                    <p className="font-medium truncate">{item.item_name}</p>
                    {item.estimated_amount ? (
                      <p className="text-xs text-muted-foreground">Est. {formatCurrency(item.estimated_amount, settings.currency)}</p>
                    ) : null}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8"
                  onClick={() => deleteWishlistItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))
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
          <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
            <p className="text-sm">No pending IOUs</p>
          </div>
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

  const handleSave = () => {
    if (!newTitle || !newAmount) return;
    vibrate();
    addBill({
      title: newTitle,
      amount: parseFloat(newAmount),
      autoDeduct: true,
      category: "Bills"
    });
    setNewTitle("");
    setNewAmount("");
    setIsAdding(false);
  };

  const handlePayNow = (bill: any) => {
    vibrate();
    addExpense({
      amount: bill.amount,
      description: `Manual Payment: ${bill.title}`,
      category: bill.category || "Bills",
      date: new Date().toISOString(),
      notes: "Manually logged from Bills page"
    });
    alert(`${bill.title} marked as paid!`);
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
                placeholder="Bill Name (e.g. Internet)" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Input 
                type="number" 
                placeholder="Amount" 
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
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
          <p className="text-center text-muted-foreground py-8">No bills added yet.</p>
        ) : (
          bills.map(bill => (
            <Card key={bill.id} className="overflow-hidden">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-semibold">{bill.title}</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {formatCurrency(bill.amount, settings.currency)} / month
                  </p>
                  <div className="flex items-center gap-4 mt-3">
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
                  </div>
                </div>
                <div className="flex items-start h-full">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {
                    vibrate();
                    if(confirm("Delete this bill?")) deleteBill(bill.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
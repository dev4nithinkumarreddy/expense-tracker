import { useState } from "react";
import { useExpenseStore } from "../store/useExpenseStore";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Trash2, CheckCircle2, ShoppingBag } from "lucide-react";
import { vibrate } from "../lib/utils";
import { formatCurrency } from "../lib/formatCurrency";

export default function Planned() {
  const [activeTab, setActiveTab] = useState<"bills" | "wishlist">("bills");

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planned</h1>
          <p className="text-muted-foreground text-sm">Bills & Wishlist</p>
        </div>
      </header>

      <div className="flex bg-muted p-1 rounded-lg">
        <button
          onClick={() => { vibrate(10); setActiveTab("bills"); }}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "bills" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Recurring Bills
        </button>
        <button
          onClick={() => { vibrate(10); setActiveTab("wishlist"); }}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "wishlist" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Wishlist
        </button>
      </div>

      {activeTab === "bills" ? <BillsTab /> : <WishlistTab />}
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                  onClick={() => deleteBill(bill.id)}
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

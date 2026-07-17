import { useState } from "react";
import { useExpenseStore } from "../store/useExpenseStore";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { vibrate } from "../lib/utils";
import { formatCurrency } from "../lib/formatCurrency";

export default function Bills() {
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
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Bills</h1>
          <p className="text-muted-foreground text-sm">Recurring fixed expenses</p>
        </div>
        <Button size="icon" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      {isAdding && (
        <Card className="border-primary animate-in fade-in slide-in-from-top-4">
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

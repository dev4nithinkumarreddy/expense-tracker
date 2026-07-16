import { useState, useEffect } from "react";
import { useExpenseStore, type Expense } from "../store/useExpenseStore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export function AddExpenseModal({ 
  isOpen, 
  onClose,
  expenseToEdit
}: { 
  isOpen: boolean; 
  onClose: () => void;
  expenseToEdit?: Expense | null;
}) {
  const { settings, addExpense, updateExpense } = useExpenseStore();
  
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setAmount(String(expenseToEdit.amount));
        setDescription(expenseToEdit.description);
        setCategory(expenseToEdit.category);
        setDate(expenseToEdit.date.split("T")[0]);
        setNotes(expenseToEdit.notes || "");
        setReceiptFile(null);
      } else {
        setAmount("");
        setDescription("");
        setCategory(settings.categories[0] || "Other");
        setDate(new Date().toISOString().split("T")[0]);
        setNotes("");
        setReceiptFile(null);
      }
    }
  }, [isOpen, expenseToEdit, settings.categories]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && description.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setUploading(true);

    let receipt_url = expenseToEdit?.receipt_url;

    if (receiptFile) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);
          
        if (!error) {
          const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
          receipt_url = data.publicUrl;
        }
      }
    }
    
    const expenseData = {
      amount: parsedAmount,
      description: description.trim(),
      category,
      date: new Date(date).toISOString(),
      notes: notes.trim(),
      receipt_url
    };

    if (expenseToEdit) {
      updateExpense(expenseToEdit.id, expenseData);
    } else {
      addExpense(expenseData);
    }
    setUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card text-card-foreground w-full max-w-sm rounded-t-2xl sm:rounded-2xl border shadow-lg animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 max-h-[85dvh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">{expenseToEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto pb-8">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-muted-foreground">{settings.currency}</span>
              <Input
                type="text"
                inputMode="decimal"
                className="pl-8 text-lg font-medium"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <Input
              placeholder="e.g. Coffee with friends"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Category</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {settings.categories.map((c) => (
                <option key={c} value={c} className="bg-background">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Notes (Optional)</label>
            <Input
              placeholder="Add more details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Receipt (Optional)</label>
            <div className="flex items-center gap-4">
              {expenseToEdit?.receipt_url && !receiptFile && (
                <img src={expenseToEdit.receipt_url} alt="Receipt" className="w-12 h-12 object-cover rounded-md border" />
              )}
              <label className="flex items-center justify-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-secondary/50 text-sm font-medium transition-colors w-full">
                <ImagePlus className="w-4 h-4" />
                {receiptFile ? receiptFile.name : 'Attach Image'}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
          <Button 
            className="w-full mt-4" 
            size="lg" 
            onClick={handleSave}
            disabled={!isValid || uploading}
          >
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              expenseToEdit ? 'Save Changes' : 'Save Expense'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExpenseStore, type Expense } from "../store/useExpenseStore";
import { X, Loader2, Camera, Calendar, Repeat, FileText, ShoppingBag } from "lucide-react";
import { supabase } from "../lib/supabase";
import { cn, vibrate } from "../lib/utils";
import Tesseract from 'tesseract.js';
import { format, parseISO, subDays } from "date-fns";
import { playSuccessSound } from "../lib/sound";

const DEFAULT_CATEGORY_EMOJIS: Record<string, string> = {
  Food: '🍔',
  Dining: '🍽️',
  Grocery: '🛒',
  Groceries: '🛒',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Travel: '✈️',
  Transport: '🚗',
  Bills: '💡',
  Utilities: '⚡',
  Medical: '💊',
  Health: '🏥',
  Gym: '🏋️',
  'Gym supplise': '🏋️',
  'Gym supplies': '🏋️',
  EMI: '💳',
  Income: '💰',
  Salary: '💵',
  Investment: '📈',
  Personal: '👤',
  Education: '📚',
  Other: '📦',
};

function getCategoryEmoji(categoryName: string, customEmojis?: Record<string, string>): string {
  return customEmojis?.[categoryName] || DEFAULT_CATEGORY_EMOJIS[categoryName] || '🏷️';
}

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
  const [category, setCategory] = useState(() => settings.categories[0] || "Other");
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setAmount(String(expenseToEdit.amount));
        setDescription(expenseToEdit.description);
        setCategory(expenseToEdit.category);
        setDate(expenseToEdit.date.split("T")[0]);
        setNotes(expenseToEdit.notes || "");
        setReceiptFile(null);
        setRecurrence(expenseToEdit.recurrence || 'none');
      } else {
        setAmount("");
        
        // Auto-fill from share target API
        const shared = useExpenseStore.getState().sharedData;
        if (shared) {
          const parts = [shared.title, shared.text, shared.url].filter(Boolean);
          setDescription(parts.join(' - '));
          useExpenseStore.getState().setSharedData(null); // Clear it
        } else {
          setDescription("");
        }

        setCategory(settings.categories[0] || "Other");
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setNotes("");
        setReceiptFile(null);
        setRecurrence('none');
      }
    }
  }, [isOpen, expenseToEdit, settings.categories]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      setIsScanning(true);
      vibrate(15);
      
      try {
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;
        
        // Extract amounts (looking for numbers with decimals)
        const amounts = text.match(/\b\d+\.\d{2}\b/g);
        if (amounts && amounts.length > 0) {
          const maxAmount = Math.max(...amounts.map(Number));
          if (maxAmount > 0 && !amount) {
            setAmount(String(maxAmount));
          }
        }
        
        // Try to get merchant name from the first non-empty line
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        if (lines.length > 0 && !description) {
          setDescription(lines[0]);
        }
      } catch (err) {
        console.error("OCR Failed", err);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && description.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    vibrate(20);
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
    
    const calculateNextOccurrence = (startDate: Date, rec: string) => {
      const nextDate = new Date(startDate);
      if (rec === 'daily') nextDate.setDate(nextDate.getDate() + 1);
      else if (rec === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (rec === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      return nextDate;
    };

    const isDateToday = date === format(new Date(), 'yyyy-MM-dd');
    let isoDate: string;
    if (expenseToEdit && format(parseISO(expenseToEdit.date), 'yyyy-MM-dd') === date) {
      isoDate = expenseToEdit.date;
    } else {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      isoDate = isDateToday ? now.toISOString() : new Date(`${date}T${timeStr}`).toISOString();
    }

    const expenseData = {
      amount: parsedAmount,
      description: description.trim(),
      category,
      date: isoDate,
      notes: notes.trim(),
      receipt_url,
      recurrence,
      next_occurrence: recurrence !== 'none' ? calculateNextOccurrence(new Date(isoDate), recurrence).toISOString() : null
    };

    if (expenseToEdit) {
      updateExpense(expenseToEdit.id, expenseData);
    } else {
      addExpense(expenseData);
    }

    if (settings.soundEnabled) {
      playSuccessSound();
    }

    setUploading(false);
    onClose();
  };

  const isTodayDate = date === format(new Date(), 'yyyy-MM-dd');
  const isYesterdayDate = date === format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const formattedDateLabel = useMemo(() => {
    if (!date) return 'Today';
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      if (date === todayStr) return 'Today';
      if (date === yesterdayStr) return 'Yesterday';
      const parsed = parseISO(date);
      if (isNaN(parsed.getTime())) return 'Today';
      return format(parsed, 'MMM d, yyyy');
    } catch {
      return 'Today';
    }
  }, [date]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-md"
          />

          {/* Centered Floating Glass Modal (No popping from bottom) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 360,
            }}
            className="bg-card/95 dark:bg-card/90 text-card-foreground w-full max-w-md rounded-[32px] border border-white/20 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.6)] max-h-[88dvh] flex flex-col z-10 relative overflow-hidden backdrop-blur-2xl"
          >
            {/* Navigation Bar */}
            <div className="flex justify-between items-center px-5 pt-4 pb-2 shrink-0 border-b border-border/20">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-1 py-1 -ml-1 rounded-md"
              >
                Cancel
              </button>
              <h2 className="text-base font-semibold tracking-tight">
                {expenseToEdit ? 'Edit Expense' : 'New Expense'}
              </h2>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isValid || uploading}
                className={cn(
                  "text-sm font-semibold transition-colors px-1 py-1 -mr-1 rounded-md",
                  isValid && !uploading
                    ? "text-primary hover:opacity-85 cursor-pointer"
                    : "text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                Done
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 pt-1 space-y-4 overflow-y-auto pb-8 scrollbar-hide">

              {/* 1. Hero Amount Display */}
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <div className="flex items-baseline justify-center gap-1.5 w-full">
                  <span className="text-3xl sm:text-4xl font-bold text-muted-foreground/50 select-none">
                    {settings.currency}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                        setAmount(val);
                      }
                    }}
                    className="text-5xl sm:text-6xl font-black tracking-tight bg-transparent text-center focus:outline-none w-auto max-w-[260px] caret-primary text-foreground placeholder:text-muted-foreground/25"
                  />
                </div>

                {/* Quick Bump Chips */}
                <div className="flex items-center gap-1.5 mt-3 overflow-x-auto scrollbar-hide py-0.5">
                  {[50, 100, 200, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        vibrate(8);
                        const current = parseFloat(amount) || 0;
                        setAmount(String(current + preset));
                      }}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary/80 hover:bg-secondary active:scale-95 transition-all text-muted-foreground hover:text-foreground border border-border/50 shadow-2xs"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Apple Grouped Inset Card: Merchant & Category */}
              <div className="bg-secondary/35 dark:bg-card/40 rounded-2xl border border-border/40 divide-y divide-border/25 overflow-hidden backdrop-blur-sm">
                
                {/* Merchant / Description Row */}
                <div className="flex items-center gap-3 p-3 px-3.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                    <input
                      type="text"
                      placeholder="e.g. Coffee, Groceries, Flight"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground/40 text-foreground pt-0.5"
                    />
                  </div>

                  {/* Camera / Receipt Scan Button */}
                  <label 
                    className="relative overflow-hidden w-9 h-9 rounded-xl border border-border/60 hover:bg-secondary active:scale-95 flex items-center justify-center shrink-0 cursor-pointer transition-all text-muted-foreground hover:text-foreground bg-background/50"
                    title="Scan Receipt"
                  >
                    {isScanning ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                {/* Category Selection Row */}
                <div className="p-3 px-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
                    <span className="text-[11px] font-medium text-primary flex items-center gap-1">
                      {getCategoryEmoji(category, settings.categoryEmojis)} {category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 -mx-1 px-1">
                    {settings.categories.map((c) => {
                      const isSelected = category === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            vibrate(8);
                            setCategory(c);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all border select-none",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs scale-[1.03]"
                              : "bg-background/60 hover:bg-background text-foreground/80 border-border/50"
                          )}
                        >
                          <span className="text-sm leading-none">{getCategoryEmoji(c, settings.categoryEmojis)}</span>
                          <span>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* 3. Apple Grouped Inset Card: Date, Recurrence & Notes */}
              <div className="bg-secondary/35 dark:bg-card/40 rounded-2xl border border-border/40 divide-y divide-border/25 overflow-hidden backdrop-blur-sm">
                
                {/* Date Row */}
                <div className="flex items-center justify-between p-3 px-3.5 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</p>
                      <p className="text-xs font-semibold text-foreground">
                        {formattedDateLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        vibrate(8);
                        setDate(format(new Date(), 'yyyy-MM-dd'));
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                        isTodayDate
                          ? "bg-primary/15 text-primary border-primary/30 font-semibold"
                          : "bg-background/50 hover:bg-background text-muted-foreground border-border/50"
                      )}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        vibrate(8);
                        setDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                        isYesterdayDate
                          ? "bg-primary/15 text-primary border-primary/30 font-semibold"
                          : "bg-background/50 hover:bg-background text-muted-foreground border-border/50"
                      )}
                    >
                      Yesterday
                    </button>
                    <label className="relative px-2 py-1 rounded-lg text-xs font-medium bg-background/50 hover:bg-background border border-border/50 text-muted-foreground cursor-pointer flex items-center gap-1">
                      <span>Custom</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Recurrence Row */}
                <div className="flex items-center justify-between p-3 px-3.5 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Repeat className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Repeat</p>
                    </div>
                  </div>

                  <div className="flex items-center p-0.5 rounded-xl bg-background/60 border border-border/50">
                    {(['none', 'daily', 'weekly', 'monthly'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          vibrate(8);
                          setRecurrence(r);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                          recurrence === r
                            ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Row */}
                <div className="flex items-center gap-3 p-3 px-3.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                    <input
                      type="text"
                      placeholder="Add optional details..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-transparent text-xs font-medium focus:outline-none placeholder:text-muted-foreground/40 text-foreground pt-0.5"
                    />
                  </div>
                </div>

              </div>

              {/* 4. Scanning / Attached Receipt Card */}
              {isScanning && (
                <div className="relative overflow-hidden p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-3 animate-in fade-in">
                  <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary">Scanning Receipt with AI OCR...</p>
                    <p className="text-[10px] text-primary/70">Extracting amount & merchant</p>
                  </div>
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none"
                  />
                </div>
              )}

              {(receiptFile || (expenseToEdit?.receipt_url && !receiptFile)) && !isScanning && (
                <div className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-secondary/35 border border-border/40">
                  <div className="flex items-center gap-2.5 truncate">
                    {expenseToEdit?.receipt_url && !receiptFile ? (
                      <img src={expenseToEdit.receipt_url} alt="Receipt" className="w-8 h-8 rounded-lg object-cover border shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        IMG
                      </div>
                    )}
                    <span className="text-xs font-medium truncate text-foreground">
                      {receiptFile ? receiptFile.name : 'Receipt attached'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptFile(null)}
                    className="w-7 h-7 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors shrink-0"
                    aria-label="Remove receipt"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 5. Primary Save Action Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleSave}
                disabled={!isValid || uploading}
                className={cn(
                  "w-full py-3.5 rounded-2xl font-bold text-sm tracking-tight transition-all shadow-md flex items-center justify-center gap-2 select-none mt-2",
                  isValid && !uploading
                    ? "bg-primary text-primary-foreground shadow-primary/25 hover:opacity-95 active:scale-[0.99] cursor-pointer"
                    : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                )}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <>
                    {expenseToEdit ? 'Save Changes' : 'Add Expense'}
                    {!isNaN(parsedAmount) && parsedAmount > 0 && (
                      <span className="opacity-90">• {settings.currency}{parsedAmount.toLocaleString()}</span>
                    )}
                  </>
                )}
              </motion.button>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useExpenseStore, type Expense } from "../store/useExpenseStore";
import { Input } from "../components/ui/input";
import { Search, Download, Paperclip, Sparkles, Repeat, Receipt, SlidersHorizontal } from "lucide-react";
import { format, parseISO, isThisMonth, subMonths, isAfter, subDays, isSameMonth } from "date-fns";
import { AddExpenseModal } from "../components/AddExpenseModal";
import { SwipeableExpenseItem } from '../components/SwipeableExpenseItem';
import { Button } from "../components/ui/button";
import { ReceiptLightbox } from "../components/ui/ReceiptLightbox";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { vibrate } from "../lib/utils";
import { EmptyState } from "../components/ui/EmptyState";
import { getCategoryStyle } from "../components/ui/CategoryBadge";

type QuickFilter = 'all' | 'receipt' | 'high_spend' | 'recurring';

export default function Expenses() {
  const { expenses, settings, fetchCloudData } = useExpenseStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("this_month");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showAmountFilters, setShowAmountFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [activeReceipt, setActiveReceipt] = useState<{ url: string; title?: string; amount?: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const expenseOrderMap = useMemo(() => {
    return new Map(expenses.map((e, idx) => [e.id, idx]));
  }, [expenses]);

  const filteredExpenses = expenses
    .filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || e.category.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? e.category === selectedCategory : true;
      
      const min = parseFloat(minAmount);
      const max = parseFloat(maxAmount);
      const matchesMin = !isNaN(min) ? e.amount >= min : true;
      const matchesMax = !isNaN(max) ? e.amount <= max : true;
      
      let matchesDate = true;
      const expenseDate = parseISO(e.date);
      if (dateFilter === 'this_month') {
        matchesDate = isThisMonth(expenseDate);
      } else if (dateFilter === 'last_month') {
        matchesDate = isSameMonth(expenseDate, subMonths(new Date(), 1));
      } else if (dateFilter === 'last_7_days') {
        matchesDate = isAfter(expenseDate, subDays(new Date(), 7));
      }

      let matchesQuick = true;
      if (quickFilter === 'receipt') {
        matchesQuick = !!e.receipt_url;
      } else if (quickFilter === 'high_spend') {
        matchesQuick = e.amount >= 1000;
      } else if (quickFilter === 'recurring') {
        matchesQuick = !!((e as any).is_recurring || e.category === 'Bills' || (e.notes && e.notes.toLowerCase().includes('sub')));
      }

      return matchesSearch && matchesCategory && matchesDate && matchesMin && matchesMax && matchesQuick;
    })
    .sort((a, b) => {
      const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      // Tie-breaker: if dates are identical, show the one added later on top
      return (expenseOrderMap.get(b.id) ?? 0) - (expenseOrderMap.get(a.id) ?? 0);
    });

  // Group by date
  const grouped = filteredExpenses.reduce((acc, expense) => {
    const dateStr = format(parseISO(expense.date), 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(expense);
    return acc;
  }, {} as Record<string, typeof expenses>);

  const handleEdit = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setExpenseToEdit(null), 300);
  };

  const handleCsvExport = () => {
    if (!filteredExpenses.length) return;
    const headers = ["Date", "Description", "Category", "Amount", "Notes"];
    const rows = filteredExpenses.map(e => [
      e.date.split("T")[0],
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.amount.toString(),
      `"${(e.notes || "").replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-tracker-filtered-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Page Header - Scrolls away naturally */}
      <div className="flex justify-between items-center pt-1 pb-1">
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <Button variant="outline" size="sm" onClick={handleCsvExport} className="gap-2 rounded-full">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Sticky Frosted Glass Filter Bar - Stays pinned at top: 0 */}
      <div className="sticky top-0 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-2.5 bg-background/90 dark:bg-background/85 backdrop-blur-2xl border-b border-border/40 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-2.5 transition-all">
        {/* Row 1: Search + Date Filter + Amount Filter Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
              className="pl-9 bg-card/90 rounded-xl h-10 border-border/60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="flex h-10 w-[115px] rounded-xl border border-input bg-card/90 px-2.5 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_7_days">Last 7 Days</option>
          </select>
          <Button
            type="button"
            variant={showAmountFilters || minAmount || maxAmount ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={() => {
              vibrate(10);
              setShowAmountFilters(!showAmountFilters);
            }}
            title="Filter by amount"
            aria-label="Filter by amount"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Collapsible Amount Filter Inputs */}
        {(showAmountFilters || minAmount || maxAmount) && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <Input 
              type="number" 
              placeholder="Min Amount" 
              className="h-8 text-xs bg-card/90 rounded-lg" 
              value={minAmount} 
              onChange={(e) => setMinAmount(e.target.value)} 
            />
            <Input 
              type="number" 
              placeholder="Max Amount" 
              className="h-8 text-xs bg-card/90 rounded-lg" 
              value={maxAmount} 
              onChange={(e) => setMaxAmount(e.target.value)} 
            />
          </div>
        )}

        {/* Row 2: Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <Button
            variant={selectedCategory === null ? "default" : "secondary"}
            size="sm"
            className="rounded-full shrink-0 h-7 text-xs px-3"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {settings.categories.map(cat => {
            const count = expenses.filter(e => e.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            const isSelected = selectedCategory === cat;
            const style = getCategoryStyle(cat);
            return (
              <button
                key={cat}
                type="button"
                className={`h-7 px-3 text-xs rounded-full font-medium shrink-0 transition-all flex items-center gap-1.5 border select-none ${
                  isSelected
                    ? `${style.bg} ${style.text} ${style.border} shadow-xs font-semibold ring-1 ring-primary/30`
                    : 'bg-secondary/60 text-muted-foreground border-transparent hover:text-foreground'
                }`}
                onClick={() => setSelectedCategory(isSelected ? null : cat)}
              >
                <span>{style.emoji}</span>
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide text-xs">
          <button
            type="button"
            onClick={() => { vibrate(10); setQuickFilter('all'); }}
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              quickFilter === 'all' 
                ? 'bg-primary text-primary-foreground shadow-xs' 
                : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => { vibrate(10); setQuickFilter('receipt'); }}
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              quickFilter === 'receipt' 
                ? 'bg-primary text-primary-foreground shadow-xs' 
                : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            Has Receipt
          </button>
          <button
            type="button"
            onClick={() => { vibrate(10); setQuickFilter('high_spend'); }}
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              quickFilter === 'high_spend' 
                ? 'bg-primary text-primary-foreground shadow-xs' 
                : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            High Spend &gt;₹1k
          </button>
          <button
            type="button"
            onClick={() => { vibrate(10); setQuickFilter('recurring'); }}
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0 ${
              quickFilter === 'recurring' 
                ? 'bg-primary text-primary-foreground shadow-xs' 
                : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            Recurring
          </button>
        </div>
      </div>

      <PullToRefresh onRefresh={fetchCloudData}>
        <div className="space-y-6 pb-24">
          {Object.entries(grouped).length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title={expenses.length === 0 ? "No expenses logged yet" : "No matching expenses"}
              description={expenses.length === 0 
                ? "Your slate is clean for this month. Tap below to log your first expense."
                : "No transactions matched your filters. Try adjusting your search or category."
              }
              actionLabel={expenses.length === 0 ? "+ Log First Expense" : "Reset Filters"}
              onAction={expenses.length === 0 ? () => setIsModalOpen(true) : () => {
                setSearchTerm("");
                setSelectedCategory(null);
                setDateFilter("this_month");
                setMinAmount("");
                setMaxAmount("");
                setQuickFilter("all");
              }}
            />
          ) : (
            Object.entries(grouped).map(([dateStr, dayExpenses]) => (
              <div key={dateStr}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 mt-4">
                  {format(parseISO(dateStr), 'EEEE, MMMM d')}
                </h3>
                <div className="space-y-3">
                  {dayExpenses.map(expense => {
                    const isIncome = expense.category === 'Income';
                    return (
                      <SwipeableExpenseItem 
                        key={expense.id} 
                        expense={expense} 
                        isIncome={isIncome} 
                        onEdit={handleEdit}
                        onViewReceipt={(url, title, amount) => setActiveReceipt({ url, title, amount })}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </PullToRefresh>

      <AddExpenseModal isOpen={isModalOpen} onClose={handleCloseModal} expenseToEdit={expenseToEdit} />

      <ReceiptLightbox
        imageUrl={activeReceipt?.url || null}
        title={activeReceipt?.title}
        amount={activeReceipt?.amount}
        currency={settings.currency}
        onClose={() => setActiveReceipt(null)}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useExpenseStore, type Expense } from "../store/useExpenseStore";
import { Input } from "../components/ui/input";
import { Search, Download } from "lucide-react";
import { format, parseISO, isThisMonth, subMonths, isAfter, subDays, isSameMonth } from "date-fns";
import { AddExpenseModal } from "../components/AddExpenseModal";
import { SwipeableExpenseItem } from '../components/SwipeableExpenseItem';
import { Button } from "../components/ui/button";

export default function Expenses() {
  const { expenses, settings } = useExpenseStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("this_month");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

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

      return matchesSearch && matchesCategory && matchesDate && matchesMin && matchesMax;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <Button variant="outline" size="sm" onClick={handleCsvExport} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
              className="pl-9 bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="flex h-10 w-[120px] rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_7_days">Last 7 Days</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <Input 
            type="number" 
            placeholder="Min Amount" 
            className="h-10 text-sm bg-card" 
            value={minAmount} 
            onChange={(e) => setMinAmount(e.target.value)} 
          />
          <Input 
            type="number" 
            placeholder="Max Amount" 
            className="h-10 text-sm bg-card" 
            value={maxAmount} 
            onChange={(e) => setMaxAmount(e.target.value)} 
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <Button
            variant={selectedCategory === null ? "default" : "secondary"}
            size="sm"
            className="rounded-full shrink-0"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {settings.categories.map(cat => {
            // Only show category if it has expenses, or we could just show all
            const count = expenses.filter(e => e.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "secondary"}
                size="sm"
                className="rounded-full shrink-0"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            );
          })}
        </div>
      </header>

      <div className="space-y-6 pb-24">
        {Object.entries(grouped).length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-xl shadow-sm flex flex-col items-center mt-4">
            <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
            </div>
            <p className="text-foreground text-base font-semibold">No expenses found</p>
            <p className="text-sm text-muted-foreground mt-2 mb-6 max-w-[250px]">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateStr, dayExpenses]) => (
            <div key={dateStr}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
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
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <AddExpenseModal isOpen={isModalOpen} onClose={handleCloseModal} expenseToEdit={expenseToEdit} />
    </div>
  );
}

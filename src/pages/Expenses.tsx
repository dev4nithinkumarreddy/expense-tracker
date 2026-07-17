import { useState } from "react";
import { useExpenseStore, type Expense } from "../store/useExpenseStore";
import { Input } from "../components/ui/input";
import { Search, Plus, Trash2, Pencil, ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { AddExpenseModal } from "../components/AddExpenseModal";
import { Button } from "../components/ui/button";

export default function Expenses() {
  const { expenses, settings, deleteExpense } = useExpenseStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const filteredExpenses = expenses
    .filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? e.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
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

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search expenses..." 
            className="pl-9 bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <p className="text-center text-muted-foreground py-8">No expenses found.</p>
        ) : (
          Object.entries(grouped).map(([dateStr, dayExpenses]) => (
            <div key={dateStr}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                {format(parseISO(dateStr), 'EEEE, MMMM d')}
              </h3>
              <div className="space-y-3">
                {dayExpenses.map(expense => (
                  <div key={expense.id} className="flex justify-between items-center p-3 bg-card border rounded-xl shadow-sm group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                        {expense.category.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm leading-none truncate">{expense.description}</p>
                          {expense.receipt_url && (
                            <a href={expense.receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:opacity-80 shrink-0">
                              <ImageIcon className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {expense.category} {expense.notes && `• ${expense.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-3 pl-2">
                      <span className="font-semibold text-sm whitespace-nowrap">
                        {settings.currency}{expense.amount.toLocaleString()}
                      </span>
                      <div className="flex md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteExpense(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-28 right-4 sm:right-auto sm:left-1/2 sm:ml-[160px] w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddExpenseModal isOpen={isModalOpen} onClose={handleCloseModal} expenseToEdit={expenseToEdit} />
    </div>
  );
}

import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { formatCurrency } from '../lib/formatCurrency';
import { useExpenseStore, type Expense } from '../store/useExpenseStore';

interface SwipeableExpenseItemProps {
  expense: Expense;
  isIncome: boolean;
  onEdit: (expense: Expense) => void;
}

export function SwipeableExpenseItem({ expense, isIncome, onEdit }: SwipeableExpenseItemProps) {
  const { settings, deleteExpense } = useExpenseStore();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine actions based on swipe distance
  const threshold = 80;
  
  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Only allow horizontal swipes
      if (Math.abs(eventData.deltaX) > Math.abs(eventData.deltaY)) {
        // limit swipe visually
        const newOffset = Math.max(-120, Math.min(120, eventData.deltaX));
        setSwipeOffset(newOffset);
      }
    },
    onSwiped: (eventData) => {
      if (eventData.deltaX < -threshold) {
        // Swiped left - Delete
        setIsDeleting(true);
        setTimeout(() => deleteExpense(expense.id), 300); // Wait for animation
      } else if (eventData.deltaX > threshold) {
        // Swiped right - Edit
        onEdit(expense);
        setSwipeOffset(0);
      } else {
        // Not far enough, spring back
        setSwipeOffset(0);
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  if (isDeleting) {
    return (
      <motion.div 
        initial={{ opacity: 1, height: 'auto' }}
        animate={{ opacity: 0, height: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      />
    );
  }

  // Background colors based on swipe direction
  const bgClass = swipeOffset < 0 
    ? "bg-destructive/10 text-destructive" 
    : swipeOffset > 0 
      ? "bg-primary/10 text-primary" 
      : "bg-card";

  return (
    <div className={cn("relative overflow-hidden rounded-xl border shadow-sm", bgClass)}>
      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between px-6 font-medium">
        <div className="flex items-center gap-2 opacity-0 transition-opacity" style={{ opacity: swipeOffset > 30 ? 1 : 0 }}>
          <Pencil className="w-5 h-5" />
          <span>Edit</span>
        </div>
        <div className="flex items-center gap-2 opacity-0 transition-opacity" style={{ opacity: swipeOffset < -30 ? 1 : 0 }}>
          <span>Delete</span>
          <Trash2 className="w-5 h-5" />
        </div>
      </div>

      {/* Foreground Draggable Item */}
      <motion.div
        {...handlers}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          "relative flex justify-between items-center p-3 bg-card h-full w-full touch-pan-y",
          isIncome && "border-green-500/30 bg-green-500/5"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0", isIncome ? "bg-green-500/20 text-green-600 font-bold" : "bg-primary/10 text-primary/70 font-semibold")}>
            {isIncome ? "$" : (settings.categoryEmojis?.[expense.category] || expense.category.substring(0, 2).toUpperCase())}
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm leading-none truncate">{expense.description}</p>
              {expense.receipt_url && (
                <a href={expense.receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:opacity-80 shrink-0" onClick={(e) => e.stopPropagation()}>
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
          <span className={cn("font-semibold text-sm whitespace-nowrap", isIncome ? "text-green-600" : "")}>
            {isIncome ? "+" : ""}{formatCurrency(expense.amount, settings.currency)}
          </span>
          {/* Desktop Hover Actions */}
          <div className="hidden md:flex opacity-0 md:hover:opacity-100 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-primary focus-visible:ring-1"
              onClick={() => onEdit(expense)}
              aria-label={`Edit ${expense.description}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:bg-destructive/10 focus-visible:ring-1"
              onClick={() => deleteExpense(expense.id)}
              aria-label={`Delete ${expense.description}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


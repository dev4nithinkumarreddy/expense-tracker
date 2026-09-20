import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Pencil, Trash2, Image as ImageIcon, CopyPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn, vibrate } from '../lib/utils';
import { formatCurrency } from '../lib/formatCurrency';
import { useExpenseStore, type Expense } from '../store/useExpenseStore';
import { playDeleteSound, playSuccessSound } from '../lib/sound';
import { toast } from 'sonner';
import { CategoryBadge } from './ui/CategoryBadge';

interface SwipeableExpenseItemProps {
  expense: Expense;
  isIncome: boolean;
  onEdit: (expense: Expense) => void;
  onViewReceipt?: (url: string, description?: string, amount?: number) => void;
}

export function SwipeableExpenseItem({ expense, isIncome, onEdit, onViewReceipt }: SwipeableExpenseItemProps) {
  const { settings, addExpense, deleteExpense } = useExpenseStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const hasHapticFired = useRef(false);

  const handleLogAgain = async (e: React.MouseEvent) => {
    e.stopPropagation();
    vibrate(20);
    if (settings.soundEnabled) playSuccessSound();

    const newId = await addExpense({
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      date: new Date().toISOString(),
      notes: expense.notes
    });

    toast.success(`Logged ${expense.description} (${formatCurrency(expense.amount, settings.currency)}) for today`, {
      action: {
        label: "Undo",
        onClick: () => {
          vibrate(15);
          deleteExpense(newId);
          toast.info(`Undone: ${expense.description} removed`);
        }
      }
    });
  };

  const x = useMotionValue(0);

  // Smooth continuous opacity and scale for action indicators without React re-renders
  const editOpacity = useTransform(x, [20, 80], [0, 1]);
  const editScale = useTransform(x, [20, 80], [0.85, 1.05]);
  const deleteOpacity = useTransform(x, [-25, -110], [0, 1]);
  const deleteScale = useTransform(x, [-25, -110], [0.85, 1.1]);

  const handleDrag = () => {
    const currentX = x.get();
    // Fire tactile haptic when crossing the deliberate action commit detents
    if ((currentX <= -120 || currentX >= 80) && !hasHapticFired.current) {
      vibrate(15);
      hasHapticFired.current = true;
    } else if (Math.abs(currentX) < 40) {
      hasHapticFired.current = false;
    }
  };

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    hasHapticFired.current = false;
    const { offset, velocity } = info;

    // Calibrated Left Swipe = Delete
    // Requires deliberate physical pull past 120px, OR a strong flick past 85px with velocity <= -500px/s.
    // Anything smaller (e.g. casual scroll or small drag) safely springs back to center.
    const isDeliberateDelete = offset.x <= -120 || (offset.x <= -85 && velocity.x <= -500);

    // Right swipe = Edit (requires offset >= 80px or strong flick past 60px)
    const isDeliberateEdit = offset.x >= 80 || (offset.x >= 60 && velocity.x >= 500);

    if (isDeliberateDelete) {
      setIsDeleting(true);
      vibrate(25);
      if (settings.soundEnabled) playDeleteSound();
      setTimeout(() => deleteExpense(expense.id), 250);
    } else if (isDeliberateEdit) {
      vibrate(20);
      onEdit(expense);
    }
  };

  if (isDeleting) {
    return (
      <motion.div 
        initial={{ opacity: 1, height: 'auto', marginBottom: 12 }}
        animate={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
        className="overflow-hidden"
      />
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="relative overflow-hidden rounded-2xl border border-border/70 shadow-sm bg-card select-none"
    >
      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between px-5 font-medium">
        <motion.div 
          style={{ opacity: editOpacity, scale: editScale }} 
          className="flex items-center gap-2 text-primary font-semibold text-sm"
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <Pencil className="w-4 h-4 text-primary" />
          </div>
          <span>Edit</span>
        </motion.div>

        <motion.div 
          style={{ opacity: deleteOpacity, scale: deleteScale }} 
          className="flex items-center gap-2 text-destructive font-semibold text-sm"
        >
          <span>Delete</span>
          <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-destructive" />
          </div>
        </motion.div>
      </div>

      {/* Foreground Draggable Item */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -160, right: 100 }}
        dragElastic={0.55} // Apple rubberband resistance constant c=0.55
        dragTransition={{ bounceStiffness: 400, bounceDamping: 35 }}
        style={{ x }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative flex justify-between items-center p-3.5 bg-card/95 backdrop-blur-md h-full w-full touch-pan-y cursor-grab active:cursor-grabbing",
          isIncome && "border-green-500/30 bg-green-500/5"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center text-sm shrink-0 shadow-xs", 
            isIncome ? "bg-green-500/15 text-green-600 font-bold" : "bg-primary/10 text-primary font-semibold"
          )}>
            {isIncome ? "$" : (settings.categoryEmojis?.[expense.category] || expense.category.substring(0, 2).toUpperCase())}
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm leading-tight truncate">{expense.description}</p>
              {expense.receipt_url && (
                onViewReceipt ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewReceipt(expense.receipt_url!, expense.description, expense.amount);
                    }}
                    className="text-primary hover:opacity-80 p-0.5 shrink-0 transition-opacity"
                    aria-label="View receipt"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <a 
                    href={expense.receipt_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-primary hover:opacity-80 shrink-0" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ImageIcon className="w-4 h-4" />
                  </a>
                )
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <CategoryBadge category={expense.category} size="xs" />
              {expense.notes && (
                <span className="text-xs text-muted-foreground truncate">
                  • {expense.notes}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 pl-2 shrink-0">
          {!isIncome && (
            <button
              type="button"
              onClick={handleLogAgain}
              className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-90 transition-all select-none"
              title="Log again for today"
              aria-label={`Log ${expense.description} again for today`}
            >
              <CopyPlus className="w-3.5 h-3.5" />
            </button>
          )}

          <span className={cn(
            "font-semibold text-sm whitespace-nowrap display-number", 
            isIncome ? "text-green-600" : ""
          )}>
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
    </motion.div>
  );
}


import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Trash2, Clock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { EmptyState } from './ui/EmptyState';
import { CategoryBadge } from './ui/CategoryBadge';
import { formatCurrency } from '../lib/formatCurrency';
import { vibrate } from '../lib/utils';
import { useExpenseStore, type DeletedExpense } from '../store/useExpenseStore';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { playTapSound, playSuccessSound, playDeleteSound } from '../lib/sound';

interface RecentlyDeletedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecentlyDeletedModal({ isOpen, onClose }: RecentlyDeletedModalProps) {
  const { recentlyDeleted = [], restoreExpense, permanentlyDeleteExpense, clearRecentlyDeleted, settings } = useExpenseStore();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleRestore = async (id: string) => {
    vibrate(20);
    if (settings.soundEnabled) playSuccessSound();
    await restoreExpense(id);
  };

  const handleDeletePermanently = async (id: string) => {
    vibrate(25);
    if (settings.soundEnabled) playDeleteSound();
    await permanentlyDeleteExpense(id);
  };

  const handleClearAll = async () => {
    vibrate(30);
    if (settings.soundEnabled) playDeleteSound();
    await clearRecentlyDeleted();
    setShowConfirmClear(false);
  };

  const formatDeletedDate = (isoString: string) => {
    try {
      return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal / Sheet Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-lg bg-card/95 backdrop-blur-2xl border-t sm:border border-border/80 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight">Recently Deleted</h2>
                  {recentlyDeleted.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                      {recentlyDeleted.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Safely recover expenses deleted accidentally
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {recentlyDeleted.length > 0 && (
                showConfirmClear ? (
                  <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs px-2.5 rounded-xl font-medium"
                      onClick={handleClearAll}
                    >
                      Confirm Clear
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-2 rounded-xl"
                      onClick={() => setShowConfirmClear(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-destructive rounded-xl"
                    onClick={() => {
                      vibrate(10);
                      if (settings.soundEnabled) playTapSound();
                      setShowConfirmClear(true);
                    }}
                  >
                    Empty Trash
                  </Button>
                )
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  vibrate(10);
                  if (settings.soundEnabled) playTapSound();
                  onClose();
                }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Subtitle Banner for mobile */}
          <div className="px-4 py-2 bg-muted/40 border-b border-border/30 flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Items are preserved here so you can undo or restore anytime.</span>
          </div>

          {/* List or Empty State */}
          <div className="p-4 overflow-y-auto space-y-2.5 flex-1 min-h-[220px]">
            {recentlyDeleted.length === 0 ? (
              <EmptyState
                icon={<Trash2 className="w-8 h-8 text-muted-foreground/60" />}
                title="Trash is Empty"
                description="Any expenses you delete will appear here, giving you peace of mind to recover them anytime."
                compact
                className="my-2 py-8 bg-card/40 border-dashed"
              />
            ) : (
              recentlyDeleted.map((item: DeletedExpense) => (
                <motion.div
                  key={item.expense.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="p-3 rounded-2xl border border-border/70 bg-card/80 hover:bg-card transition-colors flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {settings.categoryEmojis?.[item.expense.category] || item.expense.category.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">
                        {item.expense.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <CategoryBadge category={item.expense.category} size="xs" />
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3 inline" />
                          {formatDeletedDate(item.deletedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-sm display-number text-foreground/90">
                      {formatCurrency(item.expense.amount, settings.currency)}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 rounded-xl gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                      onClick={() => handleRestore(item.expense.id)}
                      title="Restore expense"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Restore</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeletePermanently(item.expense.id)}
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore } from '../../store/useExpenseStore';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import { playTapSound, playSuccessSound } from '../../lib/sound';
import { X, Share2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { isThisMonth, parseISO, subDays } from 'date-fns';

interface StoryWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  period?: 'month' | 'week';
}

export function StoryWrappedModal({ isOpen, onClose, period = 'month' }: StoryWrappedModalProps) {
  const { expenses, settings } = useExpenseStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter expenses for current month (or past 7 days)
  const relevantExpenses = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      const sevenDaysAgo = subDays(now, 7);
      return expenses.filter((e) => {
        const d = parseISO(e.date);
        return d >= sevenDaysAgo && e.category !== 'Income' && e.category !== 'Transfer';
      });
    }
    return expenses.filter(
      (e) => isThisMonth(parseISO(e.date)) && e.category !== 'Income' && e.category !== 'Transfer'
    );
  }, [expenses, period]);

  const totalSpent = useMemo(() => {
    return relevantExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [relevantExpenses]);

  const topExpense = useMemo(() => {
    if (relevantExpenses.length === 0) return null;
    return [...relevantExpenses].sort((a, b) => b.amount - a.amount)[0];
  }, [relevantExpenses]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    relevantExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [relevantExpenses]);

  const topCategory = categoryBreakdown[0] || null;

  // Determine personality archetype
  const personality = useMemo(() => {
    if (relevantExpenses.length === 0) {
      return {
        title: 'The Clean Slate',
        emoji: '🧘',
        description: 'Peaceful, disciplined, and zero unnecessary expenses logged.',
        color: 'from-emerald-600 to-teal-800',
      };
    }
    const topCatName = topCategory ? topCategory[0].toLowerCase() : '';
    if (topCatName.includes('food') || topCatName.includes('dining')) {
      return {
        title: 'The Gourmet Explorer',
        emoji: '🍽️',
        description: 'Life is too short for boring meals. Food was your biggest joy!',
        color: 'from-amber-600 to-rose-700',
      };
    }
    if (topCatName.includes('travel') || topCatName.includes('fuel')) {
      return {
        title: 'The Wanderer',
        emoji: '✈️',
        description: 'Always on the move, chasing new horizons and spontaneous rides.',
        color: 'from-blue-600 to-indigo-800',
      };
    }
    if (topCatName.includes('shopping')) {
      return {
        title: 'The Taste Curator',
        emoji: '🛍️',
        description: 'Investing in lifestyle, essentials, and great finds.',
        color: 'from-purple-600 to-pink-700',
      };
    }
    if (totalSpent < (settings.monthlyIncome || 0) * 0.5) {
      return {
        title: 'The Financial Monk',
        emoji: '💎',
        description: 'Elite self-control. You saved more than 50% of your earnings!',
        color: 'from-emerald-700 to-cyan-800',
      };
    }
    return {
      title: 'The Balanced Navigator',
      emoji: '⚖️',
      description: 'Navigating life expenses with poise and thoughtful budgeting.',
      color: 'from-indigo-600 to-purple-800',
    };
  }, [relevantExpenses, topCategory, totalSpent, settings.monthlyIncome]);

  const TOTAL_SLIDES = 4;

  // Story Auto-Advance
  useEffect(() => {
    if (!isOpen || isPaused) return;

    progressTimerRef.current = setTimeout(() => {
      if (currentSlide < TOTAL_SLIDES - 1) {
        setCurrentSlide((prev) => prev + 1);
        vibrate(8);
      } else {
        // Last slide reached
      }
    }, 5500);

    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [isOpen, currentSlide, isPaused]);

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      vibrate(15);
      playSuccessSound();
    }
  }, [isOpen]);

  const handleNext = () => {
    vibrate(8);
    playTapSound();
    if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    vibrate(8);
    playTapSound();
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleShare = async () => {
    vibrate(12);
    const text = `🎉 My ${period === 'month' ? 'Monthly' : 'Weekly'} Financial Wrapped:\n💸 Total Spend: ${formatCurrency(totalSpent, settings.currency)}\n🏆 Top Category: ${topCategory ? topCategory[0] : 'None'}\n✨ Personality: ${personality.title} ${personality.emoji}\nTracked with precision via Expense Tracker!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Financial Wrapped', text });
        toast.success('Shared successfully!');
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Wrapped summary copied to clipboard!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl select-none">
      {/* Story Container */}
      <div 
        className="relative w-full max-w-sm h-full max-h-[780px] sm:rounded-3xl overflow-hidden flex flex-col justify-between text-white shadow-2xl bg-black border border-white/10"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress Bar Bars at Top */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => {
            const isCompleted = idx < currentSlide;
            const isCurrent = idx === currentSlide;
            return (
              <div key={idx} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                {isCompleted ? (
                  <div className="h-full bg-white w-full" />
                ) : isCurrent ? (
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: isPaused ? '0%' : '100%' }}
                    transition={{ duration: 5.5, ease: 'linear' }}
                    className="h-full bg-white"
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Top Controls */}
        <div className="absolute top-7 left-4 right-4 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full">
              {period === 'month' ? 'Month in Review' : 'Weekly Story'}
            </span>
          </div>

          <button
            onClick={() => {
              vibrate(10);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slide Content */}
        <div className="flex-1 flex flex-col justify-center px-6 relative z-20">
          <AnimatePresence mode="wait">
            {currentSlide === 0 && (
              <motion.div
                key="slide-0"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="space-y-4 text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary to-purple-500 mx-auto flex items-center justify-center text-4xl shadow-2xl shadow-primary/40 animate-bounce">
                  ✨
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Your Financial Story</h2>
                  <p className="text-sm text-white/70 mt-1">Here is how you managed your money</p>
                </div>
                <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15">
                  <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
                    Total Outflow
                  </p>
                  <p className="text-3xl font-black mt-1 text-white">
                    {formatCurrency(totalSpent, settings.currency)}
                  </p>
                  <p className="text-xs text-white/60 mt-2">
                    Across {relevantExpenses.length} transactions
                  </p>
                </div>
              </motion.div>
            )}

            {currentSlide === 1 && (
              <motion.div
                key="slide-1"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="space-y-4 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 mx-auto flex items-center justify-center text-3xl">
                  🏆
                </div>
                <div>
                  <h3 className="text-xl font-bold">Category Champion</h3>
                  <p className="text-xs text-white/70 mt-0.5">Where your money flowed the most</p>
                </div>

                {topCategory ? (
                  <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 space-y-2">
                    <p className="text-2xl font-black text-amber-300">{topCategory[0]}</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(topCategory[1], settings.currency)}
                    </p>
                    <p className="text-xs text-white/70">
                      {Math.round((topCategory[1] / Math.max(totalSpent, 1)) * 100)}% of your total spend
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white/10 text-xs text-white/70">
                    No category data yet!
                  </div>
                )}
              </motion.div>
            )}

            {currentSlide === 2 && (
              <motion.div
                key="slide-2"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="space-y-4 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-300 mx-auto flex items-center justify-center text-3xl">
                  ⚡
                </div>
                <div>
                  <h3 className="text-xl font-bold">The Peak Moment</h3>
                  <p className="text-xs text-white/70 mt-0.5">Your single largest purchase</p>
                </div>

                {topExpense ? (
                  <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 space-y-1.5">
                    <p className="text-lg font-bold truncate">{topExpense.description}</p>
                    <p className="text-2xl font-black text-rose-300">
                      {formatCurrency(topExpense.amount, settings.currency)}
                    </p>
                    <span className="inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/80">
                      {topExpense.category}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white/10 text-xs text-white/70">
                    No expenses recorded in this period!
                  </div>
                )}
              </motion.div>
            )}

            {currentSlide === 3 && (
              <motion.div
                key="slide-3"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="space-y-4 text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-white/15 mx-auto flex items-center justify-center text-4xl shadow-xl">
                  {personality.emoji}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
                    Your Financial Persona
                  </p>
                  <h2 className="text-2xl font-black tracking-tight mt-1 text-white">
                    {personality.title}
                  </h2>
                  <p className="text-xs text-white/80 mt-2 max-w-[260px] mx-auto leading-relaxed">
                    {personality.description}
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleShare}
                    className="w-full rounded-2xl bg-white text-black hover:bg-white/90 font-bold gap-2 shadow-xl"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Wrapped
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tap navigation hot-spots */}
        <div className="absolute inset-0 z-10 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
          <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
        </div>

        {/* Bottom Nav Hint */}
        <div className="p-4 pb-6 relative z-20 flex items-center justify-between text-xs text-white/50 px-6">
          <span className="text-[11px]">Tap left / right to navigate</span>
          <span className="text-[11px] font-semibold">{currentSlide + 1} of {TOTAL_SLIDES}</span>
        </div>
      </div>
    </div>
  );
}

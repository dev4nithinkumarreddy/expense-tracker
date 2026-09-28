import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore } from '../../store/useExpenseStore';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import { playTapSound, playSuccessSound } from '../../lib/sound';
import { X, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { isThisMonth, parseISO, subDays } from 'date-fns';

interface StoryWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  period?: 'month' | 'week';
}

const slideVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 60 : -60,
    scale: 0.96,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 420,
      damping: 32,
      mass: 0.8,
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -60 : 60,
    scale: 0.96,
    transition: {
      duration: 0.16,
      ease: 'easeOut' as const,
    },
  }),
};

export function StoryWrappedModal({ isOpen, onClose, period = 'month' }: StoryWrappedModalProps) {
  const { expenses, settings } = useExpenseStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [slideResetKey, setSlideResetKey] = useState(0);

  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setDirection(1);
      setIsPaused(false);
      setSlideResetKey((k) => k + 1);
      vibrate(15);
      playSuccessSound();
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    vibrate(10);
    playTapSound();
    if (currentSlide < TOTAL_SLIDES - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
      if (currentSlide + 1 === TOTAL_SLIDES - 1) {
        setTimeout(() => playSuccessSound(), 200);
      }
    } else {
      onClose();
    }
  }, [currentSlide, onClose]);

  const handlePrev = useCallback(() => {
    vibrate(10);
    playTapSound();
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    } else {
      // Restart slide 0
      setSlideResetKey((k) => k + 1);
    }
  }, [currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Pointer interactions (Touch & Click)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If interacting with a button or link, let the button handle it
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };

    // Hold threshold: 180ms to pause story
    holdTimerRef.current = setTimeout(() => {
      setIsPaused(true);
      vibrate(6);
    }, 180);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    if (!start) {
      setIsPaused(false);
      return;
    }

    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;
    const elapsed = Date.now() - start.time;

    setIsPaused(false);

    // Swipe down to dismiss
    if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX) * 1.4) {
      vibrate(10);
      onClose();
      return;
    }

    // Horizontal swipe gesture
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
      return;
    }

    // If held longer than 180ms, it was a hold/pause — do not navigate
    if (elapsed >= 180) {
      return;
    }

    // Quick tap detected: check tap zone
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    // Left 35% -> previous; Right 65% -> next (Instagram style)
    if (clickX < width * 0.35) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handlePointerCancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    pointerStartRef.current = null;
    setIsPaused(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-2xl select-none p-0 sm:p-4 animate-in fade-in duration-200">
      <style>{`
        @keyframes storyFill {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-story-fill {
          animation: storyFill 5.5s linear forwards;
        }
      `}</style>

      {/* Outer Wrapper for positioning desktop chevrons */}
      <div className="relative w-full max-w-sm h-full max-h-[820px] sm:h-[760px] flex items-center justify-center">
        {/* Desktop Left Chevron */}
        {currentSlide > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="hidden sm:flex absolute -left-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 border border-white/15 backdrop-blur-md text-white items-center justify-center cursor-pointer transition-all shadow-lg z-30"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Desktop Right Chevron */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="hidden sm:flex absolute -right-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 border border-white/15 backdrop-blur-md text-white items-center justify-center cursor-pointer transition-all shadow-lg z-30"
          aria-label="Next story"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Story Container */}
        <div
          className="relative w-full h-full sm:rounded-3xl overflow-hidden flex flex-col justify-between text-white shadow-2xl bg-black border border-white/10 cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* Progress Bar Bars at Top */}
          <div className="absolute top-3.5 left-3.5 right-3.5 z-40 flex items-center gap-1.5 pointer-events-none">
            {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => {
              const isCompleted = idx < currentSlide;
              const isCurrent = idx === currentSlide;
              return (
                <div key={idx} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                  {isCompleted ? (
                    <div className="h-full bg-white w-full rounded-full" />
                  ) : isCurrent ? (
                    <div
                      key={`bar-${currentSlide}-${slideResetKey}`}
                      className="h-full bg-white rounded-full animate-story-fill"
                      style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
                      onAnimationEnd={() => {
                        if (!isPaused) handleNext();
                      }}
                    />
                  ) : (
                    <div className="h-full bg-transparent w-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Top Controls */}
          <div className="absolute top-7 left-4 right-4 z-40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full shadow-2xs">
                {period === 'month' ? 'Month in Review' : 'Weekly Story'}
              </span>
              {isPaused && (
                <span className="text-[10px] font-semibold bg-white/15 px-2 py-0.5 rounded-full text-white/80 animate-pulse">
                  Paused
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                vibrate(10);
                onClose();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-90 transition-transform border border-white/10"
              aria-label="Close story"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Slide Content */}
          <div className="flex-1 flex flex-col justify-center px-6 relative z-20 pointer-events-none">
            <AnimatePresence custom={direction} mode="wait">
              {currentSlide === 0 && (
                <motion.div
                  key="slide-0"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 text-center pointer-events-none"
                >
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary to-purple-500 mx-auto flex items-center justify-center text-4xl shadow-2xl shadow-primary/40 animate-bounce">
                    ✨
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Your Financial Story</h2>
                    <p className="text-sm text-white/70 mt-1">Here is how you managed your money</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-inner">
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
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 text-center pointer-events-none"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 mx-auto flex items-center justify-center text-3xl shadow-lg">
                    🏆
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Category Champion</h3>
                    <p className="text-xs text-white/70 mt-0.5">Where your money flowed the most</p>
                  </div>

                  {topCategory ? (
                    <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 space-y-2 shadow-inner">
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
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 text-center pointer-events-none"
                >
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-300 mx-auto flex items-center justify-center text-3xl shadow-lg">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">The Peak Moment</h3>
                    <p className="text-xs text-white/70 mt-0.5">Your single largest purchase</p>
                  </div>

                  {topExpense ? (
                    <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 space-y-1.5 shadow-inner">
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
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 text-center pointer-events-auto"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-full rounded-2xl bg-white text-black hover:bg-white/90 font-bold gap-2 shadow-xl cursor-pointer active:scale-95 transition-transform"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Wrapped
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Nav Hint */}
          <div className="p-4 pb-6 relative z-20 flex items-center justify-between text-xs text-white/50 px-6 pointer-events-none">
            <span className="text-[11px]">Tap right to advance • Tap left to go back</span>
            <span className="text-[11px] font-semibold">{currentSlide + 1} of {TOTAL_SLIDES}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

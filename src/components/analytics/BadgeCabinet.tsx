import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore } from '../../store/useExpenseStore';
import { calculateBadges, type Badge } from '../../lib/badges';
import { Award, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { vibrate } from '../../lib/utils';
import { playTapSound } from '../../lib/sound';

export function BadgeCabinet() {
  const { expenses, settings, debts = [] } = useExpenseStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeBadge, setActiveBadge] = useState<Badge | null>(null);

  const badges = useMemo(() => {
    return calculateBadges({
      expenses,
      settings,
      debts,
      avoidedImpulseCount: 0,
    });
  }, [expenses, settings, debts]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const filteredBadges = useMemo(() => {
    if (selectedCategory === 'all') return badges;
    return badges.filter((b) => b.category === selectedCategory);
  }, [badges, selectedCategory]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Trophy Cabinet</h3>
            <p className="text-[11px] text-muted-foreground">
              {unlockedCount} of {badges.length} Milestones Achieved
            </p>
          </div>
        </div>

        {/* Progress Ring / Pill */}
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
          {Math.round((unlockedCount / badges.length) * 100)}%
        </span>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
        {[
          { id: 'all', label: 'All Badges' },
          { id: 'discipline', label: 'Discipline' },
          { id: 'streak', label: 'Streaks' },
          { id: 'saving', label: 'Saving' },
          { id: 'milestone', label: 'Milestones' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              vibrate(6);
              playTapSound();
              setSelectedCategory(tab.id);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 border ${
              selectedCategory === tab.id
                ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                : 'bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5">
        {filteredBadges.map((badge) => {
          return (
            <motion.div
              key={badge.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                vibrate(10);
                playTapSound();
                setActiveBadge(badge);
              }}
              className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between relative overflow-hidden cursor-pointer transition-all ${
                badge.unlocked
                  ? 'bg-gradient-to-b from-card to-card/90 border-amber-500/30 dark:border-amber-400/20 shadow-xs'
                  : 'bg-secondary/25 border-border/40 opacity-60'
              }`}
            >
              {/* Unlocked Sparkle */}
              {badge.unlocked && (
                <div className="absolute top-1.5 right-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                </div>
              )}

              {/* Icon Circle */}
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-2 transition-transform ${
                  badge.unlocked
                    ? 'bg-amber-500/15 ring-2 ring-amber-500/30 shadow-inner'
                    : 'bg-muted/60 grayscale'
                }`}
              >
                {badge.unlocked ? badge.icon : <Lock className="w-4 h-4 text-muted-foreground" />}
              </div>

              {/* Title */}
              <div className="w-full">
                <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
                  {badge.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {badge.unlocked ? 'Unlocked' : `${badge.progress}/${badge.maxProgress}`}
                </p>
              </div>

              {/* Progress bar for locked */}
              {!badge.unlocked && (
                <div className="w-full bg-muted rounded-full h-1 mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${Math.min(100, (badge.progress / badge.maxProgress) * 100)}%` }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {activeBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveBadge(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xs rounded-3xl bg-card border border-border/60 shadow-2xl p-6 text-center space-y-3 z-10"
            >
              <div
                className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-3xl ${
                  activeBadge.unlocked
                    ? 'bg-amber-500/20 ring-4 ring-amber-500/25 shadow-lg'
                    : 'bg-muted/70 text-muted-foreground'
                }`}
              >
                {activeBadge.unlocked ? activeBadge.icon : <Lock className="w-6 h-6 text-muted-foreground" />}
              </div>

              <div>
                <h4 className="text-base font-bold text-foreground">{activeBadge.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeBadge.description}
                </p>
              </div>

              <div className="pt-2">
                {activeBadge.unlocked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
                  </span>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Progress: {activeBadge.progress} / {activeBadge.maxProgress}
                    </p>
                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (activeBadge.progress / activeBadge.maxProgress) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveBadge(null)}
                className="w-full mt-3 py-2 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useExpenseStore } from '../../store/useExpenseStore';
import { isThisMonth, parseISO } from 'date-fns';

export function AmbientBackground() {
  const { expenses, settings, bills } = useExpenseStore();

  const healthState = useMemo(() => {
    const currentMonthExpenses = expenses.filter(
      (e) => isThisMonth(parseISO(e.date)) && e.category !== 'Income'
    );
    const incomeRecords = expenses.filter(
      (e) => isThisMonth(parseISO(e.date)) && e.category === 'Income'
    );

    const extraIncome = incomeRecords.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBills = bills.reduce((sum, b) => sum + b.amount, 0);
    const totalBudget = settings.monthlyIncome + extraIncome;

    const remaining = totalBudget - totalBills - totalExpenses;
    const isOverBudget = remaining < 0;
    const usedPercent = totalBudget > 0 ? ((totalExpenses + totalBills) / totalBudget) * 100 : 0;

    if (isOverBudget || usedPercent >= 90) return 'danger';
    if (usedPercent >= 75) return 'warning';
    return 'healthy';
  }, [expenses, settings.monthlyIncome, bills]);

  const colorPalettes = {
    healthy: {
      primary: 'rgba(16, 185, 129, 0.08)',
      secondary: 'rgba(6, 182, 212, 0.07)',
      accent: 'rgba(59, 130, 246, 0.05)',
      darkPrimary: 'rgba(16, 185, 129, 0.13)',
      darkSecondary: 'rgba(6, 182, 212, 0.12)',
      darkAccent: 'rgba(99, 102, 241, 0.08)',
    },
    warning: {
      primary: 'rgba(245, 158, 11, 0.09)',
      secondary: 'rgba(251, 191, 36, 0.07)',
      accent: 'rgba(234, 88, 12, 0.05)',
      darkPrimary: 'rgba(245, 158, 11, 0.15)',
      darkSecondary: 'rgba(251, 191, 36, 0.12)',
      darkAccent: 'rgba(234, 88, 12, 0.09)',
    },
    danger: {
      primary: 'rgba(244, 63, 94, 0.10)',
      secondary: 'rgba(239, 68, 68, 0.08)',
      accent: 'rgba(225, 29, 72, 0.06)',
      darkPrimary: 'rgba(244, 63, 94, 0.16)',
      darkSecondary: 'rgba(239, 68, 68, 0.13)',
      darkAccent: 'rgba(225, 29, 72, 0.10)',
    },
  };

  const currentColors = colorPalettes[healthState];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] select-none" aria-hidden="true">
      {/* Top ambient orb */}
      <motion.div
        animate={{
          x: [0, 25, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.08, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          background: `radial-gradient(circle, ${currentColors.primary} 0%, transparent 70%)`,
        }}
        className="absolute -top-32 -left-20 w-[480px] h-[480px] rounded-full blur-[100px] transition-colors duration-1000"
      />

      {/* Center-right ambient orb */}
      <motion.div
        animate={{
          x: [0, -35, 25, 0],
          y: [0, 35, -25, 0],
          scale: [1, 0.94, 1.06, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          background: `radial-gradient(circle, ${currentColors.secondary} 0%, transparent 70%)`,
        }}
        className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full blur-[110px] transition-colors duration-1000"
      />

      {/* Bottom ambient aura */}
      <motion.div
        animate={{
          x: [0, 20, -15, 0],
          y: [0, -20, 25, 0],
          scale: [1, 1.05, 0.96, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          background: `radial-gradient(circle, ${currentColors.accent} 0%, transparent 70%)`,
        }}
        className="absolute -bottom-20 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000"
      />
    </div>
  );
}

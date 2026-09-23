import { isSameMonth, parseISO, startOfMonth, eachDayOfInterval, format } from 'date-fns';
import type { Expense, Debt, Settings } from '../store/types';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'saving' | 'discipline' | 'milestone';
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  unlockedDateText?: string;
}

export interface BadgeCalculationInput {
  expenses: Expense[];
  settings: Settings;
  debts?: Debt[];
  avoidedImpulseCount?: number;
  currentDate?: Date;
}

export function calculateNoSpendDays(expenses: Expense[], asOfDate: Date = new Date()): {
  noSpendDaysCount: number;
  totalDaysInMonthToDate: number;
  isTodayNoSpend: boolean;
} {
  const monthStart = startOfMonth(asOfDate);
  const daysSoFar = eachDayOfInterval({ start: monthStart, end: asOfDate });

  // Get days that have non-zero non-income expenses
  const expenseDays = new Set(
    expenses
      .filter((e) => e.category !== 'Income' && e.category !== 'Transfer' && e.amount > 0)
      .map((e) => format(parseISO(e.date), 'yyyy-MM-dd'))
  );

  let noSpendDaysCount = 0;
  daysSoFar.forEach((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    if (!expenseDays.has(dayStr)) {
      noSpendDaysCount++;
    }
  });

  const todayStr = format(asOfDate, 'yyyy-MM-dd');
  const isTodayNoSpend = !expenseDays.has(todayStr);

  return {
    noSpendDaysCount,
    totalDaysInMonthToDate: daysSoFar.length,
    isTodayNoSpend,
  };
}

export function calculateBadges(input: BadgeCalculationInput): Badge[] {
  const { expenses, settings, debts = [], avoidedImpulseCount = 0, currentDate = new Date() } = input;
  
  const currentStreak = settings.currentStreak || 0;
  const noSpendInfo = calculateNoSpendDays(expenses, currentDate);

  // Calculate current month spending
  const currentMonthExpenses = expenses.filter(
    (e) =>
      e.category !== 'Income' &&
      e.category !== 'Transfer' &&
      isSameMonth(parseISO(e.date), currentDate)
  );
  const currentMonthSpend = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlyIncome = settings.monthlyIncome || 0;

  // Savings rate
  const savingsRate = monthlyIncome > 0 ? (monthlyIncome - currentMonthSpend) / monthlyIncome : 0;

  // Unsettled debts
  const pendingDebts = debts.filter((d) => d.status === 'pending');

  const badges: Badge[] = [
    {
      id: 'first_expense',
      title: 'First Step',
      description: 'Logged your very first transaction in the app.',
      icon: '🌱',
      category: 'milestone',
      unlocked: expenses.length > 0,
      progress: Math.min(expenses.length, 1),
      maxProgress: 1,
    },
    {
      id: 'streak_7',
      title: '7-Day Hot Streak',
      description: 'Consistently logged your spending for 7 consecutive days.',
      icon: '🔥',
      category: 'streak',
      unlocked: currentStreak >= 7,
      progress: Math.min(currentStreak, 7),
      maxProgress: 7,
    },
    {
      id: 'streak_30',
      title: 'Habit Master (30 Days)',
      description: 'Reached a remarkable 30-day expense tracking streak.',
      icon: '⚡',
      category: 'streak',
      unlocked: currentStreak >= 30,
      progress: Math.min(currentStreak, 30),
      maxProgress: 30,
    },
    {
      id: 'no_spend_day',
      title: 'Clean Sheet',
      description: 'Completed a full day without spending any money.',
      icon: '🛡️',
      category: 'discipline',
      unlocked: noSpendInfo.noSpendDaysCount >= 1,
      progress: Math.min(noSpendInfo.noSpendDaysCount, 1),
      maxProgress: 1,
    },
    {
      id: 'no_spend_7',
      title: 'Zen Saver (7 No-Spend Days)',
      description: 'Achieved 7 or more zero-spend days in a single month.',
      icon: '🧘',
      category: 'discipline',
      unlocked: noSpendInfo.noSpendDaysCount >= 7,
      progress: Math.min(noSpendInfo.noSpendDaysCount, 7),
      maxProgress: 7,
    },
    {
      id: 'budget_guardian',
      title: 'Budget Guardian',
      description: 'Kept monthly spend comfortably under 80% of your income.',
      icon: '🏰',
      category: 'saving',
      unlocked: monthlyIncome > 0 && currentMonthSpend <= monthlyIncome * 0.8 && currentMonthExpenses.length > 0,
      progress: monthlyIncome > 0 ? Math.min(100, Math.round((currentMonthSpend / (monthlyIncome * 0.8)) * 100)) : 0,
      maxProgress: 100,
    },
    {
      id: 'savings_sentinel',
      title: 'Savings Sentinel (20%+ Saved)',
      description: 'Saved at least 20% of your monthly income this month.',
      icon: '💎',
      category: 'saving',
      unlocked: monthlyIncome > 0 && savingsRate >= 0.2,
      progress: monthlyIncome > 0 ? Math.min(20, Math.round(savingsRate * 100)) : 0,
      maxProgress: 20,
    },
    {
      id: 'impulse_slayer',
      title: 'Impulse Slayer',
      description: 'Waited out a 72-hour cooling period and avoided an impulse buy.',
      icon: '🧠',
      category: 'discipline',
      unlocked: avoidedImpulseCount >= 1,
      progress: Math.min(avoidedImpulseCount, 1),
      maxProgress: 1,
    },
    {
      id: 'debt_slayer',
      title: 'Clean Slate (Zero IOUs)',
      description: 'Settled all debts with friends and creditors.',
      icon: '✨',
      category: 'milestone',
      unlocked: debts.length > 0 && pendingDebts.length === 0,
      progress: debts.length > 0 && pendingDebts.length === 0 ? 1 : 0,
      maxProgress: 1,
    },
  ];

  return badges;
}

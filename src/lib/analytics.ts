import { 
  format, 
  subMonths, 
  getDaysInMonth, 
  isSameMonth 
} from 'date-fns';
import type { Expense, Budget } from '../store/useExpenseStore';
import { getExpenseLocalDate } from './streak';

export interface MonthKPIs {
  totalExpenses: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number; // percentage, can be negative if overspent
  dailyAverage: number;
  projectedMonthEnd: number;
  percentChangeFromLastMonth: number;
  peakExpenseDay: { dateStr: string; day: number; amount: number } | null;
  largestExpense: Expense | null;
}

export interface MultiMonthTrendItem {
  monthKey: string; // yyyy-MM
  monthLabel: string; // e.g. "Apr", "May"
  expenses: number;
  income: number;
  savings: number;
}

export interface DailySpendItem {
  day: number;
  dayLabel: string; // e.g. "1", "2"
  dateStr: string;
  amount: number;
}

export interface CategoryBreakdownItem {
  name: string;
  value: number;
  percentage: number;
  budgetLimit?: number;
  budgetUsedPercent?: number;
}

export interface SmartInsight {
  id: string;
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
  icon: string;
}

/**
 * Calculates high-level financial KPIs for a selected month.
 */
export function calculateMonthKPIs(
  expenses: Expense[],
  baselineMonthlyIncome: number,
  selectedDate: Date,
  referenceNow: Date = new Date()
): MonthKPIs {
  const selectedMonthStr = format(selectedDate, 'yyyy-MM');

  // Filter positive expenses (ignore negative carry-overs) using local date
  const currentMonthExpenses = expenses.filter(e => {
    if (!e || !e.date || e.category === 'Income' || e.amount <= 0) return false;
    return getExpenseLocalDate(e.date).startsWith(selectedMonthStr);
  });
  const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Income: sum of category 'Income' records or fallback to baselineMonthlyIncome
  const loggedIncome = expenses
    .filter(e => {
      if (!e || !e.date || e.category !== 'Income') return false;
      return getExpenseLocalDate(e.date).startsWith(selectedMonthStr);
    })
    .reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = loggedIncome > 0 ? loggedIncome : (baselineMonthlyIncome || 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Days calculation
  const totalDaysInMonth = getDaysInMonth(selectedDate);
  const isCurrentMonth = isSameMonth(selectedDate, referenceNow);
  const daysPassed = isCurrentMonth 
    ? Math.max(1, Math.min(referenceNow.getDate(), totalDaysInMonth))
    : totalDaysInMonth;

  const dailyAverage = daysPassed > 0 ? Math.round(totalExpenses / daysPassed) : 0;
  const projectedMonthEnd = isCurrentMonth 
    ? Math.round(dailyAverage * totalDaysInMonth) 
    : totalExpenses;

  // Last Month comparison
  const lastMonthDate = subMonths(selectedDate, 1);
  const lastMonthStr = format(lastMonthDate, 'yyyy-MM');
  const lastMonthExpenses = expenses
    .filter(e => {
      if (!e || !e.date || e.category === 'Income' || e.amount <= 0) return false;
      return getExpenseLocalDate(e.date).startsWith(lastMonthStr);
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const percentChangeFromLastMonth = lastMonthExpenses === 0
    ? 0
    : Math.round(((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100);

  // Peak Expense Day
  const dailyTotals: Record<number, { dateStr: string; amount: number }> = {};
  let largestExpense: Expense | null = null;

  for (const e of currentMonthExpenses) {
    if (!largestExpense || e.amount > largestExpense.amount) {
      largestExpense = e;
    }
    const localDate = getExpenseLocalDate(e.date);
    const day = Number(localDate.split('-')[2]);
    if (day) {
      if (!dailyTotals[day]) {
        dailyTotals[day] = { dateStr: localDate, amount: 0 };
      }
      dailyTotals[day].amount += e.amount;
    }
  }

  let peakExpenseDay: { dateStr: string; day: number; amount: number } | null = null;
  for (const [dayStr, data] of Object.entries(dailyTotals)) {
    const day = Number(dayStr);
    if (!peakExpenseDay || data.amount > peakExpenseDay.amount) {
      peakExpenseDay = { day, dateStr: data.dateStr, amount: data.amount };
    }
  }

  return {
    totalExpenses,
    totalIncome,
    netSavings,
    savingsRate,
    dailyAverage,
    projectedMonthEnd,
    percentChangeFromLastMonth,
    peakExpenseDay,
    largestExpense
  };
}

/**
 * Calculates multi-month trends (default 6 months ending on targetDate).
 */
export function calculateMultiMonthTrends(
  expenses: Expense[],
  baselineMonthlyIncome: number,
  targetDate: Date = new Date(),
  numMonths: number = 6
): MultiMonthTrendItem[] {
  const result: MultiMonthTrendItem[] = [];

  for (let i = numMonths - 1; i >= 0; i--) {
    const mDate = subMonths(targetDate, i);
    const mKey = format(mDate, 'yyyy-MM');
    const mLabel = format(mDate, 'MMM');

    const mExpenses = expenses
      .filter(e => {
        if (!e || !e.date || e.category === 'Income' || e.amount <= 0) return false;
        return getExpenseLocalDate(e.date).startsWith(mKey);
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const loggedIncome = expenses
      .filter(e => {
        if (!e || !e.date || e.category !== 'Income') return false;
        return getExpenseLocalDate(e.date).startsWith(mKey);
      })
      .reduce((sum, e) => sum + e.amount, 0);
    const mIncome = loggedIncome > 0 ? loggedIncome : (baselineMonthlyIncome || 0);

    result.push({
      monthKey: mKey,
      monthLabel: mLabel,
      expenses: mExpenses,
      income: mIncome,
      savings: Math.max(0, mIncome - mExpenses)
    });
  }

  return result;
}

/**
 * Generates daily spending values for every day in the month.
 */
export function calculateDailySpend(
  expenses: Expense[],
  selectedDate: Date
): DailySpendItem[] {
  const selectedMonthStr = format(selectedDate, 'yyyy-MM');
  const daysInMonth = getDaysInMonth(selectedDate);
  const dailyMap: Record<number, number> = {};

  expenses.forEach(e => {
    if (!e || !e.date || e.category === 'Income' || e.amount <= 0) return;
    const localDate = getExpenseLocalDate(e.date);
    if (localDate.startsWith(selectedMonthStr)) {
      const parts = localDate.split('-');
      const d = Number(parts[2]);
      if (d >= 1 && d <= daysInMonth) {
        dailyMap[d] = (dailyMap[d] || 0) + e.amount;
      }
    }
  });

  const list: DailySpendItem[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPadded = String(day).padStart(2, '0');
    list.push({
      day,
      dayLabel: `${day}`,
      dateStr: `${selectedMonthStr}-${dayPadded}`,
      amount: dailyMap[day] || 0
    });
  }

  return list;
}

/**
 * Generates category breakdown with budget pacing information.
 */
export function calculateCategoryBreakdown(
  expenses: Expense[],
  budgets: Budget[],
  selectedMonthStr: string
): CategoryBreakdownItem[] {
  const currentMonthExpenses = expenses.filter(e => {
    if (!e || !e.date || e.category === 'Income' || e.amount <= 0) return false;
    return getExpenseLocalDate(e.date).startsWith(selectedMonthStr);
  });

  const categoryTotals = currentMonthExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  return Object.entries(categoryTotals)
    .map(([name, value]) => {
      const budget = budgets.find(b => b.category === name && b.month === selectedMonthStr);
      const budgetLimit = budget?.monthlyLimit;
      const budgetUsedPercent = budgetLimit && budgetLimit > 0
        ? Math.round((value / budgetLimit) * 100)
        : undefined;

      return {
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
        budgetLimit,
        budgetUsedPercent
      };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * Generates automated smart financial insights.
 */
export function generateSmartInsights(
  kpis: MonthKPIs,
  categories: CategoryBreakdownItem[],
  currency: string
): SmartInsight[] {
  const insights: SmartInsight[] = [];

  // 1. Savings Insight
  if (kpis.totalIncome > 0) {
    if (kpis.savingsRate >= 20) {
      insights.push({
        id: 'savings-great',
        type: 'positive',
        title: 'Strong Savings Rate',
        description: `You're on track! You saved ${kpis.savingsRate}% of your income this month.`,
        icon: '💰'
      });
    } else if (kpis.savingsRate < 0) {
      insights.push({
        id: 'savings-deficit',
        type: 'warning',
        title: 'Spending Exceeded Income',
        description: `Expenses exceed income by ${currency} ${Math.abs(kpis.netSavings).toLocaleString()}. Review optional categories to balance.`,
        icon: '⚠️'
      });
    }
  }

  // 2. Top Category Dominance
  if (categories.length > 0) {
    const topCat = categories[0];
    if (topCat.percentage >= 35) {
      insights.push({
        id: 'top-category',
        type: 'info',
        title: `${topCat.name} is Your Top Expense`,
        description: `${topCat.name} accounts for ${topCat.percentage}% (${currency} ${topCat.value.toLocaleString()}) of your total monthly spend.`,
        icon: '📊'
      });
    }
  }

  // 3. Budget Violations / Near Limits
  const overBudgetCat = categories.find(c => c.budgetUsedPercent && c.budgetUsedPercent > 100);
  const nearBudgetCat = categories.find(c => c.budgetUsedPercent && c.budgetUsedPercent >= 80 && c.budgetUsedPercent <= 100);

  if (overBudgetCat) {
    insights.push({
      id: 'over-budget',
      type: 'warning',
      title: `${overBudgetCat.name} Over Budget`,
      description: `Spent ${overBudgetCat.budgetUsedPercent}% of the ${currency} ${overBudgetCat.budgetLimit?.toLocaleString()} monthly limit.`,
      icon: '🚨'
    });
  } else if (nearBudgetCat) {
    insights.push({
      id: 'near-budget',
      type: 'info',
      title: `${nearBudgetCat.name} Near Limit`,
      description: `You have utilized ${nearBudgetCat.budgetUsedPercent}% of your ${currency} ${nearBudgetCat.budgetLimit?.toLocaleString()} budget.`,
      icon: '⏳'
    });
  }

  // 4. Month-over-Month Shift
  if (kpis.percentChangeFromLastMonth !== 0) {
    if (kpis.percentChangeFromLastMonth < -10) {
      insights.push({
        id: 'mom-improved',
        type: 'positive',
        title: 'Spending Reduced',
        description: `You spent ${Math.abs(kpis.percentChangeFromLastMonth)}% less compared to the same time last month!`,
        icon: '📉'
      });
    } else if (kpis.percentChangeFromLastMonth > 15) {
      insights.push({
        id: 'mom-increased',
        type: 'warning',
        title: 'Higher Spend than Last Month',
        description: `Spending is up by ${kpis.percentChangeFromLastMonth}% compared to last month.`,
        icon: '📈'
      });
    }
  }

  // 5. Largest Single Transaction
  if (kpis.largestExpense && kpis.largestExpense.amount > 0) {
    insights.push({
      id: 'largest-spend',
      type: 'info',
      title: 'Largest Single Purchase',
      description: `"${kpis.largestExpense.description}" (${currency} ${kpis.largestExpense.amount.toLocaleString()}) on ${kpis.largestExpense.date.split('T')[0]}.`,
      icon: '💎'
    });
  }

  return insights;
}

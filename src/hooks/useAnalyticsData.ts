import { useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import type { Expense, Budget, Settings } from '../store/useExpenseStore';
import {
  calculateMonthKPIs,
  calculateMultiMonthTrends,
  calculateDailySpend,
  calculateCategoryBreakdown,
  generateSmartInsights
} from '../lib/analytics';
import { getExpenseLocalDate } from '../lib/streak';

export function useAnalyticsData(
  expenses: Expense[],
  settings: Settings,
  budgets: Budget[],
  currentDate: Date,
  selectedCategoryForDrilldown: string | null
) {
  const selectedMonthStr = format(currentDate, 'yyyy-MM');
  const monthDisplayLabel = format(currentDate, 'MMMM yyyy');

  // Month KPIs
  const kpis = useMemo(() => {
    return calculateMonthKPIs(expenses, settings.monthlyIncome, currentDate);
  }, [expenses, settings.monthlyIncome, currentDate]);

  // Category Breakdown with Budget Pacing
  const categoryData = useMemo(() => {
    return calculateCategoryBreakdown(expenses, budgets, selectedMonthStr);
  }, [expenses, budgets, selectedMonthStr]);

  // Daily Spending Chart Data
  const dailyData = useMemo(() => {
    return calculateDailySpend(expenses, currentDate);
  }, [expenses, currentDate]);

  // Multi-Month Trend Data (Last 6 months)
  const sixMonthTrends = useMemo(() => {
    return calculateMultiMonthTrends(expenses, settings.monthlyIncome, currentDate, 6);
  }, [expenses, settings.monthlyIncome, currentDate]);

  // Smart Financial Insights
  const smartInsights = useMemo(() => {
    return generateSmartInsights(kpis, categoryData, settings.currency);
  }, [kpis, categoryData, settings.currency]);

  // Extract Smart Tags for selected month
  const tagData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      if (getExpenseLocalDate(e.date).startsWith(selectedMonthStr) && e.category !== 'Income' && e.amount > 0) {
        const tags = e.description.match(/#[\w-]+/g);
        if (tags) {
          tags.forEach(t => {
            const cleanTag = t.toLowerCase();
            map[cleanTag] = (map[cleanTag] || 0) + e.amount;
          });
        }
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses, selectedMonthStr]);

  // Expenses filtered for category drill-down
  const drilldownExpenses = useMemo(() => {
    if (!selectedCategoryForDrilldown) return [];
    return expenses.filter(e => 
      getExpenseLocalDate(e.date).startsWith(selectedMonthStr) &&
      e.category === selectedCategoryForDrilldown &&
      e.amount > 0
    );
  }, [expenses, selectedMonthStr, selectedCategoryForDrilldown]);

  // Previous month spend for selected category (for MoM comparison)
  const previousMonthStr = format(subMonths(currentDate, 1), 'yyyy-MM');
  const previousMonthCategorySpend = useMemo(() => {
    if (!selectedCategoryForDrilldown) return 0;
    return expenses
      .filter(e => 
        getExpenseLocalDate(e.date).startsWith(previousMonthStr) && 
        e.category === selectedCategoryForDrilldown && 
        e.amount > 0
      )
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, previousMonthStr, selectedCategoryForDrilldown]);

  // Category budget for drill-down
  const selectedCategoryBudget = useMemo(() => {
    if (!selectedCategoryForDrilldown) return undefined;
    const catBudget = budgets.find(b => b.month === selectedMonthStr && b.category === selectedCategoryForDrilldown);
    return catBudget?.monthlyLimit || settings.categoryBudgets?.[selectedCategoryForDrilldown];
  }, [budgets, selectedMonthStr, selectedCategoryForDrilldown, settings.categoryBudgets]);

  // 6-Month Summary Aggregates
  const sixMonthSummary = useMemo(() => {
    const totalExp = sixMonthTrends.reduce((sum, item) => sum + item.expenses, 0);
    const totalInc = sixMonthTrends.reduce((sum, item) => sum + item.income, 0);
    const avgExp = Math.round(totalExp / (sixMonthTrends.length || 1));
    const totalSav = totalInc - totalExp;
    return { totalExp, avgExp, totalSav };
  }, [sixMonthTrends]);

  return {
    selectedMonthStr,
    monthDisplayLabel,
    kpis,
    categoryData,
    dailyData,
    sixMonthTrends,
    smartInsights,
    tagData,
    drilldownExpenses,
    previousMonthCategorySpend,
    selectedCategoryBudget,
    sixMonthSummary
  };
}

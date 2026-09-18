import { describe, it, expect } from 'vitest';
import { 
  calculateMonthKPIs, 
  calculateMultiMonthTrends, 
  calculateDailySpend, 
  calculateCategoryBreakdown,
  generateSmartInsights 
} from './analytics';
import type { Expense, Budget } from '../store/useExpenseStore';

describe('analytics computations', () => {
  const selectedDate = new Date(2026, 8, 18); // Sep 2026
  const refNow = new Date(2026, 8, 18);

  const mockExpenses: Expense[] = [
    { id: '1', amount: 1200, description: 'Groceries', category: 'Grocery', date: '2026-09-02T10:00:00' },
    { id: '2', amount: 800, description: 'Dinner', category: 'Food', date: '2026-09-02T14:00:00' },
    { id: '3', amount: 5000, description: 'Flight Ticket', category: 'Travel', date: '2026-09-10T12:00:00' },
    { id: '4', amount: 1500, description: 'Fuel', category: 'Fuel', date: '2026-09-15T09:00:00' },
    // Income
    { id: '5', amount: 30000, description: 'Salary', category: 'Income', date: '2026-09-01T00:00:00' },
    // Last month expense
    { id: '6', amount: 10000, description: 'Rent', category: 'Bills', date: '2026-08-05T00:00:00' },
  ];

  const mockBudgets: Budget[] = [
    { id: 'b1', category: 'Grocery', monthlyLimit: 2000, month: '2026-09', userId: 'u1' },
    { id: 'b2', category: 'Travel', monthlyLimit: 4000, month: '2026-09', userId: 'u1' } // overbudget
  ];

  it('calculates monthly KPIs correctly', () => {
    const kpis = calculateMonthKPIs(mockExpenses, 25000, selectedDate, refNow);
    // Total expenses = 1200 + 800 + 5000 + 1500 = 8500
    expect(kpis.totalExpenses).toBe(8500);
    // Income = 30000 (from logged income)
    expect(kpis.totalIncome).toBe(30000);
    // Net savings = 30000 - 8500 = 21500
    expect(kpis.netSavings).toBe(21500);
    // Savings rate = round((21500 / 30000) * 100) = 72%
    expect(kpis.savingsRate).toBe(72);
    // Days passed = 18. Daily average = round(8500 / 18) = 472
    expect(kpis.dailyAverage).toBe(472);
    // Projected = 472 * 30 = 14160
    expect(kpis.projectedMonthEnd).toBe(14160);
    // Largest expense
    expect(kpis.largestExpense?.description).toBe('Flight Ticket');
    // Peak day (Sep 10: 5000)
    expect(kpis.peakExpenseDay?.day).toBe(10);
    expect(kpis.peakExpenseDay?.amount).toBe(5000);
  });

  it('calculates multi-month trends for 6 months', () => {
    const trends = calculateMultiMonthTrends(mockExpenses, 25000, selectedDate, 6);
    expect(trends.length).toBe(6);
    const sep = trends[5];
    expect(sep.monthKey).toBe('2026-09');
    expect(sep.expenses).toBe(8500);
    expect(sep.income).toBe(30000);

    const aug = trends[4];
    expect(aug.monthKey).toBe('2026-08');
    expect(aug.expenses).toBe(10000);
  });

  it('calculates daily spend for every day of the month', () => {
    const daily = calculateDailySpend(mockExpenses, selectedDate);
    expect(daily.length).toBe(30); // September has 30 days
    // Day 2 had 1200 + 800 = 2000
    expect(daily[1].amount).toBe(2000);
    // Day 10 had 5000
    expect(daily[9].amount).toBe(5000);
    // Day 1 had 0 expenses (income ignored)
    expect(daily[0].amount).toBe(0);
  });

  it('calculates category breakdown with budget pacing', () => {
    const breakdown = calculateCategoryBreakdown(mockExpenses, mockBudgets, '2026-09');
    expect(breakdown.length).toBe(4); // Travel, Fuel, Grocery, Food
    expect(breakdown[0].name).toBe('Travel');
    expect(breakdown[0].value).toBe(5000);
    expect(breakdown[0].budgetLimit).toBe(4000);
    // 5000 / 4000 = 125%
    expect(breakdown[0].budgetUsedPercent).toBe(125);

    const grocery = breakdown.find(b => b.name === 'Grocery');
    expect(grocery?.budgetLimit).toBe(2000);
    expect(grocery?.budgetUsedPercent).toBe(60); // 1200 / 2000 = 60%
  });

  it('generates smart insights', () => {
    const kpis = calculateMonthKPIs(mockExpenses, 25000, selectedDate, refNow);
    const breakdown = calculateCategoryBreakdown(mockExpenses, mockBudgets, '2026-09');
    const insights = generateSmartInsights(kpis, breakdown, '₹');

    expect(insights.length).toBeGreaterThan(0);
    // Should warn about Travel over budget
    const overBudgetInsight = insights.find(i => i.id === 'over-budget');
    expect(overBudgetInsight).toBeDefined();
    expect(overBudgetInsight?.title).toContain('Travel Over Budget');

    // Should have savings insight
    const savingsInsight = insights.find(i => i.id === 'savings-great');
    expect(savingsInsight).toBeDefined();
  });
});

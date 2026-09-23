import { describe, it, expect } from 'vitest';
import { generateStatementData } from './pdfReportGenerator';
import type { Expense, Settings, Account } from '../store/types';

describe('pdfReportGenerator', () => {
  const mockSettings: Settings = {
    monthlyIncome: 60000,
    currency: '₹',
    darkMode: false,
    categories: ['Food', 'Bills', 'Travel'],
    carryForward: false,
    categoryBudgets: {},
    quickAdds: [],
    userName: 'Nithin Reddy',
  };

  const mockExpenses: Expense[] = [
    { id: '1', amount: 1500, description: 'Groceries', category: 'Food', date: '2026-09-02T10:00:00.000Z' },
    { id: '2', amount: 4500, description: 'Electricity Bill', category: 'Bills', date: '2026-09-05T10:00:00.000Z' },
    { id: '3', amount: 50000, description: 'Consulting', category: 'Income', date: '2026-09-01T10:00:00.000Z' },
  ];

  const mockAccounts: Account[] = [
    { id: 'a1', name: 'HDFC Bank', type: 'bank', balance: 45000, currency: '₹' },
    { id: 'a2', name: 'Credit Card', type: 'credit_card', balance: 5000, currency: '₹' },
  ];

  it('aggregates executive income, expense, and net savings totals correctly', () => {
    const data = generateStatementData(mockExpenses, mockSettings, mockAccounts, new Date('2026-09-10'));

    expect(data.userName).toBe('Nithin Reddy');
    expect(data.periodLabel).toBe('September 2026');
    expect(data.totalExpenses).toBe(6000); // 1500 + 4500
    expect(data.totalIncome).toBe(50000);
    expect(data.netSavings).toBe(44000); // 50000 - 6000
    expect(data.liquidNetWorth).toBe(40000); // 45000 - 5000
  });

  it('computes category breakdowns with transaction counts and percentages', () => {
    const data = generateStatementData(mockExpenses, mockSettings, mockAccounts, new Date('2026-09-10'));

    expect(data.categoryBreakdown.length).toBe(2);
    const bills = data.categoryBreakdown.find((c) => c.category === 'Bills');
    expect(bills?.amount).toBe(4500);
    expect(bills?.percentage).toBe(75); // 4500 / 6000 = 75%
  });
});

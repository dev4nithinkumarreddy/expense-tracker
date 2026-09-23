import { describe, it, expect } from 'vitest';
import { calculateFinancialHealth } from './financialHealth';
import type { Expense } from '../store/types';

describe('calculateFinancialHealth', () => {
  it('correctly calculates 50/30/20 proportions and high score for balanced budget', () => {
    const expenses: Expense[] = [
      { id: '1', amount: 20000, description: 'Groceries', category: 'Grocery', date: '2026-09-05T00:00:00.000Z' },
      { id: '2', amount: 5000, description: 'Electricity', category: 'Bills', date: '2026-09-10T00:00:00.000Z' },
      { id: '3', amount: 15000, description: 'Dining out', category: 'Food', date: '2026-09-12T00:00:00.000Z' },
    ];
    // Income: 50,000. Spent: 40,000. Needs: 25,000 (50%). Wants: 15,000 (30%). Savings: 10,000 (20%).
    const health = calculateFinancialHealth(50000, expenses, '2026-09');
    expect(health.needsPercentage).toBe(50);
    expect(health.wantsPercentage).toBe(30);
    expect(health.savingsPercentage).toBe(20);
    expect(health.score).toBeGreaterThanOrEqual(85);
    expect(health.rating).toBe('Excellent');
  });

  it('penalizes score when wants exceed healthy threshold', () => {
    const expenses: Expense[] = [
      { id: '1', amount: 35000, description: 'Luxury shopping', category: 'Shopping', date: '2026-09-02T00:00:00.000Z' },
      { id: '2', amount: 10000, description: 'Fine dining', category: 'Food', date: '2026-09-05T00:00:00.000Z' },
    ];
    // 45,000 spent on Wants out of 50,000 (90%)
    const health = calculateFinancialHealth(50000, expenses, '2026-09');
    expect(health.wantsPercentage).toBe(90);
    expect(health.score).toBeLessThan(70);
  });
});

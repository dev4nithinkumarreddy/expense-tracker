import { describe, it, expect } from 'vitest';
import { calculateBadges, calculateNoSpendDays } from './badges';
import type { Expense, Settings, Debt } from '../store/types';

describe('badges engine', () => {
  const mockSettings: Settings = {
    monthlyIncome: 50000,
    currency: '₹',
    darkMode: true,
    categories: ['Food', 'Shopping', 'Bills'],
    carryForward: false,
    categoryBudgets: {},
    quickAdds: [],
    currentStreak: 7,
  };

  it('correctly calculates no-spend days in interval', () => {
    const fixedDate = new Date('2026-09-15T12:00:00.000Z');
    const expenses: Expense[] = [
      { id: '1', amount: 100, description: 'Lunch', category: 'Food', date: '2026-09-01T10:00:00.000Z' },
      { id: '2', amount: 200, description: 'Dinner', category: 'Food', date: '2026-09-02T10:00:00.000Z' },
      { id: '3', amount: 50, description: 'Tea', category: 'Food', date: '2026-09-03T10:00:00.000Z' },
    ];

    const result = calculateNoSpendDays(expenses, fixedDate);
    // Sep 1 to Sep 15 = 15 days. 3 have expenses, so 12 are no-spend days!
    expect(result.noSpendDaysCount).toBe(12);
  });

  it('unlocks badges when requirements are met', () => {
    const expenses: Expense[] = [
      { id: '1', amount: 10000, description: 'Rent', category: 'Bills', date: new Date().toISOString() },
    ];
    const debts: Debt[] = [
      { id: 'd1', person_name: 'Rahul', amount: 500, type: 'lent', status: 'settled', date: '2026-09-01' },
    ];

    const badges = calculateBadges({
      expenses,
      settings: mockSettings,
      debts,
      avoidedImpulseCount: 2,
    });

    const firstStep = badges.find((b) => b.id === 'first_expense');
    expect(firstStep?.unlocked).toBe(true);

    const streak7 = badges.find((b) => b.id === 'streak_7');
    expect(streak7?.unlocked).toBe(true);

    const impulse = badges.find((b) => b.id === 'impulse_slayer');
    expect(impulse?.unlocked).toBe(true);

    const debtSlayer = badges.find((b) => b.id === 'debt_slayer');
    expect(debtSlayer?.unlocked).toBe(true);
  });

  it('keeps badges locked if thresholds are not met', () => {
    const badges = calculateBadges({
      expenses: [],
      settings: { ...mockSettings, currentStreak: 2 },
      debts: [],
      avoidedImpulseCount: 0,
    });

    const streak30 = badges.find((b) => b.id === 'streak_30');
    expect(streak30?.unlocked).toBe(false);

    const firstStep = badges.find((b) => b.id === 'first_expense');
    expect(firstStep?.unlocked).toBe(false);
  });
});

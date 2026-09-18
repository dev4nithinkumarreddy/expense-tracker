import { describe, it, expect } from 'vitest';
import { calculateStreak } from './streak';
import { format, subDays } from 'date-fns';

describe('streak calculations', () => {
  const baseDate = new Date(2026, 8, 18, 12, 0, 0); // 2026-09-18
  const todayStr = format(baseDate, 'yyyy-MM-dd');
  const d1 = format(subDays(baseDate, 1), 'yyyy-MM-dd');
  const d2 = format(subDays(baseDate, 2), 'yyyy-MM-dd');
  const d3 = format(subDays(baseDate, 3), 'yyyy-MM-dd');
  const d4 = format(subDays(baseDate, 4), 'yyyy-MM-dd');

  it('returns 0 for empty expenses', () => {
    expect(calculateStreak([], baseDate)).toBe(0);
  });

  it('returns 1 when user logged an expense today', () => {
    const expenses = [{ date: `${todayStr}T10:00:00.000Z` }];
    expect(calculateStreak(expenses, baseDate)).toBe(1);
  });

  it('returns 1 when user logged multiple expenses today (no duplicate counting)', () => {
    const expenses = [
      { date: `${todayStr}T09:00:00.000Z` },
      { date: `${todayStr}T14:30:00.000Z` },
      { date: `${todayStr}T19:00:00.000Z` }
    ];
    expect(calculateStreak(expenses, baseDate)).toBe(1);
  });

  it('returns 2 when user logged today and yesterday', () => {
    const expenses = [
      { date: `${todayStr}T10:00:00.000Z` },
      { date: `${d1}T12:00:00.000Z` }
    ];
    expect(calculateStreak(expenses, baseDate)).toBe(2);
  });

  it('returns 4 for 4 consecutive days of logging including today', () => {
    const expenses = [
      { date: `${todayStr}T10:00:00.000Z` },
      { date: `${d1}T12:00:00.000Z` },
      { date: `${d2}T08:00:00.000Z` },
      { date: `${d3}T15:00:00.000Z` }
    ];
    expect(calculateStreak(expenses, baseDate)).toBe(4);
  });

  it('stops counting streak when a day is missing', () => {
    // Has today, d1, misses d2, has d3 and d4
    const expenses = [
      { date: `${todayStr}T10:00:00.000Z` },
      { date: `${d1}T12:00:00.000Z` },
      { date: `${d3}T08:00:00.000Z` },
      { date: `${d4}T15:00:00.000Z` }
    ];
    expect(calculateStreak(expenses, baseDate)).toBe(2);
  });

  it('preserves yesterday streak as active if user has not logged today yet', () => {
    // No log today, but logged d1 (yesterday) and d2
    const expenses = [
      { date: `${d1}T12:00:00.000Z` },
      { date: `${d2}T08:00:00.000Z` }
    ];
    expect(calculateStreak(expenses, baseDate)).toBe(2);
  });

  it('returns 0 if user missed yesterday and has not logged today', () => {
    // Logged d2 and d3, but missed yesterday and today
    const expenses = [
      { date: `${d2}T08:00:00.000Z` },
      { date: `${d3}T15:00:00.000Z` }
    ];
    expect(calculateStreak(expenses, baseDate)).toBe(0);
  });

  it('resets to 1 when user logs today after a broken streak', () => {
    // Logged today, missed yesterday, logged d2
    const expenses = [
      { date: `${todayStr}T10:00:00.000Z` },
      { date: `${d2}T08:00:00.000Z` }
    ];
    expect(calculateStreak(expenses, baseDate)).toBe(1);
  });

  it('correctly handles YYYY-MM-DD format without time', () => {
    const expenses = [
      { date: todayStr },
      { date: d1 },
      { date: d2 }
    ];
    expect(calculateStreak(expenses, baseDate)).toBe(3);
  });
});

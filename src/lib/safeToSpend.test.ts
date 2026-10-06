import { describe, it, expect } from 'vitest';
import { calculateSafeToSpend } from './safeToSpend';

describe('calculateSafeToSpend', () => {
  it('calculates daily allowance based on remaining days', () => {
    // 15 days remaining in month with 30 days
    const mockDate = new Date(2026, 8, 16); // Sept 16 (15 days left)
    const res = calculateSafeToSpend(15000, 3000, mockDate, 30000);
    // discretionary pool: 15000 - 3000 = 12000
    // daily allowance: 12000 / 15 = 800
    expect(res.discretionaryPool).toBe(12000);
    expect(res.dailyAllowance).toBe(800);
    expect(res.status).toBe('safe');
  });

  it('marks critical status when available balance is 0 or negative', () => {
    const res = calculateSafeToSpend(-500, 2000, new Date(), 20000);
    expect(res.status).toBe('critical');
    expect(res.dailyAllowance).toBe(0);
  });

  it('simulates future spend impact on daily runway', () => {
    const mockDate = new Date(2026, 8, 16); // 15 days left
    const res = calculateSafeToSpend(15000, 3000, mockDate, 30000);
    const simulation = res.simulateSpend(1500);
    // 12000 - 1500 = 10500 / 15 = 700
    expect(simulation.newDailyAllowance).toBe(700);
    expect(simulation.impactPerDay).toBe(100);
  });

  it('predicts month-end surplus when current spending pace is conservative', () => {
    // Oct 10 (day 10 of 31), budget = 30000, spent so far = 5000
    // avg pace = 500/day. Remaining 21 days = 10,500 + upcoming bills (2000) = 17,500 total
    const mockDate = new Date(2026, 9, 10);
    const res = calculateSafeToSpend(23000, 2000, mockDate, 30000, 5000, 1);
    expect(res.projection.projectedStatus).toBe('surplus');
    expect(res.projection.projectedSurplus).toBeGreaterThan(0);
    expect(res.projection.avgDailyPace).toBe(500);
  });

  it('predicts month-end deficit and breach date when spend pace is too high', () => {
    // Oct 10 (day 10 of 31), budget = 20000, spent so far = 18000
    // avg pace = 1800/day. Deficit will occur very soon.
    const mockDate = new Date(2026, 9, 10);
    const res = calculateSafeToSpend(2000, 1000, mockDate, 20000, 18000, 1);
    expect(res.projection.projectedStatus).toBe('deficit');
    expect(res.projection.projectedSurplus).toBeLessThan(0);
    expect(res.projection.expectedDeficitDate).toBeDefined();
  });
});

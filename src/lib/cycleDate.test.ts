import { describe, it, expect } from 'vitest';
import { getCycleRange, isDateInCycle } from './cycleDate';

describe('cycleDate utility', () => {
  it('handles default calendar month (cycleDay = 1)', () => {
    const ref = new Date(2026, 9, 15); // Oct 15, 2026
    const range = getCycleRange(ref, 1);

    expect(range.cycleDay).toBe(1);
    expect(range.startDate.getFullYear()).toBe(2026);
    expect(range.startDate.getMonth()).toBe(9); // Oct
    expect(range.startDate.getDate()).toBe(1);
    expect(range.endDate.getDate()).toBe(31);
    expect(range.totalCycleDays).toBe(31);
    expect(range.daysElapsed).toBe(15);
    expect(range.daysRemaining).toBe(17);
    expect(range.label).toBe('October 2026');

    expect(isDateInCycle(new Date(2026, 9, 1), 1, ref)).toBe(true);
    expect(isDateInCycle(new Date(2026, 9, 31), 1, ref)).toBe(true);
    expect(isDateInCycle(new Date(2026, 8, 30), 1, ref)).toBe(false);
    expect(isDateInCycle(new Date(2026, 10, 1), 1, ref)).toBe(false);
  });

  it('handles custom payday cycle (e.g. 25th) when reference date is before the 25th', () => {
    const ref = new Date(2026, 9, 6); // Oct 6, 2026 (day < 25)
    const range = getCycleRange(ref, 25);

    expect(range.cycleDay).toBe(25);
    expect(range.startDate.getMonth()).toBe(8); // September
    expect(range.startDate.getDate()).toBe(25);
    expect(range.endDate.getMonth()).toBe(9); // October
    expect(range.endDate.getDate()).toBe(24);
    expect(range.label).toBe('Sep 25 – Oct 24');

    // Sep 25 to Sep 30 is 6 days, plus 6 days of Oct = 12 days elapsed
    expect(range.daysElapsed).toBe(12);

    expect(isDateInCycle(new Date(2026, 8, 25), 25, ref)).toBe(true); // Sep 25
    expect(isDateInCycle(new Date(2026, 9, 24), 25, ref)).toBe(true); // Oct 24
    expect(isDateInCycle(new Date(2026, 8, 24), 25, ref)).toBe(false); // Sep 24
    expect(isDateInCycle(new Date(2026, 9, 25), 25, ref)).toBe(false); // Oct 25 (next cycle)
  });

  it('handles custom payday cycle (e.g. 25th) when reference date is on or after the 25th', () => {
    const ref = new Date(2026, 9, 25); // Oct 25, 2026 (day == 25)
    const range = getCycleRange(ref, 25);

    expect(range.startDate.getMonth()).toBe(9); // October
    expect(range.startDate.getDate()).toBe(25);
    expect(range.endDate.getMonth()).toBe(10); // November
    expect(range.endDate.getDate()).toBe(24);
    expect(range.label).toBe('Oct 25 – Nov 24');
    expect(range.daysElapsed).toBe(1);

    expect(isDateInCycle(new Date(2026, 9, 25), 25, ref)).toBe(true);
    expect(isDateInCycle(new Date(2026, 10, 24), 25, ref)).toBe(true);
  });

  it('gracefully clamps high cycle day on February and shorter months without throwing', () => {
    const febDate = new Date(2024, 1, 10); // Feb 10, 2024 (leap year)
    const range = getCycleRange(febDate, 31);
    expect(range.startDate).toBeInstanceOf(Date);
    expect(range.endDate).toBeInstanceOf(Date);
    expect(range.totalCycleDays).toBeGreaterThan(0);
  });
});

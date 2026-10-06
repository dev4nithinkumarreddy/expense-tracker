import { format, differenceInCalendarDays } from 'date-fns';

export interface CycleRange {
  startDate: Date;
  endDate: Date;
  cycleDay: number;
  label: string;
  daysElapsed: number;
  daysRemaining: number;
  totalCycleDays: number;
}

/**
 * Calculates the salary / budget cycle date range based on referenceDate and salaryCycleDay.
 * If cycleDay === 1, it matches the standard calendar month (1st to last day of month).
 * If cycleDay > 1 (e.g. 25th), it calculates the active period (e.g. Sep 25 – Oct 24 for Oct 6).
 */
export function getCycleRange(referenceDate: Date = new Date(), cycleDay: number = 1): CycleRange {
  const safeCycleDay = Math.max(1, Math.min(31, Math.floor(cycleDay || 1)));
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  let startDate: Date;
  let endDate: Date;
  let label: string;

  if (safeCycleDay === 1) {
    startDate = new Date(refYear, refMonth, 1, 0, 0, 0, 0);
    const lastDayOfMonth = new Date(refYear, refMonth + 1, 0).getDate();
    endDate = new Date(refYear, refMonth, lastDayOfMonth, 23, 59, 59, 999);
    label = format(startDate, 'MMMM yyyy');
  } else {
    if (refDay >= safeCycleDay) {
      // Cycle started this month on safeCycleDay, ends next month on safeCycleDay - 1
      const startMaxDays = new Date(refYear, refMonth + 1, 0).getDate();
      const actualStartDay = Math.min(safeCycleDay, startMaxDays);
      startDate = new Date(refYear, refMonth, actualStartDay, 0, 0, 0, 0);

      const nextMonthMaxDays = new Date(refYear, refMonth + 2, 0).getDate();
      const nextCycleStartDay = Math.min(safeCycleDay, nextMonthMaxDays);
      const actualEndDay = nextCycleStartDay - 1;
      endDate = new Date(refYear, refMonth + 1, actualEndDay, 23, 59, 59, 999);
    } else {
      // Cycle started last month on safeCycleDay, ends this month on safeCycleDay - 1
      const prevMonthMaxDays = new Date(refYear, refMonth, 0).getDate();
      const actualStartDay = Math.min(safeCycleDay, prevMonthMaxDays);
      startDate = new Date(refYear, refMonth - 1, actualStartDay, 0, 0, 0, 0);

      const currentMonthMaxDays = new Date(refYear, refMonth + 1, 0).getDate();
      const currentCycleStartDay = Math.min(safeCycleDay, currentMonthMaxDays);
      const actualEndDay = currentCycleStartDay - 1;
      endDate = new Date(refYear, refMonth, actualEndDay, 23, 59, 59, 999);
    }
    label = `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`;
  }

  const totalCycleDays = differenceInCalendarDays(endDate, startDate) + 1;
  const elapsedRaw = differenceInCalendarDays(referenceDate, startDate) + 1;
  const daysElapsed = Math.max(1, Math.min(totalCycleDays, elapsedRaw));
  const daysRemaining = Math.max(1, totalCycleDays - daysElapsed + 1);

  return {
    startDate,
    endDate,
    cycleDay: safeCycleDay,
    label,
    daysElapsed,
    daysRemaining,
    totalCycleDays,
  };
}

/**
 * Checks whether a given target date falls within the cycle range of referenceDate.
 */
export function isDateInCycle(targetDate: Date, cycleDay: number = 1, referenceDate: Date = new Date()): boolean {
  if (isNaN(targetDate.getTime())) return false;
  const range = getCycleRange(referenceDate, cycleDay);
  return targetDate >= range.startDate && targetDate <= range.endDate;
}

import { format, parseISO, subDays } from 'date-fns';

export interface ExpenseLike {
  date: string;
}

/**
 * Normalizes an expense date string into a local YYYY-MM-DD date representation.
 */
export function getExpenseLocalDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parsed = parseISO(dateStr);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
  } catch {
    // fallback to splitting on 'T' if parseISO encounters unexpected format
  }
  return dateStr.split('T')[0] || '';
}

/**
 * Calculates the current consecutive daily logging streak from an array of expenses.
 * 
 * Rules:
 * - If user logged today, today is included and we count consecutive past days.
 * - If user hasn't logged today yet, but logged yesterday, yesterday's streak is preserved as active.
 * - If neither today nor yesterday has a log, streak is 0.
 * - Multiple logs on the same day count as 1 day.
 */
export function calculateStreak(expenses: ExpenseLike[], referenceDate: Date = new Date()): number {
  if (!expenses || expenses.length === 0) {
    return 0;
  }

  const loggedDates = new Set<string>();
  for (const expense of expenses) {
    if (!expense || !expense.date) continue;
    const dateStr = getExpenseLocalDate(expense.date);
    if (dateStr) {
      loggedDates.add(dateStr);
    }
  }

  if (loggedDates.size === 0) {
    return 0;
  }

  const todayStr = format(referenceDate, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(referenceDate, 1), 'yyyy-MM-dd');

  let checkDate: Date;
  let streak = 0;

  if (loggedDates.has(todayStr)) {
    streak = 1;
    checkDate = subDays(referenceDate, 1);
  } else if (loggedDates.has(yesterdayStr)) {
    // Has not logged today yet, but yesterday's streak is still active
    streak = 1;
    checkDate = subDays(referenceDate, 2);
  } else {
    // Missed both today and yesterday
    return 0;
  }

  while (true) {
    const checkStr = format(checkDate, 'yyyy-MM-dd');
    if (loggedDates.has(checkStr)) {
      streak += 1;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  return streak;
}

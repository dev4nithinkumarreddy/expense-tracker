import type { Bill, Subscription, Expense } from '../store/useExpenseStore';
import { isThisMonth, parseISO } from 'date-fns';

export interface CashflowSummary {
  totalBudget: number;
  totalExpenses: number;
  dueBillsAmount: number;
  dueSubsAmount: number;
  availableBalance: number;
  upcomingObligationsTotal: number;
  dueBills: Bill[];
  upcomingBills: Bill[];
  dueSubscriptions: Subscription[];
  upcomingSubscriptions: Subscription[];
}

/**
 * Calculates current available balance and upcoming obligations
 * Only bills and subscriptions on or past their due date are deducted from current available balance.
 */
export function calculateCashflowSummary(
  monthlyIncome: number,
  expenses: Expense[],
  bills: Bill[],
  subscriptions: Subscription[] = [],
  referenceDate: Date = new Date()
): CashflowSummary {
  const currentDay = referenceDate.getDate();

  // Current month non-income expenses and extra income
  const currentMonthRecords = expenses.filter(e => {
    try {
      return isThisMonth(parseISO(e.date));
    } catch {
      return false;
    }
  });

  const extraIncome = currentMonthRecords
    .filter(e => e.category === 'Income')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalExpenses = currentMonthRecords
    .filter(e => e.category !== 'Income' && e.category !== 'Transfer')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalBudget = (Number(monthlyIncome) || 0) + extraIncome;

  // Bills: Due on or before today vs Due in the future
  const dueBills: Bill[] = [];
  const upcomingBills: Bill[] = [];

  bills.forEach(bill => {
    const dueDay = bill.due_day ?? (bill.due_date ? new Date(bill.due_date).getDate() : 1);
    if (currentDay >= dueDay) {
      dueBills.push(bill);
    } else {
      upcomingBills.push(bill);
    }
  });

  // Subscriptions: Due on or before today vs Due in the future (within current month)
  const dueSubscriptions: Subscription[] = [];
  const upcomingSubscriptions: Subscription[] = [];

  subscriptions.forEach(sub => {
    if (!sub.next_billing_date) return;
    try {
      const subDate = new Date(sub.next_billing_date);
      if (isThisMonth(subDate)) {
        if (referenceDate >= subDate) {
          dueSubscriptions.push(sub);
        } else {
          upcomingSubscriptions.push(sub);
        }
      }
    } catch {
      // ignore invalid dates
    }
  });

  const dueBillsAmount = dueBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const dueSubsAmount = dueSubscriptions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const upcomingObligationsTotal = 
    upcomingBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) +
    upcomingSubscriptions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Available balance right now:
  // Base budget minus expenses already logged minus due bills/subs that have arrived
  const availableBalance = totalBudget - totalExpenses - dueBillsAmount - dueSubsAmount;

  return {
    totalBudget,
    totalExpenses,
    dueBillsAmount,
    dueSubsAmount,
    availableBalance,
    upcomingObligationsTotal,
    dueBills,
    upcomingBills,
    dueSubscriptions,
    upcomingSubscriptions
  };
}

/**
 * Returns human-readable due status for a bill
 */
export function getBillDueStatus(bill: Bill, today: Date = new Date()): {
  isDue: boolean;
  isToday: boolean;
  daysRemaining: number;
  label: string;
  badgeColor: 'emerald' | 'amber' | 'muted';
} {
  const currentDay = today.getDate();
  const dueDay = bill.due_day ?? (bill.due_date ? new Date(bill.due_date).getDate() : 1);

  if (currentDay === dueDay) {
    return {
      isDue: true,
      isToday: true,
      daysRemaining: 0,
      label: 'Due Today (Deducted)',
      badgeColor: 'emerald'
    };
  }

  if (currentDay > dueDay) {
    return {
      isDue: true,
      isToday: false,
      daysRemaining: 0,
      label: `Deducted on ${dueDay}${getOrdinalSuffix(dueDay)}`,
      badgeColor: 'muted'
    };
  }

  const daysRemaining = dueDay - currentDay;
  return {
    isDue: false,
    isToday: false,
    daysRemaining,
    label: `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${dueDay}${getOrdinalSuffix(dueDay)})`,
    badgeColor: daysRemaining <= 3 ? 'amber' : 'muted'
  };
}

/**
 * Returns human-readable due status for a subscription
 */
export function getSubscriptionDueStatus(sub: Subscription, today: Date = new Date()): {
  isDue: boolean;
  isToday: boolean;
  daysRemaining: number;
  label: string;
  badgeColor: 'emerald' | 'amber' | 'muted';
} {
  if (!sub.next_billing_date) {
    return {
      isDue: false,
      isToday: false,
      daysRemaining: 0,
      label: 'Recurring',
      badgeColor: 'muted'
    };
  }

  try {
    const subDate = new Date(sub.next_billing_date);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const subMidnight = new Date(subDate.getFullYear(), subDate.getMonth(), subDate.getDate());

    const diffDays = Math.round((subMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return {
        isDue: true,
        isToday: true,
        daysRemaining: 0,
        label: 'Due Today (Deducted)',
        badgeColor: 'emerald'
      };
    }

    if (diffDays < 0) {
      return {
        isDue: true,
        isToday: false,
        daysRemaining: 0,
        label: 'Deducted for this cycle',
        badgeColor: 'muted'
      };
    }

    return {
      isDue: false,
      isToday: false,
      daysRemaining: diffDays,
      label: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
      badgeColor: diffDays <= 3 ? 'amber' : 'muted'
    };
  } catch {
    return {
      isDue: false,
      isToday: false,
      daysRemaining: 0,
      label: 'Scheduled',
      badgeColor: 'muted'
    };
  }
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

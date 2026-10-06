import type { Bill, Subscription, Expense } from '../store/useExpenseStore';
import { isSameMonth, parseISO } from 'date-fns';
import { isIncomeCategory } from './categoryStyles';
import { generateDeterministicUUID } from './utils';

export interface CashflowSummary {
  totalBudget: number;
  totalExpenses: number;
  dueBillsAmount: number;
  dueSubsAmount: number;
  paidObligationsTotal: number;
  availableBalance: number;
  upcomingObligationsTotal: number;
  dueBills: Bill[];
  paidBills: Bill[];
  upcomingBills: Bill[];
  dueSubscriptions: Subscription[];
  paidSubscriptions: Subscription[];
  upcomingSubscriptions: Subscription[];
}

/**
 * Checks if a bill has already been logged as an expense (paid or auto-deducted) this month
 */
export function isBillPaidThisMonth(
  bill: Bill,
  currentMonthExpenses: Expense[],
  referenceDate: Date = new Date()
): boolean {
  const currentMonth = referenceDate.toISOString().slice(0, 7);
  const expectedAutoDeductId = generateDeterministicUUID('auto_deduct', `${bill.id}:${currentMonth}`);
  const billTitleNorm = bill.title.trim().toLowerCase();

  return currentMonthExpenses.some(e => {
    // 1. Matched by deterministic auto-deduct UUID
    if (e.id === expectedAutoDeductId) return true;

    // 2. Matched by bill id stored in notes
    if (e.notes && e.notes.includes(bill.id)) return true;

    // 3. Matched by common title variations in description
    const descNorm = (e.description || '').trim().toLowerCase();
    if (
      descNorm === `auto-deduct: ${billTitleNorm}` ||
      descNorm === `manual payment: ${billTitleNorm}` ||
      descNorm === `bill payment: ${billTitleNorm}` ||
      descNorm === billTitleNorm
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Checks if a subscription has already been logged as an expense this month
 */
export function isSubscriptionPaidThisMonth(
  sub: Subscription,
  currentMonthExpenses: Expense[],
  referenceDate: Date = new Date()
): boolean {
  const currentMonth = referenceDate.toISOString().slice(0, 7);
  const expectedAutoDeductId = generateDeterministicUUID('auto_deduct_sub', `${sub.id}:${currentMonth}`);
  const subNameNorm = sub.name.trim().toLowerCase();

  return currentMonthExpenses.some(e => {
    // 1. Matched by deterministic UUID
    if (e.id === expectedAutoDeductId) return true;

    // 2. Matched by sub id stored in notes
    if (e.notes && e.notes.includes(sub.id)) return true;

    // 3. Matched by description
    const descNorm = (e.description || '').trim().toLowerCase();
    if (
      descNorm === `${subNameNorm} subscription` ||
      descNorm === `subscription: ${subNameNorm}` ||
      descNorm === `auto-deduct: ${subNameNorm}` ||
      descNorm === `manual payment: ${subNameNorm}` ||
      descNorm === subNameNorm
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Calculates current available balance and upcoming obligations
 * 
 * Rules:
 * 1. Base budget = monthlyIncome + any logged income this month
 * 2. Total expenses = all logged expenses this month (excluding income/transfers)
 * 3. Bills that are already paid/auto-deducted are in totalExpenses and MUST NOT be counted in dueBillsAmount!
 * 4. Due bills = recurring monthly bills on or past their due date that have NOT yet been paid/logged
 * 5. Due subscriptions = active subscriptions on or past billing date that have NOT yet been paid/logged
 * 6. Available balance = totalBudget - totalExpenses - dueBillsAmount - dueSubsAmount
 * 7. Upcoming obligations = bills/subs due in the future (after today, this month) and unpaid
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
      return isSameMonth(parseISO(e.date), referenceDate);
    } catch {
      return false;
    }
  });

  const extraIncome = currentMonthRecords
    .filter(e => isIncomeCategory(e.category))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalExpenses = currentMonthRecords
    .filter(e => !isIncomeCategory(e.category) && e.category !== 'Transfer')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalBudget = (Number(monthlyIncome) || 0) + extraIncome;

  // Bills: Categorized into Paid, Due (Unpaid), and Upcoming
  const paidBills: Bill[] = [];
  const dueBills: Bill[] = [];
  const upcomingBills: Bill[] = [];

  bills.forEach(bill => {
    const isPaid = isBillPaidThisMonth(bill, currentMonthRecords, referenceDate);
    if (isPaid) {
      paidBills.push(bill);
    } else {
      const dueDay = bill.due_day ?? (bill.due_date ? new Date(bill.due_date).getDate() : 1);
      if (currentDay >= dueDay) {
        dueBills.push(bill);
      } else {
        upcomingBills.push(bill);
      }
    }
  });

  // Subscriptions: Categorized into Paid, Due (Unpaid), and Upcoming
  const paidSubscriptions: Subscription[] = [];
  const dueSubscriptions: Subscription[] = [];
  const upcomingSubscriptions: Subscription[] = [];

  subscriptions.forEach(sub => {
    if (!sub.next_billing_date) return;
    try {
      const isPaid = isSubscriptionPaidThisMonth(sub, currentMonthRecords, referenceDate);
      if (isPaid) {
        paidSubscriptions.push(sub);
      } else {
        const subDate = new Date(sub.next_billing_date);
        if (isSameMonth(subDate, referenceDate)) {
          if (referenceDate >= subDate) {
            dueSubscriptions.push(sub);
          } else {
            upcomingSubscriptions.push(sub);
          }
        }
      }
    } catch {
      // ignore invalid dates
    }
  });

  // Only UNPAID due bills/subs count toward due amounts
  const dueBillsAmount = dueBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const dueSubsAmount = dueSubscriptions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Paid obligations sum (bills & subscriptions that have already been deducted/paid this month)
  const paidObligationsTotal = 
    paidBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) +
    paidSubscriptions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Upcoming obligations sum (unpaid bills & subs due in future days this month)
  const upcomingObligationsTotal = 
    upcomingBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) +
    upcomingSubscriptions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Available balance right now:
  // Base budget minus expenses already logged (which includes paid bills) minus unpaid due bills/subs
  const availableBalance = totalBudget - totalExpenses - dueBillsAmount - dueSubsAmount;

  return {
    totalBudget,
    totalExpenses,
    dueBillsAmount,
    dueSubsAmount,
    paidObligationsTotal,
    availableBalance,
    upcomingObligationsTotal,
    dueBills,
    paidBills,
    upcomingBills,
    dueSubscriptions,
    paidSubscriptions,
    upcomingSubscriptions
  };
}

/**
 * Returns human-readable due status for a bill
 */
export function getBillDueStatus(
  bill: Bill, 
  today: Date = new Date(),
  isPaid: boolean = false
): {
  isDue: boolean;
  isToday: boolean;
  isPaid: boolean;
  daysRemaining: number;
  label: string;
  badgeColor: 'emerald' | 'amber' | 'muted';
} {
  const currentDay = today.getDate();
  const dueDay = bill.due_day ?? (bill.due_date ? new Date(bill.due_date).getDate() : 1);

  if (isPaid) {
    return {
      isDue: false,
      isToday: currentDay === dueDay,
      isPaid: true,
      daysRemaining: 0,
      label: currentDay === dueDay ? 'Deducted Today' : `Deducted on ${dueDay}${getOrdinalSuffix(dueDay)}`,
      badgeColor: 'emerald'
    };
  }

  if (currentDay === dueDay) {
    return {
      isDue: true,
      isToday: true,
      isPaid: false,
      daysRemaining: 0,
      label: 'Due Today',
      badgeColor: 'amber'
    };
  }

  if (currentDay > dueDay) {
    return {
      isDue: true,
      isToday: false,
      isPaid: false,
      daysRemaining: 0,
      label: `Overdue (${dueDay}${getOrdinalSuffix(dueDay)})`,
      badgeColor: 'amber'
    };
  }

  const daysRemaining = dueDay - currentDay;
  return {
    isDue: false,
    isToday: false,
    isPaid: false,
    daysRemaining,
    label: `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${dueDay}${getOrdinalSuffix(dueDay)})`,
    badgeColor: daysRemaining <= 3 ? 'amber' : 'muted'
  };
}

/**
 * Returns human-readable due status for a subscription
 */
export function getSubscriptionDueStatus(
  sub: Subscription, 
  today: Date = new Date(),
  isPaid: boolean = false
): {
  isDue: boolean;
  isToday: boolean;
  isPaid: boolean;
  daysRemaining: number;
  label: string;
  badgeColor: 'emerald' | 'amber' | 'muted';
} {
  if (isPaid) {
    return {
      isDue: false,
      isToday: false,
      isPaid: true,
      daysRemaining: 0,
      label: 'Paid for this cycle',
      badgeColor: 'emerald'
    };
  }

  if (!sub.next_billing_date) {
    return {
      isDue: false,
      isToday: false,
      isPaid: false,
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
        isPaid: false,
        daysRemaining: 0,
        label: 'Due Today',
        badgeColor: 'amber'
      };
    }

    if (diffDays < 0) {
      return {
        isDue: true,
        isToday: false,
        isPaid: false,
        daysRemaining: 0,
        label: 'Overdue for this cycle',
        badgeColor: 'amber'
      };
    }

    return {
      isDue: false,
      isToday: false,
      isPaid: false,
      daysRemaining: diffDays,
      label: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
      badgeColor: diffDays <= 3 ? 'amber' : 'muted'
    };
  } catch {
    return {
      isDue: false,
      isToday: false,
      isPaid: false,
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

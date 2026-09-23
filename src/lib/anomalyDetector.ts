import type { Expense, Subscription, Bill } from '../store/types';

export interface FinancialAnomaly {
  id: string;
  type: 'price_hike' | 'spike' | 'ghost_subscription';
  title: string;
  description: string;
  severity: 'warning' | 'info';
  amount?: number;
  expectedAmount?: number;
}

/**
 * Scans bills, subscriptions, and recent expenses for spending anomalies
 */
export function detectAnomalies(
  expenses: Expense[],
  subscriptions: Subscription[],
  bills: Bill[]
): FinancialAnomaly[] {
  const anomalies: FinancialAnomaly[] = [];

  // 1. Detect Category Outliers / Spikes (single expense > 3x category average)
  const categoryTotals: Record<string, { sum: number; count: number }> = {};
  expenses.forEach((e) => {
    if (e.category !== 'Income' && e.amount > 0) {
      if (!categoryTotals[e.category]) {
        categoryTotals[e.category] = { sum: 0, count: 0 };
      }
      categoryTotals[e.category].sum += e.amount;
      categoryTotals[e.category].count += 1;
    }
  });

  const recentExpenses = expenses.slice(-15);
  for (const e of recentExpenses) {
    const stat = categoryTotals[e.category];
    if (stat && stat.count >= 4) {
      const avg = stat.sum / stat.count;
      if (e.amount >= avg * 2.8 && e.amount > 500) {
        anomalies.push({
          id: `spike-${e.id}`,
          type: 'spike',
          title: `Unusual spend in ${e.category}`,
          description: `"${e.description}" (${e.amount}) is nearly 3x your typical ${e.category} average (${Math.round(avg)}).`,
          severity: 'warning',
          amount: e.amount,
          expectedAmount: Math.round(avg),
        });
        break; // Only flag one spike at a time
      }
    }
  }

  // 2. Detect Subscription Price Hikes vs Logged Expenses
  subscriptions.forEach((sub) => {
    const matchingExpenses = expenses
      .filter((e) => e.description.toLowerCase().includes(sub.name.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (matchingExpenses.length > 0) {
      const latest = matchingExpenses[0];
      if (latest.amount > sub.amount * 1.08) {
        anomalies.push({
          id: `hike-${sub.id}`,
          type: 'price_hike',
          title: `${sub.name} price increased`,
          description: `Recent charge was ${latest.amount}, higher than your budgeted ${sub.amount}.`,
          severity: 'warning',
          amount: latest.amount,
          expectedAmount: sub.amount,
        });
      }
    }
  });

  // 3. Detect Recurring Bill Spikes vs Budgeted Amount
  bills.forEach((b) => {
    const matchingExpenses = expenses
      .filter((e) => e.description.toLowerCase().includes(b.title.toLowerCase()))
      .sort((a, bExp) => new Date(bExp.date).getTime() - new Date(a.date).getTime());

    if (matchingExpenses.length > 0) {
      const latest = matchingExpenses[0];
      if (latest.amount > b.amount * 1.15) {
        anomalies.push({
          id: `bill-hike-${b.id}`,
          type: 'price_hike',
          title: `${b.title} bill spiked`,
          description: `Recent bill payment was ${latest.amount}, higher than your budgeted ${b.amount}.`,
          severity: 'warning',
          amount: latest.amount,
          expectedAmount: b.amount,
        });
      }
    }
  });

  // 4. Ghost Subscription Detector (Sub active, but no expense in 60+ days)
  const now = new Date().getTime();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

  subscriptions.forEach((sub) => {
    const matchingExpenses = expenses.filter((e) =>
      e.description.toLowerCase().includes(sub.name.toLowerCase())
    );

    if (matchingExpenses.length === 0 && sub.amount > 0) {
      anomalies.push({
        id: `ghost-${sub.id}`,
        type: 'ghost_subscription',
        title: `Unused subscription: ${sub.name}`,
        description: `No payments logged for ${sub.name}. Check if you still use this service.`,
        severity: 'info',
        amount: sub.amount,
      });
    } else if (matchingExpenses.length > 0) {
      const latestDate = Math.max(...matchingExpenses.map((e) => new Date(e.date).getTime()));
      if (now - latestDate > sixtyDaysMs) {
        anomalies.push({
          id: `ghost-${sub.id}`,
          type: 'ghost_subscription',
          title: `Dormant subscription: ${sub.name}`,
          description: `No payments recorded in 60+ days for ${sub.name}. Consider canceling if inactive.`,
          severity: 'info',
          amount: sub.amount,
        });
      }
    }
  });

  return anomalies;
}

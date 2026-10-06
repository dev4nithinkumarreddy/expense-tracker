import type { Expense, Subscription, Bill } from '../store/types';
import { differenceInCalendarDays, parseISO, addDays, formatISO } from 'date-fns';

export interface DetectedRecurringCandidate {
  id: string;
  name: string;
  amount: number;
  category: string;
  intervalDays: number;
  occurrenceCount: number;
  lastDate: string;
  estimatedNextDate: string;
}

/**
 * Normalizes merchant names by trimming, converting to title case, and removing transaction noise words
 */
export function normalizeMerchant(raw: string): string {
  if (!raw) return '';
  let cleaned = raw
    .toLowerCase()
    .replace(/\b(subscription|autopay|auto-debit|payment|recharge|monthly|renewal|online|bill|sub|pos)\b/gi, ' ')
    .replace(/\b(upi-|to:)/gi, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (!cleaned) cleaned = raw.trim();
  return cleaned
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Scans expense history to detect recurring payments not yet tracked in Bills or Subscriptions.
 */
export function detectUnplannedSubscriptions(
  expenses: Expense[],
  bills: Bill[] = [],
  subscriptions: Subscription[] = []
): DetectedRecurringCandidate[] {
  // Existing tracked names (lowercase)
  const trackedNames = new Set<string>([
    ...bills.map(b => b.title.trim().toLowerCase()),
    ...subscriptions.map(s => s.name.trim().toLowerCase()),
  ]);

  // Group valid non-transfer/income expenses by normalized merchant name
  const groups: Record<string, Expense[]> = {};
  for (const exp of expenses) {
    if (exp.category === 'Transfer' || exp.category === 'Income' || exp.amount <= 0) continue;
    const norm = normalizeMerchant(exp.description);
    if (!norm || norm.length < 2) continue;

    const normKey = norm.toLowerCase();
    // Check if already tracked
    const isAlreadyTracked = Array.from(trackedNames).some(t =>
      t.includes(normKey) || normKey.includes(t)
    );
    if (isAlreadyTracked) continue;

    if (!groups[normKey]) groups[normKey] = [];
    groups[normKey].push(exp);
  }

  const candidates: DetectedRecurringCandidate[] = [];

  for (const items of Object.values(groups)) {
    if (items.length < 2) continue;

    // Sort ascending by date
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group items with similar amount (within 5% or exact same)
    const amountBuckets: Expense[][] = [];
    for (const item of items) {
      const bucket = amountBuckets.find(b => {
        const representative = b[0].amount;
        return Math.abs(representative - item.amount) <= Math.max(10, representative * 0.05);
      });
      if (bucket) {
        bucket.push(item);
      } else {
        amountBuckets.push([item]);
      }
    }

    for (const bucket of amountBuckets) {
      if (bucket.length < 2) continue;

      // Check date intervals between consecutive occurrences
      let validIntervals = 0;
      let totalIntervalDays = 0;

      for (let i = 1; i < bucket.length; i++) {
        const prev = parseISO(bucket[i - 1].date);
        const curr = parseISO(bucket[i].date);
        const diffDays = Math.abs(differenceInCalendarDays(curr, prev));

        // Monthly (20 to 45 days) or Weekly (6 to 9 days)
        if ((diffDays >= 20 && diffDays <= 45) || (diffDays >= 6 && diffDays <= 9)) {
          validIntervals++;
          totalIntervalDays += diffDays;
        }
      }

      if (validIntervals >= 1) {
        const avgInterval = Math.round(totalIntervalDays / validIntervals);
        const latest = bucket[bucket.length - 1];
        const nextEstimated = addDays(parseISO(latest.date), avgInterval);

        candidates.push({
          id: `rec-${latest.id}`,
          name: normalizeMerchant(latest.description),
          amount: latest.amount,
          category: latest.category || 'Bills',
          intervalDays: avgInterval,
          occurrenceCount: bucket.length,
          lastDate: latest.date,
          estimatedNextDate: formatISO(nextEstimated, { representation: 'date' }),
        });
        break; // Only 1 candidate per merchant group
      }
    }
  }

  return candidates;
}

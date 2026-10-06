import { describe, it, expect } from 'vitest';
import { detectUnplannedSubscriptions, normalizeMerchant } from './subscriptionDetector';
import type { Expense, Subscription } from '../store/types';

describe('subscriptionDetector', () => {
  it('normalizes merchant names by cleaning noise words', () => {
    expect(normalizeMerchant('Netflix monthly subscription')).toBe('Netflix');
    expect(normalizeMerchant('Airtel Broadband Bill Payment')).toBe('Airtel Broadband');
    expect(normalizeMerchant('Spotify POS')).toBe('Spotify');
  });

  it('detects recurring monthly expense candidates', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        amount: 649,
        description: 'Netflix subscription',
        category: 'Entertainment',
        date: '2026-08-05T10:00:00Z',
      },
      {
        id: '2',
        amount: 649,
        description: 'Netflix monthly',
        category: 'Entertainment',
        date: '2026-09-05T10:00:00Z',
      },
      {
        id: '3',
        amount: 150,
        description: 'Coffee',
        category: 'Food',
        date: '2026-09-06T10:00:00Z',
      },
    ];

    const detected = detectUnplannedSubscriptions(expenses, [], []);
    expect(detected).toHaveLength(1);
    expect(detected[0].name).toBe('Netflix');
    expect(detected[0].amount).toBe(649);
    expect(detected[0].occurrenceCount).toBe(2);
  });

  it('excludes recurring expenses that are already tracked in bills or subscriptions', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        amount: 649,
        description: 'Netflix',
        category: 'Entertainment',
        date: '2026-08-05T10:00:00Z',
      },
      {
        id: '2',
        amount: 649,
        description: 'Netflix',
        category: 'Entertainment',
        date: '2026-09-05T10:00:00Z',
      },
    ];

    const trackedSubs: Subscription[] = [
      {
        id: 'sub-1',
        name: 'Netflix',
        amount: 649,
        billing_cycle: 'monthly',
        next_billing_date: '2026-10-05',
        category: 'Entertainment',
      },
    ];

    const detected = detectUnplannedSubscriptions(expenses, [], trackedSubs);
    expect(detected).toHaveLength(0);
  });
});

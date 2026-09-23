import { describe, it, expect } from 'vitest';
import { detectAnomalies } from './anomalyDetector';
import type { Expense, Subscription } from '../store/types';

describe('detectAnomalies', () => {
  it('detects subscription price hikes', () => {
    const subscriptions: Subscription[] = [
      { id: 'sub-1', name: 'Netflix', amount: 499, billing_cycle: 'monthly', next_billing_date: '2026-10-01', category: 'Entertainment' }
    ];
    const expenses: Expense[] = [
      { id: 'exp-1', amount: 649, description: 'Netflix Subscription', category: 'Entertainment', date: '2026-09-20T00:00:00.000Z' }
    ];
    const anomalies = detectAnomalies(expenses, subscriptions, []);
    const hike = anomalies.find(a => a.type === 'price_hike');
    expect(hike).toBeDefined();
    expect(hike?.title).toContain('Netflix');
  });

  it('detects dormant/ghost subscriptions', () => {
    const subscriptions: Subscription[] = [
      { id: 'sub-2', name: 'Gym Membership', amount: 2000, billing_cycle: 'monthly', next_billing_date: '2026-10-01', category: 'Health' }
    ];
    const anomalies = detectAnomalies([], subscriptions, []);
    const ghost = anomalies.find(a => a.type === 'ghost_subscription');
    expect(ghost).toBeDefined();
    expect(ghost?.title).toContain('Gym Membership');
  });
});

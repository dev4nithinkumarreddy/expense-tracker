import { describe, it, expect } from 'vitest';
import { calculateCashflowSummary, getBillDueStatus, getSubscriptionDueStatus } from './cashflow';
import type { Bill, Subscription, Expense } from '../store/useExpenseStore';

describe('cashflow calculation', () => {
  const referenceDate = new Date(2026, 8, 15); // Sep 15, 2026

  const mockExpenses: Expense[] = [
    {
      id: 'exp-1',
      amount: 500,
      description: 'Groceries',
      category: 'Food',
      date: '2026-09-10T12:00:00Z'
    }
  ];

  const mockBills: Bill[] = [
    {
      id: 'bill-1',
      title: 'Electricity',
      amount: 1000,
      autoDeduct: true,
      category: 'Bills',
      due_day: 5 // Due on Sep 5 (Already Due on Sep 15)
    },
    {
      id: 'bill-2',
      title: 'Broadband Internet',
      amount: 800,
      autoDeduct: true,
      category: 'Bills',
      due_day: 25 // Due on Sep 25 (Upcoming, NOT due yet on Sep 15)
    }
  ];

  const mockSubs: Subscription[] = [
    {
      id: 'sub-1',
      name: 'Gym',
      amount: 1200,
      billing_cycle: 'monthly',
      next_billing_date: '2026-09-02T00:00:00Z', // Due in past
      category: 'Health'
    },
    {
      id: 'sub-2',
      name: 'Netflix',
      amount: 649,
      billing_cycle: 'monthly',
      next_billing_date: '2026-09-28T00:00:00Z', // Upcoming later this month
      category: 'Entertainment'
    }
  ];

  it('only deducts bills and subscriptions on or past their due date from available balance', () => {
    const summary = calculateCashflowSummary(
      50000, // Monthly income
      mockExpenses,
      mockBills,
      mockSubs,
      referenceDate
    );

    // Total Budget: 50,000
    // Expenses: 500
    // Due Bills (Electricity): 1,000
    // Due Subs (Gym): 1,200
    // Upcoming Bills (Broadband): 800
    // Upcoming Subs (Netflix): 649
    // Expected available balance = 50000 - 500 - 1000 - 1200 = 47300
    expect(summary.totalExpenses).toBe(500);
    expect(summary.dueBillsAmount).toBe(1000);
    expect(summary.dueSubsAmount).toBe(1200);
    expect(summary.availableBalance).toBe(47300);

    // Upcoming obligations: 800 + 649 = 1449
    expect(summary.upcomingObligationsTotal).toBe(1449);
    expect(summary.upcomingBills.length).toBe(1);
    expect(summary.upcomingBills[0].title).toBe('Broadband Internet');
    expect(summary.upcomingSubscriptions.length).toBe(1);
    expect(summary.upcomingSubscriptions[0].name).toBe('Netflix');
  });

  it('correctly reports human-readable due status for bills', () => {
    const pastBill = mockBills[0]; // due_day 5 on Sep 15
    const futureBill = mockBills[1]; // due_day 25 on Sep 15

    const pastStatus = getBillDueStatus(pastBill, referenceDate);
    expect(pastStatus.isDue).toBe(true);
    expect(pastStatus.label).toContain('Deducted on 5th');

    const futureStatus = getBillDueStatus(futureBill, referenceDate);
    expect(futureStatus.isDue).toBe(false);
    expect(futureStatus.daysRemaining).toBe(10);
    expect(futureStatus.label).toContain('Due in 10 days');
  });

  it('correctly reports due status for subscriptions', () => {
    const pastSub = mockSubs[0]; // Sep 2 on Sep 15
    const futureSub = mockSubs[1]; // Sep 28 on Sep 15

    const pastStatus = getSubscriptionDueStatus(pastSub, referenceDate);
    expect(pastStatus.isDue).toBe(true);

    const futureStatus = getSubscriptionDueStatus(futureSub, referenceDate);
    expect(futureStatus.isDue).toBe(false);
    expect(futureStatus.daysRemaining).toBe(13);
  });

  it('does NOT deduct Transfer transactions from available balance or count them in totalExpenses', () => {
    const expensesWithTransfer: Expense[] = [
      ...mockExpenses, // 500 Food
      {
        id: 'trans-1',
        amount: 2000,
        description: 'Transfer: Main Bank → Cash Wallet',
        category: 'Transfer',
        date: '2026-09-12T12:00:00Z',
        account_id: 'acc-bank-1',
        transfer_account_id: 'acc-cash-1',
      },
    ];

    const summary = calculateCashflowSummary(
      50000,
      expensesWithTransfer,
      mockBills,
      mockSubs,
      referenceDate
    );

    // Total expenses should remain 500 (Transfer excluded)
    expect(summary.totalExpenses).toBe(500);
    // Available balance should NOT be reduced by the 2000 transfer
    expect(summary.availableBalance).toBe(47300);
  });
});

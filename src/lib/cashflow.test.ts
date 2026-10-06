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

    const paidStatus = getBillDueStatus(pastBill, referenceDate, true);
    expect(paidStatus.isPaid).toBe(true);
    expect(paidStatus.label).toContain('Deducted on 5th');

    const unpaidPastStatus = getBillDueStatus(pastBill, referenceDate, false);
    expect(unpaidPastStatus.isDue).toBe(true);
    expect(unpaidPastStatus.label).toContain('Overdue (5th)');

    const futureStatus = getBillDueStatus(futureBill, referenceDate);
    expect(futureStatus.isDue).toBe(false);
    expect(futureStatus.daysRemaining).toBe(10);
    expect(futureStatus.label).toContain('Due in 10 days');
  });

  it('correctly reports due status for subscriptions', () => {
    const pastSub = mockSubs[0]; // Sep 2 on Sep 15
    const futureSub = mockSubs[1]; // Sep 28 on Sep 15

    const paidStatus = getSubscriptionDueStatus(pastSub, referenceDate, true);
    expect(paidStatus.isPaid).toBe(true);
    expect(paidStatus.label).toBe('Paid for this cycle');

    const unpaidPastStatus = getSubscriptionDueStatus(pastSub, referenceDate, false);
    expect(unpaidPastStatus.isDue).toBe(true);
    expect(unpaidPastStatus.label).toBe('Overdue for this cycle');

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

  it('NEVER double-deducts bills that have already been auto-deducted into expenses (User Scenario)', () => {
    const octDate = new Date(2026, 9, 6); // Oct 6, 2026
    const monthlyIncome = 15500;

    const userBills: Bill[] = [
      {
        id: 'bill-rent',
        title: 'Pg Rent',
        amount: 7000,
        autoDeduct: true,
        category: 'Bills',
        due_day: 6
      },
      {
        id: 'bill-emi',
        title: 'Emi',
        amount: 3500,
        autoDeduct: true,
        category: 'Bills',
        due_day: 2
      }
    ];

    // Expenses created by auto-deduct
    const userExpenses: Expense[] = [
      {
        id: 'auto-1',
        amount: 7000,
        description: 'Auto-deduct: Pg Rent',
        category: 'Bills',
        date: '2026-10-06T09:00:00Z'
      },
      {
        id: 'auto-2',
        amount: 3500,
        description: 'Auto-deduct: Emi',
        category: 'Bills',
        date: '2026-10-02T09:00:00Z'
      }
    ];

    const summary = calculateCashflowSummary(
      monthlyIncome,
      userExpenses,
      userBills,
      [],
      octDate
    );

    // Total Expenses should be 10,500 (7,000 + 3,500)
    expect(summary.totalExpenses).toBe(10500);

    // Because both bills are already paid/logged in expenses, dueBillsAmount MUST be 0, NOT 10,500!
    expect(summary.dueBillsAmount).toBe(0);
    expect(summary.paidBills.length).toBe(2);
    expect(summary.paidObligationsTotal).toBe(10500);

    // Available balance MUST be 5,000 (15,500 - 10,500), NEVER negative -5,500!
    expect(summary.availableBalance).toBe(5000);
  });

  it('excludes manually paid bills from dueBillsAmount and avoids double-deduction', () => {
    const octDate = new Date(2026, 9, 10);
    const bills: Bill[] = [
      {
        id: 'bill-wifi',
        title: 'Wifi',
        amount: 1000,
        autoDeduct: false,
        category: 'Bills',
        due_day: 5
      }
    ];

    // Case 1: Unpaid bill past due date
    const unpaidSummary = calculateCashflowSummary(20000, [], bills, [], octDate);
    expect(unpaidSummary.dueBillsAmount).toBe(1000);
    expect(unpaidSummary.availableBalance).toBe(19000);

    // Case 2: Once manually paid
    const paidExpenses: Expense[] = [
      {
        id: 'exp-manual-wifi',
        amount: 1000,
        description: 'Manual Payment: Wifi',
        category: 'Bills',
        date: '2026-10-05T10:00:00Z',
        notes: 'Bill payment for Wifi (ID: bill-wifi)'
      }
    ];

    const paidSummary = calculateCashflowSummary(20000, paidExpenses, bills, [], octDate);
    expect(paidSummary.totalExpenses).toBe(1000);
    expect(paidSummary.dueBillsAmount).toBe(0);
    expect(paidSummary.availableBalance).toBe(19000);
  });
});

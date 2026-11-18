import { describe, it, expect } from 'vitest';
import { calculateTripSummary, isTripActiveOnDate } from './tripCalculations';
import type { Trip, Expense, Debt } from '../store/types';

describe('tripCalculations', () => {
  const sampleTrip: Trip = {
    id: 'trip-goa',
    name: 'Goa Holiday',
    startDate: '2026-11-20',
    endDate: '2026-11-24', // 5 days
    budget: 20000,
    coverEmoji: '🏖️',
    status: 'active'
  };

  const sampleExpenses: Expense[] = [
    {
      id: 'e1',
      amount: 4000,
      description: 'Flight',
      category: 'Travel',
      date: '2026-11-20T08:00:00.000Z',
      trip_id: 'trip-goa'
    },
    {
      id: 'e2',
      amount: 6000,
      description: 'Resort Stay',
      category: 'Stay',
      date: '2026-11-20T12:00:00.000Z',
      trip_id: 'trip-goa'
    },
    {
      id: 'e3',
      amount: 2000,
      description: 'Dinner',
      category: 'Food',
      date: '2026-11-21T20:00:00.000Z',
      trip_id: 'trip-goa'
    },
    {
      id: 'e4',
      amount: 1500,
      description: 'Groceries at Home',
      category: 'Grocery',
      date: '2026-11-21T10:00:00.000Z',
      trip_id: null // Non-trip expense
    }
  ];

  const sampleDebts: Debt[] = [
    {
      id: 'd1',
      person_name: 'Rahul',
      amount: 1000,
      type: 'lent',
      status: 'pending',
      date: '2026-11-21',
      trip_id: 'trip-goa'
    },
    {
      id: 'd2',
      person_name: 'Sneha',
      amount: 500,
      type: 'borrowed',
      status: 'pending',
      date: '2026-11-21',
      trip_id: 'trip-goa'
    }
  ];

  it('calculates total spent, remaining budget, and percent', () => {
    // Reference date = Day 2 (Nov 21)
    const refDate = new Date('2026-11-21T12:00:00.000Z');
    const summary = calculateTripSummary(sampleTrip, sampleExpenses, sampleDebts, refDate);

    expect(summary.totalSpent).toBe(12000); // 4000 + 6000 + 2000
    expect(summary.budget).toBe(20000);
    expect(summary.remainingBudget).toBe(8000);
    expect(summary.percentSpent).toBe(60);
    expect(summary.budgetHealth).toBe('on_track');
    expect(summary.totalDays).toBe(5);
    expect(summary.currentDay).toBe(2);
    expect(summary.remainingDays).toBe(4); // Nov 21, 22, 23, 24
    expect(summary.dailyAllowanceRemaining).toBe(2000); // 8000 / 4
  });

  it('handles category breakdown accurately', () => {
    const refDate = new Date('2026-11-21T12:00:00.000Z');
    const summary = calculateTripSummary(sampleTrip, sampleExpenses, sampleDebts, refDate);

    expect(summary.categoryBreakdown.length).toBe(3);
    expect(summary.categoryBreakdown[0]).toEqual({
      category: 'Stay',
      amount: 6000,
      percentage: 50
    });
    expect(summary.categoryBreakdown[1]).toEqual({
      category: 'Travel',
      amount: 4000,
      percentage: 33
    });
    expect(summary.categoryBreakdown[2]).toEqual({
      category: 'Food',
      amount: 2000,
      percentage: 17
    });
  });

  it('handles group debts for the trip', () => {
    const summary = calculateTripSummary(sampleTrip, sampleExpenses, sampleDebts);
    expect(summary.totalToCollect).toBe(1000);
    expect(summary.totalToPay).toBe(500);
    expect(summary.tripDebts.length).toBe(2);
  });

  it('warns when budget is 80% or over', () => {
    const highExpenses: Expense[] = [
      {
        id: 'e1',
        amount: 18000,
        description: 'Luxury Villa',
        category: 'Stay',
        date: '2026-11-20T08:00:00.000Z',
        trip_id: 'trip-goa'
      }
    ];
    const summary = calculateTripSummary(sampleTrip, highExpenses);
    expect(summary.percentSpent).toBe(90);
    expect(summary.budgetHealth).toBe('warning');

    const overExpenses: Expense[] = [
      {
        id: 'e1',
        amount: 22000,
        description: 'Super Luxury',
        category: 'Stay',
        date: '2026-11-20T08:00:00.000Z',
        trip_id: 'trip-goa'
      }
    ];
    const overSummary = calculateTripSummary(sampleTrip, overExpenses);
    expect(overSummary.percentSpent).toBe(110);
    expect(overSummary.budgetHealth).toBe('over');
  });

  it('identifies if trip is active on a given date', () => {
    expect(isTripActiveOnDate(sampleTrip, '2026-11-21')).toBe(true);
    expect(isTripActiveOnDate(sampleTrip, '2026-11-10')).toBe(true); // because status is 'active'

    const upcomingTrip: Trip = { ...sampleTrip, status: 'upcoming' };
    expect(isTripActiveOnDate(upcomingTrip, '2026-11-19')).toBe(false);
    expect(isTripActiveOnDate(upcomingTrip, '2026-11-20')).toBe(true);
    expect(isTripActiveOnDate(upcomingTrip, '2026-11-25')).toBe(false);

    const completedTrip: Trip = { ...sampleTrip, status: 'completed' };
    expect(isTripActiveOnDate(completedTrip, '2026-11-21')).toBe(false);
  });
});

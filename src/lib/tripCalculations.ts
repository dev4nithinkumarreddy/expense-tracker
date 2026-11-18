import { parseISO, differenceInCalendarDays, isAfter, isBefore, startOfDay } from 'date-fns';
import type { Expense, Trip, Debt } from '../store/types';
import { isIncomeCategory } from './categoryStyles';

export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
}

export interface DaySpend {
  date: string;
  amount: number;
  dayIndex: number;
}

export interface TripSummary {
  totalSpent: number;
  budget: number;
  remainingBudget: number;
  percentSpent: number;
  budgetHealth: 'on_track' | 'warning' | 'over';
  totalDays: number;
  currentDay: number;
  remainingDays: number;
  dailyAverageSpent: number;
  dailyAllowanceRemaining: number;
  tripExpenses: Expense[];
  categoryBreakdown: CategorySpend[];
  dailySpendTimeline: DaySpend[];
  tripDebts: Debt[];
  totalToCollect: number;
  totalToPay: number;
}

export function calculateTripSummary(
  trip: Trip,
  expenses: Expense[],
  debts: Debt[] = [],
  referenceDate: Date = new Date()
): TripSummary {
  const tripExpenses = expenses
    .filter(
      (e) => e.trip_id === trip.id && !isIncomeCategory(e.category) && e.category !== 'Transfer'
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSpent = tripExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const budget = Number(trip.budget) || 0;
  const remainingBudget = budget - totalSpent;
  const percentSpent = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;

  let budgetHealth: 'on_track' | 'warning' | 'over' = 'on_track';
  if (totalSpent > budget && budget > 0) {
    budgetHealth = 'over';
  } else if (percentSpent >= 80) {
    budgetHealth = 'warning';
  }

  // Date and duration calculations
  const start = startOfDay(parseISO(trip.startDate));
  const end = startOfDay(parseISO(trip.endDate));
  const today = startOfDay(referenceDate);

  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);

  let currentDay = 0;
  let remainingDays = 0;

  if (isBefore(today, start)) {
    // Trip hasn't started yet
    currentDay = 0;
    remainingDays = totalDays;
  } else if (isAfter(today, end)) {
    // Trip has concluded
    currentDay = totalDays;
    remainingDays = 0;
  } else {
    // Currently on trip
    currentDay = differenceInCalendarDays(today, start) + 1;
    remainingDays = Math.max(1, differenceInCalendarDays(end, today) + 1);
  }

  const daysElapsedForAvg = Math.max(1, currentDay);
  const dailyAverageSpent = Math.round(totalSpent / daysElapsedForAvg);

  const dailyAllowanceRemaining =
    remainingDays > 0 ? Math.max(0, Math.round(remainingBudget / remainingDays)) : 0;

  // Category breakdown
  const catMap = new Map<string, number>();
  tripExpenses.forEach((e) => {
    const cat = e.category || 'Other';
    catMap.set(cat, (catMap.get(cat) || 0) + (Number(e.amount) || 0));
  });

  const categoryBreakdown: CategorySpend[] = Array.from(catMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Daily spend timeline
  const dailyMap = new Map<string, number>();
  tripExpenses.forEach((e) => {
    const dStr = e.date.split('T')[0];
    dailyMap.set(dStr, (dailyMap.get(dStr) || 0) + (Number(e.amount) || 0));
  });

  const dailySpendTimeline: DaySpend[] = [];
  for (let i = 0; i < totalDays; i++) {
    const curDate = new Date(start);
    curDate.setDate(curDate.getDate() + i);
    const dStr = curDate.toISOString().split('T')[0];
    dailySpendTimeline.push({
      date: dStr,
      amount: dailyMap.get(dStr) || 0,
      dayIndex: i + 1
    });
  }

  // Debts and group splits
  const tripDebts = debts.filter((d) => d.trip_id === trip.id);
  const totalToCollect = tripDebts
    .filter((d) => d.type === 'lent' && d.status === 'pending')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalToPay = tripDebts
    .filter((d) => d.type === 'borrowed' && d.status === 'pending')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  return {
    totalSpent,
    budget,
    remainingBudget,
    percentSpent,
    budgetHealth,
    totalDays,
    currentDay,
    remainingDays,
    dailyAverageSpent,
    dailyAllowanceRemaining,
    tripExpenses,
    categoryBreakdown,
    dailySpendTimeline,
    tripDebts,
    totalToCollect,
    totalToPay
  };
}

export function isTripActiveOnDate(trip: Trip, dateStr: string = new Date().toISOString().split('T')[0]): boolean {
  if (trip.status === 'completed') return false;
  if (trip.status === 'active') return true;
  return dateStr >= trip.startDate && dateStr <= trip.endDate;
}

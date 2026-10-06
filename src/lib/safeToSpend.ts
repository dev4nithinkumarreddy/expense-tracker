import { getCycleRange } from './cycleDate';
import { addDays, format } from 'date-fns';

export interface ProjectionMetrics {
  projectedSpend: number;
  projectedSurplus: number; // positive = surplus, negative = deficit
  projectedStatus: 'surplus' | 'balanced' | 'deficit';
  avgDailyPace: number;
  expectedDeficitDate?: string; // e.g. "Oct 24" if pace will breach budget
  cycleLabel: string;
}

export interface SafeToSpendResult {
  dailyAllowance: number;
  discretionaryPool: number;
  daysRemaining: number;
  daysElapsed: number;
  status: 'safe' | 'caution' | 'critical';
  statusText: string;
  recommendedBudgetPerDay: number;
  simulateSpend: (amount: number) => {
    newDailyAllowance: number;
    newPool: number;
    impactPerDay: number;
  };
  projection: ProjectionMetrics;
}

/**
 * Calculates dynamic Safe-to-Spend daily allowance, runway, and end-of-month projection.
 */
export function calculateSafeToSpend(
  availableBalance: number,
  upcomingObligations: number,
  currentDate: Date = new Date(),
  totalMonthlyBudget: number = 0,
  currentSpent: number = 0,
  cycleDay: number = 1
): SafeToSpendResult {
  const cycleRange = getCycleRange(currentDate, cycleDay);
  const daysRemaining = Math.max(1, cycleRange.daysRemaining);
  const daysElapsed = Math.max(1, cycleRange.daysElapsed);
  const totalDays = Math.max(1, cycleRange.totalCycleDays);

  const baselineDailyBudget = Math.round(totalMonthlyBudget / totalDays);
  const discretionaryPool = Math.max(0, availableBalance - Math.max(0, upcomingObligations));
  const dailyAllowance = Math.max(0, Math.floor(discretionaryPool / daysRemaining));

  let status: 'safe' | 'caution' | 'critical' = 'safe';
  let statusText = 'Safe to spend';

  if (availableBalance <= 0 || discretionaryPool <= 0) {
    status = 'critical';
    statusText = 'Budget depleted';
  } else if (dailyAllowance < baselineDailyBudget * 0.6) {
    status = 'caution';
    statusText = 'Tight runway';
  } else {
    status = 'safe';
    statusText = 'On track';
  }

  // Predictive end-of-cycle projection math
  const safeCurrentSpent = Math.max(0, currentSpent);
  const avgDailyPace = Math.round(safeCurrentSpent / daysElapsed);
  const futureDaysSpend = avgDailyPace * Math.max(0, daysRemaining - 1);
  const projectedSpend = safeCurrentSpent + futureDaysSpend + Math.max(0, upcomingObligations);
  const projectedSurplus = totalMonthlyBudget > 0 ? totalMonthlyBudget - projectedSpend : 0;

  let projectedStatus: 'surplus' | 'balanced' | 'deficit' = 'balanced';
  let expectedDeficitDate: string | undefined = undefined;

  if (totalMonthlyBudget > 0) {
    const diffRatio = Math.abs(projectedSurplus) / totalMonthlyBudget;
    if (projectedSurplus < 0) {
      projectedStatus = 'deficit';
      // Calculate day on which budget gets breached
      const remainingSafeSpend = totalMonthlyBudget - safeCurrentSpent - Math.max(0, upcomingObligations);
      if (remainingSafeSpend <= 0) {
        expectedDeficitDate = 'Today';
      } else if (avgDailyPace > 0) {
        const daysUntilDeficit = Math.floor(remainingSafeSpend / avgDailyPace);
        const deficitDate = addDays(currentDate, daysUntilDeficit);
        expectedDeficitDate = format(deficitDate, 'MMM d');
      }
    } else if (diffRatio <= 0.03 || projectedSurplus === 0) {
      projectedStatus = 'balanced';
    } else {
      projectedStatus = 'surplus';
    }
  }

  const projection: ProjectionMetrics = {
    projectedSpend,
    projectedSurplus,
    projectedStatus,
    avgDailyPace,
    expectedDeficitDate,
    cycleLabel: cycleRange.label,
  };

  const simulateSpend = (amount: number) => {
    const newPool = Math.max(0, discretionaryPool - amount);
    const newDaily = Math.max(0, Math.floor(newPool / daysRemaining));
    return {
      newDailyAllowance: newDaily,
      newPool,
      impactPerDay: dailyAllowance - newDaily,
    };
  };

  return {
    dailyAllowance,
    discretionaryPool,
    daysRemaining,
    daysElapsed,
    status,
    statusText,
    recommendedBudgetPerDay: baselineDailyBudget,
    simulateSpend,
    projection,
  };
}

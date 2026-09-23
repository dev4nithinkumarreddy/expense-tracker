export interface SafeToSpendResult {
  dailyAllowance: number;
  discretionaryPool: number;
  daysRemaining: number;
  status: 'safe' | 'caution' | 'critical';
  statusText: string;
  recommendedBudgetPerDay: number;
  simulateSpend: (amount: number) => {
    newDailyAllowance: number;
    newPool: number;
    impactPerDay: number;
  };
}

/**
 * Calculates dynamic Safe-to-Spend daily allowance and runway
 */
export function calculateSafeToSpend(
  availableBalance: number,
  upcomingObligations: number,
  currentDate: Date = new Date(),
  totalMonthlyBudget: number = 0
): SafeToSpendResult {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = currentDate.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);

  const baselineDailyBudget = Math.round(totalMonthlyBudget / daysInMonth);
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
    status,
    statusText,
    recommendedBudgetPerDay: baselineDailyBudget,
    simulateSpend,
  };
}

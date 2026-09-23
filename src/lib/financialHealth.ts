import type { Expense } from '../store/types';

export interface FinancialHealthBreakdown {
  score: number; // 0 - 100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  needsPercentage: number;
  wantsPercentage: number;
  savingsPercentage: number;
  tips: string[];
}

const DEFAULT_NEEDS_CATEGORIES = new Set([
  'grocery', 'groceries', 'bills', 'utilities', 'rent', 'medical', 'health', 
  'fuel', 'emi', 'transport', 'education', 'maintenance'
]);

const DEFAULT_WANTS_CATEGORIES = new Set([
  'food', 'dining', 'shopping', 'entertainment', 'travel', 'personal', 'cafe', 'party'
]);

/**
 * Calculates 50/30/20 wealth breakdown and overall financial health score (0-100)
 */
export function calculateFinancialHealth(
  monthlyIncome: number,
  expenses: Expense[],
  selectedMonthStr?: string
): FinancialHealthBreakdown {
  const targetMonth = selectedMonthStr || new Date().toISOString().slice(0, 7);

  const monthExpenses = expenses.filter(
    (e) => e.date.startsWith(targetMonth) && e.category !== 'Income' && e.amount > 0
  );

  let needsAmount = 0;
  let wantsAmount = 0;

  for (const e of monthExpenses) {
    const catLower = e.category.toLowerCase();
    if (DEFAULT_NEEDS_CATEGORIES.has(catLower)) {
      needsAmount += e.amount;
    } else if (DEFAULT_WANTS_CATEGORIES.has(catLower)) {
      wantsAmount += e.amount;
    } else {
      // Default unspecified to Needs if under Bills, else Wants
      wantsAmount += e.amount;
    }
  }

  const totalSpent = needsAmount + wantsAmount;
  const effectiveIncome = Math.max(monthlyIncome, totalSpent);
  const savingsAmount = Math.max(0, monthlyIncome - totalSpent);

  const needsPercentage = effectiveIncome > 0 ? Math.round((needsAmount / effectiveIncome) * 100) : 0;
  const wantsPercentage = effectiveIncome > 0 ? Math.round((wantsAmount / effectiveIncome) * 100) : 0;
  const savingsPercentage = effectiveIncome > 0 ? Math.round((savingsAmount / effectiveIncome) * 100) : 0;

  // Calculate score (0 to 100):
  // Ideal: Needs <= 50, Wants <= 30, Savings >= 20
  let score = 100;

  if (needsPercentage > 50) {
    score -= Math.min(30, (needsPercentage - 50) * 1.2);
  }
  if (wantsPercentage > 30) {
    score -= Math.min(35, (wantsPercentage - 30) * 1.5);
  }
  if (savingsPercentage < 20) {
    score -= Math.min(35, (20 - savingsPercentage) * 1.5);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let rating: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' = 'Excellent';
  if (score >= 85) rating = 'Excellent';
  else if (score >= 70) rating = 'Good';
  else if (score >= 50) rating = 'Fair';
  else rating = 'Needs Attention';

  const tips: string[] = [];
  if (savingsPercentage >= 20) {
    tips.push('🎉 Superb savings rate! You are meeting or exceeding the 20% wealth-building rule.');
  } else {
    tips.push(`💡 Boosting savings by ${20 - savingsPercentage}% will align you with the 50/30/20 target.`);
  }

  if (wantsPercentage > 35) {
    tips.push(`⚠️ Discretionary wants are taking up ${wantsPercentage}% of your budget. Consider cutting non-essentials.`);
  }

  if (needsPercentage > 60) {
    tips.push(`📊 Fixed obligations account for ${needsPercentage}% of income. Look for recurring bill optimizations.`);
  }

  if (tips.length === 1 && score >= 80) {
    tips.push('🚀 Your expenses are well-balanced between essential needs and personal wants.');
  }

  return {
    score,
    rating,
    needsAmount,
    wantsAmount,
    savingsAmount,
    needsPercentage,
    wantsPercentage,
    savingsPercentage,
    tips,
  };
}

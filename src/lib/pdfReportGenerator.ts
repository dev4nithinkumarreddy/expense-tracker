import { format } from 'date-fns';
import type { Expense, Settings, Account } from '../store/types';

export interface StatementData {
  title: string;
  userName: string;
  periodLabel: string;
  currency: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  liquidNetWorth: number;
  categoryBreakdown: { category: string; amount: number; count: number; percentage: number }[];
  transactions: Expense[];
  accounts: Account[];
}

export function generateStatementData(
  expenses: Expense[],
  settings: Settings,
  accounts: Account[] = [],
  filterMonth?: Date
): StatementData {
  const currency = settings.currency || '₹';
  const userName = settings.userName || 'Account Holder';

  let filteredExpenses = expenses;
  let periodLabel = 'All Time';

  if (filterMonth) {
    const monthKey = format(filterMonth, 'yyyy-MM');
    periodLabel = format(filterMonth, 'MMMM yyyy');
    filteredExpenses = expenses.filter((e) => e.date.startsWith(monthKey));
  }

  // Separate non-income / non-transfer expenses
  const debitExpenses = filteredExpenses.filter(
    (e) => e.category !== 'Income' && e.category !== 'Transfer'
  );
  const incomeExpenses = filteredExpenses.filter((e) => e.category === 'Income');

  const totalIncome = incomeExpenses.reduce((sum, e) => sum + e.amount, 0) || settings.monthlyIncome || 0;
  const totalExpenses = debitExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Category breakdown
  const catMap: Record<string, { amount: number; count: number }> = {};
  debitExpenses.forEach((e) => {
    const cat = e.category || 'Other';
    if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 };
    catMap[cat].amount += e.amount;
    catMap[cat].count += 1;
  });

  const categoryBreakdown = Object.entries(catMap)
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const liquidNetWorth = accounts.reduce((acc, a) => {
    return a.type === 'credit_card' ? acc - (a.balance || 0) : acc + (a.balance || 0);
  }, 0);

  // Sort transactions by date descending
  const transactions = [...filteredExpenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    title: 'Personal Financial Statement',
    userName,
    periodLabel,
    currency,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    liquidNetWorth,
    categoryBreakdown,
    transactions,
    accounts,
  };
}

export function triggerPrintStatement() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

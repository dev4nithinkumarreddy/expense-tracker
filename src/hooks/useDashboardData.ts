import { useExpenseStore } from "../store/useExpenseStore";

export function useDashboardData() {
  const { expenses, bills, budgets } = useExpenseStore();

  return {
    expenses,
    bills,
    budgets,
    isLoading: false,
  };
}

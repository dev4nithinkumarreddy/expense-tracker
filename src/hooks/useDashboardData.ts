import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useExpenseStore } from "../store/useExpenseStore";
import type { Expense, Bill, Budget } from "../store/useExpenseStore";

export function useDashboardData() {
  const { session } = useExpenseStore();

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*');
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        amount: row.amount,
        description: row.description,
        category: row.category,
        date: row.date,
        notes: row.notes || undefined,
        receipt_url: row.receipt_url || undefined,
        recurrence: row.recurrence,
        next_occurrence: row.next_occurrence || undefined
      }));
    },
    enabled: !!session?.user?.id,
  });

  const { data: bills = [], isLoading: isLoadingBills } = useQuery<Bill[]>({
    queryKey: ['bills', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('bills').select('*');
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        amount: row.amount,
        autoDeduct: row.auto_deduct,
        category: row.category
      }));
    },
    enabled: !!session?.user?.id,
  });

  const { data: budgets = [], isLoading: isLoadingBudgets } = useQuery<Budget[]>({
    queryKey: ['budgets', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select('*');
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        category: row.category,
        monthlyLimit: row.monthly_limit,
        month: row.month,
        userId: row.user_id
      }));
    },
    enabled: !!session?.user?.id,
  });

  return {
    expenses,
    bills,
    budgets,
    isLoading: isLoadingExpenses || isLoadingBills || isLoadingBudgets,
  };
}

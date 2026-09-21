import type { StateCreator } from 'zustand';
import { queryClient } from '../../lib/queryClient';
import type { ExpenseState, BudgetSlice, Budget } from '../types';

export const createBudgetSlice: StateCreator<ExpenseState, [], [], BudgetSlice> = (set, get) => ({
  budgets: [],

  updateBudget: async (category, monthlyLimit, month) => {
    const { session, budgets, addPendingMutation, syncPendingMutations } = get();

    const existingBudget = budgets.find(b => b.category === category && b.month === month);

    if (monthlyLimit <= 0) {
      if (existingBudget) {
        set(state => ({ budgets: state.budgets.filter(b => b.id !== existingBudget.id) }));
        if (session) {
          queryClient.setQueryData(['budgets', session.user.id], (old: any) => {
            return old ? old.filter((b: any) => b.id !== existingBudget.id) : [];
          });
          addPendingMutation({ type: 'DELETE_BUDGET', payload: { id: existingBudget.id } });
          syncPendingMutations();
        }
      }
      return;
    }

    if (existingBudget) {
      set(state => ({
        budgets: state.budgets.map(b => b.id === existingBudget.id ? { ...b, monthlyLimit } : b)
      }));
      if (session) {
        queryClient.setQueryData(['budgets', session.user.id], (old: any) => {
          return old ? old.map((b: any) => b.id === existingBudget.id ? { ...b, monthlyLimit } : b) : [];
        });
        addPendingMutation({ 
          type: 'UPSERT_BUDGET', 
          payload: {
            id: existingBudget.id,
            user_id: session.user.id,
            category,
            monthly_limit: monthlyLimit,
            month
          } 
        });
        syncPendingMutations();
      }
    } else {
      const newBudget: Budget = {
        id: crypto.randomUUID(),
        category,
        monthlyLimit,
        month,
        userId: session ? session.user.id : 'guest'
      };
      set(state => ({ budgets: [...state.budgets, newBudget] }));
      if (session) {
        queryClient.setQueryData(['budgets', session.user.id], (old: any) => {
          return old ? [...old, newBudget] : [newBudget];
        });
        addPendingMutation({ 
          type: 'UPSERT_BUDGET', 
          payload: {
            id: newBudget.id,
            user_id: newBudget.userId,
            category,
            monthly_limit: newBudget.monthlyLimit,
            month: newBudget.month
          } 
        });
        syncPendingMutations();
      }
    }
  },
  
  deleteBudget: (id) => {
    set(state => ({ budgets: state.budgets.filter(b => b.id !== id) }));
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({ type: 'DELETE_BUDGET', payload: { id } });
      syncPendingMutations();
    }
  }
});

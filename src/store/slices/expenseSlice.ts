import type { StateCreator } from 'zustand';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { calculateStreak } from '../../lib/streak';
import { queryClient } from '../../lib/queryClient';
import { isIncomeCategory } from '../../lib/categoryStyles';
import type { ExpenseState, ExpenseSlice, DeletedExpense, Expense, Account } from '../types';

export function applyExpenseToAccounts(
  accounts: Account[] | undefined,
  expense: Expense,
  direction: 1 | -1
): Account[] {
  if (!accounts || accounts.length === 0) return accounts || [];

  if (expense.category === 'Transfer' && expense.account_id && expense.transfer_account_id) {
    return accounts.map((acc) => {
      if (acc.id === expense.account_id) {
        const delta = acc.type === 'credit_card' ? expense.amount : -expense.amount;
        return { ...acc, balance: acc.balance + delta * direction };
      }
      if (acc.id === expense.transfer_account_id) {
        const delta = acc.type === 'credit_card' ? -expense.amount : expense.amount;
        return { ...acc, balance: acc.balance + delta * direction };
      }
      return acc;
    });
  }

  if (expense.account_id && expense.category !== 'Transfer') {
    const isIncome = isIncomeCategory(expense.category);
    return accounts.map((acc) => {
      if (acc.id === expense.account_id) {
        if (acc.type === 'credit_card') {
          const delta = isIncome ? -expense.amount : expense.amount;
          return { ...acc, balance: acc.balance + delta * direction };
        } else {
          const delta = isIncome ? expense.amount : -expense.amount;
          return { ...acc, balance: acc.balance + delta * direction };
        }
      }
      return acc;
    });
  }

  return accounts;
}

export const createExpenseSlice: StateCreator<ExpenseState, [], [], ExpenseSlice> = (set, get) => ({
  expenses: [],
  recentlyDeleted: [],

  addExpense: async (expense) => {
    const id = crypto.randomUUID();
    const newExpense: Expense = { ...expense, id };
    
    // Gamification (Streak logic)
    const today = format(new Date(), 'yyyy-MM-dd');
    
    set((state) => {
      const updatedExpenses = [...state.expenses, newExpense];
      const newStreak = calculateStreak(updatedExpenses);
      const updatedAccounts = newExpense.category === 'Transfer'
        ? state.accounts
        : applyExpenseToAccounts(state.accounts, newExpense, 1);
      return { 
        expenses: updatedExpenses,
        accounts: updatedAccounts,
        settings: { ...state.settings, lastLogDate: today, currentStreak: newStreak }
      };
    });
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      queryClient.setQueryData(['expenses', session.user.id], (old: any) => {
         return old ? [...old, newExpense] : [newExpense];
      });
      
      const payload = {
        id: newExpense.id,
        user_id: session.user.id,
        amount: newExpense.amount,
        description: newExpense.description,
        category: newExpense.category,
        date: newExpense.date,
        notes: newExpense.notes,
        receipt_url: newExpense.receipt_url,
        recurrence: newExpense.recurrence || 'none',
        next_occurrence: newExpense.next_occurrence || null,
        account_id: newExpense.account_id || null,
        transfer_account_id: newExpense.transfer_account_id || null
      };
      addPendingMutation({ type: 'INSERT_EXPENSE', payload });
      syncPendingMutations();
    }
    return id;
  },
  
  updateExpense: (id, updatedFields) => {
    set((state) => {
      const oldExpense = state.expenses.find(e => e.id === id);
      if (!oldExpense) return state;
      const updatedExpense = { ...oldExpense, ...updatedFields };
      const updatedExpenses = state.expenses.map(e => e.id === id ? updatedExpense : e);

      // Revert previous account effect and apply new account effect
      const accountsAfterRevert = applyExpenseToAccounts(state.accounts, oldExpense, -1);
      const updatedAccounts = applyExpenseToAccounts(accountsAfterRevert, updatedExpense, 1);

      return {
        expenses: updatedExpenses,
        accounts: updatedAccounts,
        settings: { ...state.settings, currentStreak: calculateStreak(updatedExpenses) }
      };
    });
    
    const { session, expenses, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      const expense = expenses.find(e => e.id === id);
      if (expense) {
        queryClient.setQueryData(['expenses', session.user.id], (old: any) => {
           return old ? old.map((e: any) => e.id === id ? { ...e, ...updatedFields } : e) : [];
        });
        const payload = {
          id: expense.id,
          amount: expense.amount,
          description: expense.description,
          category: expense.category,
          date: expense.date,
          notes: expense.notes,
          receipt_url: expense.receipt_url,
          recurrence: expense.recurrence,
          next_occurrence: expense.next_occurrence,
          account_id: expense.account_id || null,
          transfer_account_id: expense.transfer_account_id || null
        };
        addPendingMutation({ type: 'UPDATE_EXPENSE', payload });
        syncPendingMutations();
      }
    }
  },
  
  deleteExpense: (id) => {
    const { session, expenses, recentlyDeleted = [], addPendingMutation, syncPendingMutations } = get();
    const expenseToDelete = expenses.find(e => e.id === id);

    if (!expenseToDelete) return;

    const newRecentlyDeleted: DeletedExpense[] = [
      { expense: expenseToDelete, deletedAt: new Date().toISOString() },
      ...recentlyDeleted.filter(d => d.expense.id !== id).slice(0, 49)
    ];

    set((state) => {
      const updatedExpenses = state.expenses.filter(e => e.id !== id);
      const updatedAccounts = applyExpenseToAccounts(state.accounts, expenseToDelete, -1);
      return {
        expenses: updatedExpenses,
        accounts: updatedAccounts,
        recentlyDeleted: newRecentlyDeleted,
        settings: { ...state.settings, currentStreak: calculateStreak(updatedExpenses) }
      };
    });
    
    if (session) {
      queryClient.setQueryData(['expenses', session.user.id], (old: any) => {
         return old ? old.filter((e: any) => e.id !== id) : [];
      });
      addPendingMutation({ type: 'DELETE_EXPENSE', payload: { id } });
      syncPendingMutations();
    }

    toast.success(`Deleted "${expenseToDelete.description}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          get().restoreExpense(expenseToDelete.id);
        }
      }
    });
  },

  restoreExpense: async (id) => {
    const { session, recentlyDeleted = [], expenses, addPendingMutation, syncPendingMutations } = get();
    const itemToRestore = recentlyDeleted.find(d => d.expense.id === id);
    if (!itemToRestore) return;

    const restoredExpense = itemToRestore.expense;
    const updatedRecentlyDeleted = recentlyDeleted.filter(d => d.expense.id !== id);
    const updatedExpenses = [...expenses, restoredExpense];

    set((state) => {
      const updatedAccounts = applyExpenseToAccounts(state.accounts, restoredExpense, 1);
      return {
        expenses: updatedExpenses,
        accounts: updatedAccounts,
        recentlyDeleted: updatedRecentlyDeleted,
        settings: { ...state.settings, currentStreak: calculateStreak(updatedExpenses) }
      };
    });

    if (session) {
      queryClient.setQueryData(['expenses', session.user.id], (old: any) => {
        return old ? [...old, restoredExpense] : [restoredExpense];
      });
      const payload = {
        id: restoredExpense.id,
        user_id: session.user.id,
        amount: restoredExpense.amount,
        description: restoredExpense.description,
        category: restoredExpense.category,
        date: restoredExpense.date,
        notes: restoredExpense.notes,
        receipt_url: restoredExpense.receipt_url,
        recurrence: restoredExpense.recurrence || 'none',
        next_occurrence: restoredExpense.next_occurrence || null,
        account_id: restoredExpense.account_id || null,
        transfer_account_id: restoredExpense.transfer_account_id || null
      };
      addPendingMutation({ type: 'INSERT_EXPENSE', payload });
      syncPendingMutations();
    }

    toast.success(`Restored "${restoredExpense.description}"`);
  },

  permanentlyDeleteExpense: async (id) => {
    const { recentlyDeleted = [] } = get();
    set({
      recentlyDeleted: recentlyDeleted.filter(d => d.expense.id !== id)
    });
    toast.info('Permanently deleted');
  },

  clearRecentlyDeleted: async () => {
    set({ recentlyDeleted: [] });
    toast.info('Trash emptied');
  }
});

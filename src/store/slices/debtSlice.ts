import type { StateCreator } from 'zustand';
import type { ExpenseState, DebtSlice, Debt } from '../types';

export const createDebtSlice: StateCreator<ExpenseState, [], [], DebtSlice> = (set, get) => ({
  debts: [],

  addDebt: (debt) => {
    const id = crypto.randomUUID();
    const newDebt: Debt = { ...debt, id, created_at: new Date().toISOString() };
    set((state) => ({ debts: [...state.debts, newDebt] }));
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    addPendingMutation({
      type: 'INSERT_DEBT',
      payload: {
        ...newDebt,
        user_id: session?.user?.id || ''
      }
    });
    if (session) {
      syncPendingMutations();
    }
  },
  
  updateDebt: (id, updates) => {
    set((state) => ({
      debts: state.debts.map(d => d.id === id ? { ...d, ...updates } : d)
    }));
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    addPendingMutation({
      type: 'UPDATE_DEBT',
      payload: { id, ...updates }
    });
    if (session) {
      syncPendingMutations();
    }
  },
  
  deleteDebt: (id) => {
    set((state) => ({ debts: state.debts.filter(d => d.id !== id) }));
    const { session, addPendingMutation, syncPendingMutations } = get();
    addPendingMutation({ type: 'DELETE_DEBT', payload: { id } });
    if (session) {
      syncPendingMutations();
    }
  }
});

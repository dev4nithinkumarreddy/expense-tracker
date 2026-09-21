import type { StateCreator } from 'zustand';
import { queryClient } from '../../lib/queryClient';
import type { ExpenseState, BillSlice, Bill } from '../types';

export const createBillSlice: StateCreator<ExpenseState, [], [], BillSlice> = (set, get) => ({
  bills: [],

  addBill: (bill) => {
    const id = crypto.randomUUID();
    const newBill: Bill = { ...bill, id };
    set((state) => ({ bills: [...state.bills, newBill] }));
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      queryClient.setQueryData(['bills', session.user.id], (old: any) => {
         return old ? [...old, newBill] : [newBill];
      });
      const payload = {
        id: newBill.id,
        user_id: session.user.id,
        title: newBill.title,
        amount: newBill.amount,
        auto_deduct: newBill.autoDeduct,
        category: newBill.category,
        due_day: newBill.due_day ?? 1,
        due_date: newBill.due_date || null
      };
      addPendingMutation({ type: 'INSERT_BILL', payload });
      syncPendingMutations();
    }
  },
  
  updateBill: (id, updatedFields) => {
    set((state) => ({
      bills: state.bills.map(b => b.id === id ? { ...b, ...updatedFields } : b)
    }));
    
    const { session, bills, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      const bill = bills.find(b => b.id === id);
      if (bill) {
        queryClient.setQueryData(['bills', session.user.id], (old: any) => {
           return old ? old.map((b: any) => b.id === id ? { ...b, ...updatedFields } : b) : [];
        });
        const payload = {
          id: bill.id,
          title: bill.title,
          amount: bill.amount,
          auto_deduct: bill.autoDeduct,
          category: bill.category,
          due_day: bill.due_day ?? 1,
          due_date: bill.due_date || null
        };
        addPendingMutation({ type: 'UPDATE_BILL', payload });
        syncPendingMutations();
      }
    }
  },
  
  deleteBill: (id) => {
    set((state) => ({ bills: state.bills.filter(b => b.id !== id) }));
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      queryClient.setQueryData(['bills', session.user.id], (old: any) => {
         return old ? old.filter((b: any) => b.id !== id) : [];
      });
      addPendingMutation({ type: 'DELETE_BILL', payload: { id } });
      syncPendingMutations();
    }
  }
});

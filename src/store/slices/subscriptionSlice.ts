import type { StateCreator } from 'zustand';
import type { ExpenseState, SubscriptionSlice, Subscription } from '../types';

export const createSubscriptionSlice: StateCreator<ExpenseState, [], [], SubscriptionSlice> = (set, get) => ({
  subscriptions: [],

  addSubscription: (sub) => {
    const id = crypto.randomUUID();
    const newSub: Subscription = { ...sub, id };
    set((state) => ({ subscriptions: [...state.subscriptions, newSub] }));
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({
        type: 'INSERT_SUBSCRIPTION',
        payload: {
          ...newSub,
          user_id: session.user.id
        }
      });
      syncPendingMutations();
    }
  },

  updateSubscription: (id, updates) => {
    set((state) => ({
      subscriptions: state.subscriptions.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({
        type: 'UPDATE_SUBSCRIPTION',
        payload: { id, ...updates }
      });
      syncPendingMutations();
    }
  },

  deleteSubscription: (id) => {
    set((state) => ({ subscriptions: state.subscriptions.filter(s => s.id !== id) }));
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({ type: 'DELETE_SUBSCRIPTION', payload: { id } });
      syncPendingMutations();
    }
  }
});

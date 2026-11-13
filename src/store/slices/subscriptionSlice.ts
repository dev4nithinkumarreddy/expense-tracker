import type { StateCreator } from 'zustand';
import type { ExpenseState, SubscriptionSlice, Subscription } from '../types';

export const createSubscriptionSlice: StateCreator<ExpenseState, [], [], SubscriptionSlice> = (set, get) => ({
  subscriptions: [],

  addSubscription: (sub) => {
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const newSub: Subscription = { ...sub, id, updated_at: nowIso };
    set((state) => ({ subscriptions: [...state.subscriptions, newSub] }));
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    addPendingMutation({
      type: 'INSERT_SUBSCRIPTION',
      payload: {
        ...newSub,
        user_id: session?.user?.id || '',
        updated_at: nowIso
      }
    });
    if (session) {
      syncPendingMutations();
    }
  },

  updateSubscription: (id, updates) => {
    const nowIso = new Date().toISOString();
    set((state) => ({
      subscriptions: state.subscriptions.map(s => s.id === id ? { ...s, ...updates, updated_at: nowIso } : s)
    }));
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    addPendingMutation({
      type: 'UPDATE_SUBSCRIPTION',
      payload: { id, ...updates, updated_at: nowIso }
    });
    if (session) {
      syncPendingMutations();
    }
  },

  deleteSubscription: (id) => {
    set((state) => ({ subscriptions: state.subscriptions.filter(s => s.id !== id) }));
    const { session, addPendingMutation, syncPendingMutations } = get();
    addPendingMutation({ type: 'DELETE_SUBSCRIPTION', payload: { id } });
    if (session) {
      syncPendingMutations();
    }
  }
});

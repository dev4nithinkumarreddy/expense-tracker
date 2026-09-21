import type { StateCreator } from 'zustand';
import type { ExpenseState, WishlistSlice, WishlistItem } from '../types';

export const createWishlistSlice: StateCreator<ExpenseState, [], [], WishlistSlice> = (set, get) => ({
  wishlistItems: [],

  addWishlistItem: (item) => {
    const id = crypto.randomUUID();
    const newItem: WishlistItem = { ...item, id, is_purchased: false, created_at: new Date().toISOString() };
    set((state) => ({ wishlistItems: [...state.wishlistItems, newItem] }));
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({
        type: 'INSERT_WISHLIST_ITEM',
        payload: {
          id: newItem.id,
          user_id: session.user.id,
          item_name: newItem.item_name,
          estimated_amount: newItem.estimated_amount,
          category: newItem.category,
          is_purchased: newItem.is_purchased,
          created_at: newItem.created_at
        }
      });
      syncPendingMutations();
    }
  },
  
  updateWishlistItem: (id, updates) => {
    set((state) => ({
      wishlistItems: state.wishlistItems.map(w => w.id === id ? { ...w, ...updates } : w)
    }));
    
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({
        type: 'UPDATE_WISHLIST_ITEM',
        payload: { id, ...updates }
      });
      syncPendingMutations();
    }
  },
  
  deleteWishlistItem: (id) => {
    set((state) => ({ wishlistItems: state.wishlistItems.filter(w => w.id !== id) }));
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({ type: 'DELETE_WISHLIST_ITEM', payload: { id } });
      syncPendingMutations();
    }
  }
});

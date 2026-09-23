import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExpenseState } from './types';
import { createExpenseSlice } from './slices/expenseSlice';
import { createBillSlice } from './slices/billSlice';
import { createBudgetSlice } from './slices/budgetSlice';
import { createDebtSlice } from './slices/debtSlice';
import { createSubscriptionSlice } from './slices/subscriptionSlice';
import { createWishlistSlice } from './slices/wishlistSlice';
import { createAccountSlice } from './slices/accountSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createSyncSlice } from './slices/syncSlice';

export type {
  Expense,
  DeletedExpense,
  Budget,
  WishlistItem,
  Debt,
  Subscription,
  Account,
  MutationType,
  PendingMutation,
  Bill,
  Settings,
  ExpenseState
} from './types';
export { defaultCategories } from './types';

import { indexedDBStorage } from '../lib/storage';

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (...a) => ({
      ...createExpenseSlice(...a),
      ...createBillSlice(...a),
      ...createBudgetSlice(...a),
      ...createDebtSlice(...a),
      ...createSubscriptionSlice(...a),
      ...createWishlistSlice(...a),
      ...createAccountSlice(...a),
      ...createSettingsSlice(...a),
      ...createSyncSlice(...a),
    }),
    {
      name: 'expense-tracker-storage',
      storage: indexedDBStorage,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.reconcileAccountsWithBudget?.();
        }
      },
    }
  )
);

// Proactively run reconciliation immediately on initial load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useExpenseStore.getState().reconcileAccountsWithBudget?.();
  }, 0);
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExpenseState } from './types';
import { createExpenseSlice } from './slices/expenseSlice';
import { createBillSlice } from './slices/billSlice';
import { createBudgetSlice } from './slices/budgetSlice';
import { createDebtSlice } from './slices/debtSlice';
import { createSubscriptionSlice } from './slices/subscriptionSlice';
import { createWishlistSlice } from './slices/wishlistSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createSyncSlice } from './slices/syncSlice';

export type {
  Expense,
  DeletedExpense,
  Budget,
  WishlistItem,
  Debt,
  Subscription,
  MutationType,
  PendingMutation,
  Bill,
  Settings,
  ExpenseState
} from './types';
export { defaultCategories } from './types';

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (...a) => ({
      ...createExpenseSlice(...a),
      ...createBillSlice(...a),
      ...createBudgetSlice(...a),
      ...createDebtSlice(...a),
      ...createSubscriptionSlice(...a),
      ...createWishlistSlice(...a),
      ...createSettingsSlice(...a),
      ...createSyncSlice(...a),
    }),
    {
      name: 'expense-tracker-storage',
    }
  )
);

import type { Session } from '@supabase/supabase-js';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO string
  notes?: string;
  receipt_url?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  next_occurrence?: string | null;
  recurring_source_id?: string | null;
  account_id?: string | null;
  transfer_account_id?: string | null;
}

export interface DeletedExpense {
  expense: Expense;
  deletedAt: string; // ISO string
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  month: string;
  userId: string;
}

export interface WishlistItem {
  id: string;
  item_name: string;
  estimated_amount?: number;
  category?: string;
  is_purchased: boolean;
  created_at: string;
  cooling_ends_at?: string | null;
  is_impulse_locked?: boolean;
}

export interface Debt {
  id: string;
  person_name: string;
  amount: number;
  type: 'lent' | 'borrowed';
  status: 'pending' | 'settled';
  date: string;
  notes?: string;
  created_at?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date: string;
  category: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'savings';
  balance: number;
  currency?: string;
  color?: string;
  icon?: string;
  credit_limit?: number;
  statement_day?: number;
  due_day?: number;
}

export type MutationType = 'INSERT_EXPENSE' | 'UPDATE_EXPENSE' | 'DELETE_EXPENSE' 
  | 'INSERT_BILL' | 'UPDATE_BILL' | 'DELETE_BILL' 
  | 'UPSERT_BUDGET' | 'DELETE_BUDGET'
  | 'INSERT_WISHLIST_ITEM' | 'UPDATE_WISHLIST_ITEM' | 'DELETE_WISHLIST_ITEM'
  | 'INSERT_DEBT' | 'UPDATE_DEBT' | 'DELETE_DEBT'
  | 'INSERT_SUBSCRIPTION' | 'UPDATE_SUBSCRIPTION' | 'DELETE_SUBSCRIPTION'
  | 'UPDATE_SETTINGS'
  | 'INSERT_ACCOUNT' | 'UPDATE_ACCOUNT' | 'DELETE_ACCOUNT';

export interface PendingMutation {
  id: string;
  type: MutationType;
  payload: any;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  autoDeduct: boolean;
  category: string;
  due_day?: number;
  due_date?: string;
}

export interface Settings {
  monthlyIncome: number;
  currency: string;
  darkMode: boolean;
  categories: string[];
  carryForward: boolean;
  categoryBudgets: Record<string, number>;
  quickAdds: { description: string; amount: number; category: string; icon: string }[];
  notificationsEnabled?: boolean;
  privacyMode?: boolean;
  theme?: string;
  categoryEmojis?: Record<string, string>;
  currentStreak?: number;
  lastLogDate?: string;
  userName?: string;
  soundEnabled?: boolean;
  appLockEnabled?: boolean;
  appLockPin?: string;
  appLockBiometrics?: boolean;
}

export const defaultCategories = [
  'Food', 'Grocery', 'Fuel', 'Shopping', 'Entertainment', 
  'Travel', 'Medical', 'EMI', 'Bills', 'Other'
];

export interface ExpenseSlice {
  expenses: Expense[];
  recentlyDeleted: DeletedExpense[];
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<string>;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  restoreExpense: (id: string) => Promise<void>;
  permanentlyDeleteExpense: (id: string) => Promise<void>;
  clearRecentlyDeleted: () => Promise<void>;
}

export interface BillSlice {
  bills: Bill[];
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
}

export interface BudgetSlice {
  budgets: Budget[];
  updateBudget: (category: string, monthlyLimit: number, month: string) => void;
  deleteBudget: (id: string) => void;
}

export interface DebtSlice {
  debts: Debt[];
  addDebt: (debt: Omit<Debt, 'id' | 'created_at'>) => void;
  updateDebt: (id: string, debt: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
}

export interface SubscriptionSlice {
  subscriptions: Subscription[];
  addSubscription: (sub: Omit<Subscription, 'id'>) => void;
  updateSubscription: (id: string, sub: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
}

export interface WishlistSlice {
  wishlistItems: WishlistItem[];
  addWishlistItem: (item: Omit<WishlistItem, 'id' | 'is_purchased' | 'created_at'>) => void;
  updateWishlistItem: (id: string, item: Partial<WishlistItem>) => void;
  deleteWishlistItem: (id: string) => void;
}

export interface AccountSlice {
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id'>) => Promise<string>;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  transferFunds: (fromId: string, toId: string, amount: number, notes?: string) => Promise<void>;
  syncAccountWithBalance: (accountId?: string) => void;
  reconcileAccountsWithBudget: () => void;
}

export interface SettingsSlice {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  reorderCategories: (categories: string[]) => void;
}

export interface SyncSlice {
  lastActiveMonth: string;
  session: Session | null;
  pendingMutations: PendingMutation[];
  isModalOpen: boolean;
  sharedData: { title?: string; text?: string; url?: string } | null;
  shouldTriggerScan: boolean;
  setSession: (session: Session | null) => void;
  setSharedData: (data: { title?: string; text?: string; url?: string } | null) => void;
  setShouldTriggerScan: (shouldTriggerScan: boolean) => void;
  setModalOpen: (isOpen: boolean) => void;
  addPendingMutation: (mutation: Omit<PendingMutation, 'id'>) => void;
  removePendingMutation: (id: string) => void;
  syncPendingMutations: () => Promise<void>;
  fetchCloudData: () => Promise<void>;
  clearData: () => Promise<void>;
  checkMonthRollover: () => void;
  eraseAllData: () => Promise<void>;
}

export type ExpenseState = ExpenseSlice &
  BillSlice &
  BudgetSlice &
  DebtSlice &
  SubscriptionSlice &
  WishlistSlice &
  AccountSlice &
  SettingsSlice &
  SyncSlice;

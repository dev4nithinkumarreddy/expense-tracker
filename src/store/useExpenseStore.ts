import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import type { Session } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { calculateStreak } from '../lib/streak';

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

export type MutationType = 'INSERT_EXPENSE' | 'UPDATE_EXPENSE' | 'DELETE_EXPENSE' 
  | 'INSERT_BILL' | 'UPDATE_BILL' | 'DELETE_BILL' 
  | 'UPSERT_BUDGET' | 'DELETE_BUDGET'
  | 'INSERT_WISHLIST_ITEM' | 'UPDATE_WISHLIST_ITEM' | 'DELETE_WISHLIST_ITEM'
  | 'INSERT_DEBT' | 'UPDATE_DEBT' | 'DELETE_DEBT'
  | 'INSERT_SUBSCRIPTION' | 'UPDATE_SUBSCRIPTION' | 'DELETE_SUBSCRIPTION';

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
}

interface ExpenseState {
  expenses: Expense[];
  bills: Bill[];
  settings: Settings;
  lastActiveMonth: string;
  session: Session | null;
  budgets: Budget[];
  wishlistItems: WishlistItem[];
  debts: Debt[];
  subscriptions: Subscription[];
  pendingMutations: PendingMutation[];
  isModalOpen: boolean;
  sharedData: { title?: string, text?: string, url?: string } | null;
  shouldTriggerScan: boolean;
  recentlyDeleted: DeletedExpense[];
  
  // Actions
  setSession: (session: Session | null) => void;
  setSharedData: (data: { title?: string, text?: string, url?: string } | null) => void;
  setShouldTriggerScan: (shouldTriggerScan: boolean) => void;
  fetchCloudData: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<string>;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  restoreExpense: (id: string) => Promise<void>;
  permanentlyDeleteExpense: (id: string) => Promise<void>;
  clearRecentlyDeleted: () => Promise<void>;
  
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;

  addSubscription: (sub: Omit<Subscription, 'id'>) => void;
  updateSubscription: (id: string, sub: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  
  addWishlistItem: (item: Omit<WishlistItem, 'id' | 'is_purchased' | 'created_at'>) => void;
  updateWishlistItem: (id: string, item: Partial<WishlistItem>) => void;
  deleteWishlistItem: (id: string) => void;
  
  addDebt: (debt: Omit<Debt, 'id' | 'created_at'>) => void;
  updateDebt: (id: string, debt: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  
  updateSettings: (settings: Partial<Settings>) => void;
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  reorderCategories: (categories: string[]) => void;
  updateBudget: (category: string, monthlyLimit: number, month: string) => void;
  deleteBudget: (id: string) => void;
  
  addPendingMutation: (mutation: Omit<PendingMutation, 'id' | 'timestamp'>) => void;
  removePendingMutation: (id: string) => void;
  syncPendingMutations: () => Promise<void>;
  
  clearData: () => Promise<void>;
  setModalOpen: (isOpen: boolean) => void;
  checkMonthRollover: () => void;
  eraseAllData: () => Promise<void>;
}

const defaultCategories = [
  'Food', 'Grocery', 'Fuel', 'Shopping', 'Entertainment', 
  'Travel', 'Medical', 'EMI', 'Bills', 'Other'
];

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: [],
      bills: [],
      budgets: [],
      pendingMutations: [],
      debts: [],
      subscriptions: [],
      settings: {
        monthlyIncome: 45000,
        currency: '₹',
        darkMode: true,
        categories: defaultCategories,
        carryForward: false,
        categoryBudgets: {},
        quickAdds: [
          { description: "Coffee", amount: 100, category: "Food", icon: "☕" },
          { description: "Fuel", amount: 500, category: "Fuel", icon: "🚗" },
          { description: "Grocery", amount: 200, category: "Grocery", icon: "🛒" }
        ],
        privacyMode: true,
        theme: 'default',
        categoryEmojis: {},
        userName: '',
        soundEnabled: false
      },
      wishlistItems: [],
      lastActiveMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
      session: null,
      isModalOpen: false,
      sharedData: null,
      shouldTriggerScan: false,
      recentlyDeleted: [],
      
      setSession: (session) => set({ session }),
      setSharedData: (data) => set({ sharedData: data }),
      setShouldTriggerScan: (shouldTriggerScan) => set({ shouldTriggerScan }),
      
      addPendingMutation: (mutation) => {
        set((state) => ({ pendingMutations: [...state.pendingMutations, { ...mutation, id: crypto.randomUUID() }] }));
      },
      
      removePendingMutation: (id) => {
        set((state) => ({ pendingMutations: state.pendingMutations.filter(m => m.id !== id) }));
      },
      
      syncPendingMutations: async () => {
        const { pendingMutations, session, removePendingMutation } = get();
        if (!session || pendingMutations.length === 0 || !navigator.onLine) return;
        
        if ((window as any).isSyncing) return;
        (window as any).isSyncing = true;

        for (const mut of pendingMutations) {
          try {
            let error = null;
            if (mut.type === 'INSERT_EXPENSE') {
              const res = await supabase.from('expenses').insert(mut.payload);
              error = res.error;
            } else if (mut.type === 'UPDATE_EXPENSE') {
              const res = await supabase.from('expenses').update(mut.payload).eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'DELETE_EXPENSE') {
              const res = await supabase.from('expenses').delete().eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'INSERT_BILL') {
              const res = await supabase.from('bills').insert(mut.payload);
              error = res.error;
            } else if (mut.type === 'UPDATE_BILL') {
              const res = await supabase.from('bills').update(mut.payload).eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'DELETE_BILL') {
              const res = await supabase.from('bills').delete().eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'UPSERT_BUDGET') {
              const res = await supabase.from('budgets').upsert(mut.payload);
              error = res.error;
            } else if (mut.type === 'DELETE_BUDGET') {
              const res = await supabase.from('budgets').delete().eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'INSERT_WISHLIST_ITEM') {
              const res = await supabase.from('wishlist').insert(mut.payload);
              error = res.error;
            } else if (mut.type === 'UPDATE_WISHLIST_ITEM') {
              const res = await supabase.from('wishlist').update(mut.payload).eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'DELETE_WISHLIST_ITEM') {
              const res = await supabase.from('wishlist').delete().eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'INSERT_DEBT') {
              const res = await supabase.from('debts').insert(mut.payload);
              error = res.error;
            } else if (mut.type === 'UPDATE_DEBT') {
              const res = await supabase.from('debts').update(mut.payload).eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'DELETE_DEBT') {
              const res = await supabase.from('debts').delete().eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'INSERT_SUBSCRIPTION') {
              const res = await supabase.from('subscriptions').insert(mut.payload);
              error = res.error;
            } else if (mut.type === 'UPDATE_SUBSCRIPTION') {
              const res = await supabase.from('subscriptions').update(mut.payload).eq('id', mut.payload.id);
              error = res.error;
            } else if (mut.type === 'DELETE_SUBSCRIPTION') {
              const res = await supabase.from('subscriptions').delete().eq('id', mut.payload.id);
              error = res.error;
            }

            if (!error) {
              removePendingMutation(mut.id);
              if (mut.type.includes('EXPENSE')) {
                 queryClient.invalidateQueries({ queryKey: ['expenses'] });
              } else if (mut.type.includes('BILL')) {
                 queryClient.invalidateQueries({ queryKey: ['bills'] });
              } else if (mut.type.includes('BUDGET')) {
                 queryClient.invalidateQueries({ queryKey: ['budgets'] });
              }
            } else {
              console.error("Mutation failed:", error);
              toast.error(`Sync failed: ${error.message || 'Unknown error'}`);
              break; 
            }
          } catch (e) {
             console.error("Sync error:", e);
             break;
          }
        }
        (window as any).isSyncing = false;
      },

      setModalOpen: (isModalOpen) => set({ isModalOpen }),
      
      fetchCloudData: async () => {
        const { session } = get();
        if (!session) return;
        
        try {
          const [expensesRes, billsRes, settingsRes, budgetsRes, wishlistRes, debtsRes, subsRes] = await Promise.all([
            supabase.from('expenses').select('*').eq('user_id', session.user.id),
            supabase.from('bills').select('*').eq('user_id', session.user.id),
            supabase.from('user_settings').select('*').eq('user_id', session.user.id).single(),
            supabase.from('budgets').select('*').eq('user_id', session.user.id),
            supabase.from('wishlist').select('*').eq('user_id', session.user.id),
            supabase.from('debts').select('*').eq('user_id', session.user.id),
            supabase.from('subscriptions').select('*').eq('user_id', session.user.id)
          ]);

          if (subsRes && subsRes.data) {
            set({ subscriptions: subsRes.data as Subscription[] });
          }

          if (expensesRes.data) {
            const { pendingMutations } = get();
            let mergedExpenses = expensesRes.data as Expense[];
            
            pendingMutations.forEach(mut => {
              if (mut.type === 'INSERT_EXPENSE') {
                mergedExpenses.push(mut.payload as Expense);
              } else if (mut.type === 'UPDATE_EXPENSE') {
                mergedExpenses = mergedExpenses.map(e => e.id === mut.payload.id ? { ...e, ...mut.payload } : e);
              } else if (mut.type === 'DELETE_EXPENSE') {
                mergedExpenses = mergedExpenses.filter(e => e.id !== mut.payload.id);
              }
            });
            set((state) => ({
              expenses: mergedExpenses,
              settings: {
                ...state.settings,
                currentStreak: calculateStreak(mergedExpenses)
              }
            }));
          }
          if (billsRes.data) {
            const { pendingMutations } = get();
            let mergedBills = billsRes.data.map(b => ({
              id: b.id,
              title: b.title,
              amount: b.amount,
              autoDeduct: b.auto_deduct,
              category: b.category,
              due_day: b.due_day ?? (b.due_date ? new Date(b.due_date).getDate() : 1),
              due_date: b.due_date
            })) as Bill[];
            
            pendingMutations.forEach(mut => {
              if (mut.type === 'INSERT_BILL') {
                mergedBills.push({
                  id: mut.payload.id,
                  title: mut.payload.title,
                  amount: mut.payload.amount,
                  autoDeduct: mut.payload.auto_deduct,
                  category: mut.payload.category,
                  due_day: mut.payload.due_day,
                  due_date: mut.payload.due_date
                });
              } else if (mut.type === 'UPDATE_BILL') {
                mergedBills = mergedBills.map(b => b.id === mut.payload.id ? {
                  ...b,
                  title: mut.payload.title ?? b.title,
                  amount: mut.payload.amount ?? b.amount,
                  autoDeduct: mut.payload.auto_deduct ?? b.autoDeduct,
                  category: mut.payload.category ?? b.category,
                  due_day: mut.payload.due_day ?? b.due_day,
                  due_date: mut.payload.due_date ?? b.due_date
                } : b);
              } else if (mut.type === 'DELETE_BILL') {
                mergedBills = mergedBills.filter(b => b.id !== mut.payload.id);
              }
            });
            set({ bills: mergedBills });
          }
          if (budgetsRes.data) {
            const { pendingMutations } = get();
            let mergedBudgets = budgetsRes.data.map((b: any) => ({
              id: b.id,
              category: b.category,
              monthlyLimit: b.monthly_limit,
              month: b.month,
              userId: b.user_id
            })) as Budget[];
            
            pendingMutations.forEach(mut => {
              if (mut.type === 'UPSERT_BUDGET') {
                const existing = mergedBudgets.find(b => b.id === mut.payload.id);
                if (existing) {
                  mergedBudgets = mergedBudgets.map(b => b.id === mut.payload.id ? {
                    ...b,
                    monthlyLimit: mut.payload.monthly_limit
                  } : b);
                } else {
                  mergedBudgets.push({
                    id: mut.payload.id,
                    category: mut.payload.category,
                    monthlyLimit: mut.payload.monthly_limit,
                    month: mut.payload.month,
                    userId: mut.payload.user_id
                  });
                }
              } else if (mut.type === 'DELETE_BUDGET') {
                mergedBudgets = mergedBudgets.filter(b => b.id !== mut.payload.id);
              }
            });
            set({ budgets: mergedBudgets });
          }
          if (settingsRes.data) {
            const s = settingsRes.data;
            set((state) => ({
              settings: {
                ...state.settings,
                monthlyIncome: s.monthly_income,
                currency: s.currency,
                darkMode: s.dark_mode,
                categories: s.categories || defaultCategories,
                carryForward: s.carry_forward,
                categoryBudgets: s.category_budgets || {},
                quickAdds: s.quick_adds || [],
                privacyMode: s.privacy_mode ?? true,
                theme: s.theme || 'default',
                categoryEmojis: s.category_emojis || {},
                notificationsEnabled: s.notifications_enabled || false,
                currentStreak: calculateStreak(state.expenses)
              }
            }));
          }
          if (wishlistRes.data) {
            const { pendingMutations } = get();
            let mergedWishlist = wishlistRes.data as WishlistItem[];
            
            pendingMutations.forEach(mut => {
              if (mut.type === 'INSERT_WISHLIST_ITEM') {
                mergedWishlist.push(mut.payload as WishlistItem);
              } else if (mut.type === 'UPDATE_WISHLIST_ITEM') {
                mergedWishlist = mergedWishlist.map(w => w.id === mut.payload.id ? { ...w, ...mut.payload } : w);
              } else if (mut.type === 'DELETE_WISHLIST_ITEM') {
                mergedWishlist = mergedWishlist.filter(w => w.id !== mut.payload.id);
              }
            });
            set({ wishlistItems: mergedWishlist });
          }

          if (debtsRes?.data) {
            const { pendingMutations } = get();
            let mergedDebts = debtsRes.data as Debt[];
            
            pendingMutations.forEach(mut => {
              if (mut.type === 'INSERT_DEBT') {
                mergedDebts.push(mut.payload as Debt);
              } else if (mut.type === 'UPDATE_DEBT') {
                mergedDebts = mergedDebts.map(d => d.id === mut.payload.id ? { ...d, ...mut.payload } : d);
              } else if (mut.type === 'DELETE_DEBT') {
                mergedDebts = mergedDebts.filter(d => d.id !== mut.payload.id);
              }
            });
            set({ debts: mergedDebts });
          }
        } catch (error) {
          console.error("Failed to fetch cloud data:", error);
        }
      },

      addExpense: async (expense) => {
        const id = crypto.randomUUID();
        const newExpense = { ...expense, id };
        
        // Gamification (Streak logic)
        const today = format(new Date(), 'yyyy-MM-dd');
        
        set((state) => {
          const updatedExpenses = [...state.expenses, newExpense];
          const newStreak = calculateStreak(updatedExpenses);
          return { 
            expenses: updatedExpenses,
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
            next_occurrence: newExpense.next_occurrence || null
          };
          addPendingMutation({ type: 'INSERT_EXPENSE', payload });
          syncPendingMutations();
        }
        return id;
      },
      
      updateExpense: (id, updatedFields) => {
        set((state) => {
          const updatedExpenses = state.expenses.map(e => e.id === id ? { ...e, ...updatedFields } : e);
          return {
            expenses: updatedExpenses,
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
              next_occurrence: expense.next_occurrence
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
          return {
            expenses: updatedExpenses,
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

        set((state) => ({
          expenses: updatedExpenses,
          recentlyDeleted: updatedRecentlyDeleted,
          settings: { ...state.settings, currentStreak: calculateStreak(updatedExpenses) }
        }));

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
            next_occurrence: restoredExpense.next_occurrence || null
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
      },
      
      addBill: (bill) => {
        const id = crypto.randomUUID();
        const newBill = { ...bill, id };
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
      },
      
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
      },
      
      addDebt: (debt) => {
        const id = crypto.randomUUID();
        const newDebt: Debt = { ...debt, id, created_at: new Date().toISOString() };
        set((state) => ({ debts: [...state.debts, newDebt] }));
        
        const { session, addPendingMutation, syncPendingMutations } = get();
        if (session) {
          addPendingMutation({
            type: 'INSERT_DEBT',
            payload: {
              ...newDebt,
              user_id: session.user.id
            }
          });
          syncPendingMutations();
        }
      },
      
      updateDebt: (id, updates) => {
        set((state) => ({
          debts: state.debts.map(d => d.id === id ? { ...d, ...updates } : d)
        }));
        
        const { session, addPendingMutation, syncPendingMutations } = get();
        if (session) {
          addPendingMutation({
            type: 'UPDATE_DEBT',
            payload: { id, ...updates }
          });
          syncPendingMutations();
        }
      },
      
      deleteDebt: (id) => {
        set((state) => ({ debts: state.debts.filter(d => d.id !== id) }));
        const { session, addPendingMutation, syncPendingMutations } = get();
        if (session) {
          addPendingMutation({ type: 'DELETE_DEBT', payload: { id } });
          syncPendingMutations();
        }
      },

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
      },
      
      updateSettings: (newSettings) => {
        set((state) => ({ settings: { ...state.settings, ...newSettings } }));
        const { session, settings } = get();
        if (session) {
          supabase.from('user_settings').upsert({
            user_id: session.user.id,
            monthly_income: settings.monthlyIncome,
            currency: settings.currency,
            dark_mode: settings.darkMode,
            categories: settings.categories,
            carry_forward: settings.carryForward,
            category_budgets: settings.categoryBudgets,
            quick_adds: settings.quickAdds,
            privacy_mode: settings.privacyMode,
            theme: settings.theme,
            category_emojis: settings.categoryEmojis,
            notifications_enabled: settings.notificationsEnabled,
            updated_at: new Date().toISOString()
          }).then(({ error }) => {
            if (error) console.error('Failed to save settings:', error);
          });
        }
      },

      addCategory: (category) => {
        const state = get();
        state.updateSettings({ categories: [...state.settings.categories, category] });
      },
      
      deleteCategory: (category) => {
        const state = get();
        const newCategories = state.settings.categories.filter(c => c !== category);
        const newBudgets = { ...state.settings.categoryBudgets };
        delete newBudgets[category];
        state.updateSettings({ categories: newCategories, categoryBudgets: newBudgets });
      },

      reorderCategories: (categories) => {
        const state = get();
        state.updateSettings({ categories });
      },

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
                category: newBudget.category,
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
      },

      clearData: async () => {
        set({
          expenses: [],
          bills: [],
          budgets: [],
          wishlistItems: [],
          debts: [],
          pendingMutations: [],
          recentlyDeleted: []
        });
      },

      checkMonthRollover: () => set((state) => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        let currentState = state;
        let newExpenses: Expense[] = [];

        if (state.lastActiveMonth !== currentMonth) {
          if (state.settings.carryForward) {
            const lastMonthExpenses = state.expenses.filter(e => e.date.startsWith(state.lastActiveMonth));
            const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
            const lastMonthBills = state.bills.reduce((sum, b) => sum + b.amount, 0);
            const remaining = state.settings.monthlyIncome - lastMonthTotal - lastMonthBills;
            
            if (remaining !== 0) {
              newExpenses.push({
                id: crypto.randomUUID(),
                amount: -remaining, 
                description: remaining > 0 ? 'Previous Month Carry Forward' : 'Previous Month Overspend',
                category: 'Other',
                date: new Date().toISOString(),
                notes: 'Automatically carried over'
              });
            }
          }
          
          state.bills.forEach(bill => {
            if (bill.autoDeduct) {
              newExpenses.push({
                id: crypto.randomUUID(),
                amount: bill.amount,
                description: `Auto-deduct: ${bill.title}`,
                category: 'Bills',
                date: new Date().toISOString(),
                notes: 'Automatically deducted for the new month'
              });
            }
          });
          
          currentState = {
            ...state,
            lastActiveMonth: currentMonth,
            expenses: [...state.expenses, ...newExpenses]
          };
        }

        // --- Process recurring expenses ---
        const now = new Date();
        const generatedExpenses: Expense[] = [];
        const updatedExpenses: Expense[] = [];

        currentState.expenses.forEach(expense => {
          if (expense.recurrence && expense.recurrence !== 'none' && expense.next_occurrence) {
            let nextOccurDate = new Date(expense.next_occurrence);
            
            // Generate all occurrences that have passed
            while (nextOccurDate <= now) {
              const clone: Expense = {
                ...expense,
                id: crypto.randomUUID(),
                date: nextOccurDate.toISOString(),
                recurrence: 'none',
                next_occurrence: null,
              };
              generatedExpenses.push(clone);

              // Calculate next date
              if (expense.recurrence === 'daily') {
                nextOccurDate.setDate(nextOccurDate.getDate() + 1);
              } else if (expense.recurrence === 'weekly') {
                nextOccurDate.setDate(nextOccurDate.getDate() + 7);
              } else if (expense.recurrence === 'monthly') {
                nextOccurDate.setMonth(nextOccurDate.getMonth() + 1);
              }
            }

            if (nextOccurDate.toISOString() !== expense.next_occurrence) {
              updatedExpenses.push({ ...expense, next_occurrence: nextOccurDate.toISOString() });
            }
          }
        });

        if (generatedExpenses.length > 0 || updatedExpenses.length > 0) {
          const { session } = get();
          
          if (session && generatedExpenses.length > 0) {
             // Bulk insert
             supabase.from('expenses').insert(generatedExpenses.map(e => ({
                id: e.id,
                user_id: session.user.id,
                amount: e.amount,
                description: e.description,
                category: e.category,
                date: e.date,
                notes: e.notes,
                receipt_url: e.receipt_url,
                recurrence: 'none',
                next_occurrence: null
             }))).then();
          }

          if (session && updatedExpenses.length > 0) {
             // Update the original expenses with new next_occurrence
             updatedExpenses.forEach(e => {
               supabase.from('expenses').update({ next_occurrence: e.next_occurrence }).eq('id', e.id).then();
             });
          }

          // Build final expenses array
          let finalExpenses = [...currentState.expenses, ...generatedExpenses];
          
          // Apply updates
          updatedExpenses.forEach(updatedE => {
             finalExpenses = finalExpenses.map(e => e.id === updatedE.id ? updatedE : e);
          });

          return { ...currentState, expenses: finalExpenses };
        }

        return currentState;
      }),
      
      eraseAllData: async () => {
        const { session } = get();
        if (session) {
          await Promise.all([
            supabase.from('expenses').delete().eq('user_id', session.user.id),
            supabase.from('bills').delete().eq('user_id', session.user.id),
            supabase.from('subscriptions').delete().eq('user_id', session.user.id),
            supabase.from('budgets').delete().eq('user_id', session.user.id),
            supabase.from('wishlist').delete().eq('user_id', session.user.id),
            supabase.from('debts').delete().eq('user_id', session.user.id),
            supabase.from('user_settings').delete().eq('user_id', session.user.id)
          ]);
          queryClient.removeQueries();
        }
        set({
          expenses: [],
          bills: [],
          subscriptions: [],
          budgets: [],
          wishlistItems: [],
          debts: [],
          pendingMutations: [],
          recentlyDeleted: [],
          settings: {
            monthlyIncome: 45000,
            currency: '₹',
            darkMode: true,
            categories: defaultCategories,
            carryForward: false,
            categoryBudgets: {},
            quickAdds: [
              { description: "Coffee", amount: 100, category: "Food", icon: "☕" },
              { description: "Fuel", amount: 500, category: "Fuel", icon: "🚗" },
              { description: "Grocery", amount: 200, category: "Grocery", icon: "🛒" }
            ]
          }
        });
      }
    }),
    {
      name: 'expense-tracker-storage',
    }
  )
);

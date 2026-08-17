import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
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
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  month: string;
  userId: string;
}

export type MutationType = 'INSERT_EXPENSE' | 'UPDATE_EXPENSE' | 'DELETE_EXPENSE' 
  | 'INSERT_BILL' | 'UPDATE_BILL' | 'DELETE_BILL' 
  | 'UPSERT_BUDGET' | 'DELETE_BUDGET';

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
}

interface ExpenseState {
  expenses: Expense[];
  bills: Bill[];
  settings: Settings;
  lastActiveMonth: string;
  session: Session | null;
  budgets: Budget[];
  pendingMutations: PendingMutation[];
  
  // Actions
  addPendingMutation: (mutation: Omit<PendingMutation, 'id'>) => void;
  removePendingMutation: (id: string) => void;
  syncPendingMutations: () => Promise<void>;
  // Actions
  setSession: (session: Session | null) => void;
  fetchCloudData: () => Promise<void>;
  
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  
  updateSettings: (settings: Partial<Settings>) => void;
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  
  updateBudget: (category: string, monthlyLimit: number, month: string) => void;
  
  
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
        privacyMode: true
      },
      lastActiveMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
      session: null,
      
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
              break; 
            }
          } catch (e) {
             console.error("Sync error:", e);
             break;
          }
        }
        (window as any).isSyncing = false;
      },

      setSession: (session) => set({ session }),
      
      fetchCloudData: async () => {
        const { session } = get();
        if (!session) return;
        
        try {
          const [expensesRes, billsRes, settingsRes, budgetsRes] = await Promise.all([
            supabase.from('expenses').select('*').eq('user_id', session.user.id),
            supabase.from('bills').select('*').eq('user_id', session.user.id),
            supabase.from('user_settings').select('*').eq('user_id', session.user.id).single(),
            supabase.from('budgets').select('*').eq('user_id', session.user.id)
          ]);

          if (expensesRes.data) set({ expenses: expensesRes.data as Expense[] });
          if (billsRes.data) set({ bills: billsRes.data as Bill[] });
          if (budgetsRes.data) {
            set({
              budgets: budgetsRes.data.map((b: any) => ({
                id: b.id,
                category: b.category,
                monthlyLimit: b.monthly_limit,
                month: b.month,
                userId: b.user_id
              }))
            });
          }
          if (settingsRes.data) {
            const s = settingsRes.data;
            set({ settings: {
              monthlyIncome: s.monthly_income,
              currency: s.currency,
              darkMode: s.dark_mode,
              categories: s.categories || defaultCategories,
              carryForward: s.carry_forward,
              categoryBudgets: s.category_budgets || {},
              quickAdds: s.quick_adds || []
            }});
          }
        } catch (error) {
          console.error("Failed to fetch cloud data:", error);
        }
      },

      addExpense: async (expense) => {
        const id = crypto.randomUUID();
        const newExpense = { ...expense, id };
        set((state) => ({ expenses: [...state.expenses, newExpense] }));
        
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
      },
      
      updateExpense: (id, updatedFields) => {
        set((state) => ({
          expenses: state.expenses.map(e => e.id === id ? { ...e, ...updatedFields } : e)
        }));
        
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
        const { session, expenses, addPendingMutation, syncPendingMutations } = get();
        const expenseToDelete = expenses.find(e => e.id === id);

        set((state) => ({ expenses: state.expenses.filter(e => e.id !== id) }));
        
        if (session) {
          queryClient.setQueryData(['expenses', session.user.id], (old: any) => {
             return old ? old.filter((e: any) => e.id !== id) : [];
          });
          addPendingMutation({ type: 'DELETE_EXPENSE', payload: { id } });
          syncPendingMutations();
        }

        if (expenseToDelete) {
          toast.success('Expense deleted', {
            action: {
              label: 'Undo',
              onClick: () => {
                set(state => ({ expenses: [...state.expenses, expenseToDelete] }));
                if (session) {
                  queryClient.setQueryData(['expenses', session.user.id], (old: any) => {
                     return old ? [...old, expenseToDelete] : [expenseToDelete];
                  });
                  addPendingMutation({ type: 'INSERT_EXPENSE', payload: {
                    id: expenseToDelete.id,
                    user_id: session.user.id,
                    amount: expenseToDelete.amount,
                    description: expenseToDelete.description,
                    category: expenseToDelete.category,
                    date: expenseToDelete.date,
                    notes: expenseToDelete.notes,
                    receipt_url: expenseToDelete.receipt_url,
                    recurrence: expenseToDelete.recurrence || 'none',
                    next_occurrence: expenseToDelete.next_occurrence || null
                  }});
                  syncPendingMutations();
                }
              }
            }
          });
        }
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
            category: newBill.category
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
              category: bill.category
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
            updated_at: new Date().toISOString()
          }).then();
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

      updateBudget: async (category, monthlyLimit, month) => {
        const { session, budgets, addPendingMutation, syncPendingMutations } = get();
        if (!session) return;

        const existingBudget = budgets.find(b => b.category === category && b.month === month);

        if (monthlyLimit <= 0) {
          if (existingBudget) {
            set(state => ({ budgets: state.budgets.filter(b => b.id !== existingBudget.id) }));
            queryClient.setQueryData(['budgets', session.user.id], (old: any) => {
               return old ? old.filter((b: any) => b.id !== existingBudget.id) : [];
            });
            addPendingMutation({ type: 'DELETE_BUDGET', payload: { id: existingBudget.id } });
            syncPendingMutations();
          }
          return;
        }

        if (existingBudget) {
          set(state => ({
            budgets: state.budgets.map(b => b.id === existingBudget.id ? { ...b, monthlyLimit } : b)
          }));
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
        } else {
          const newBudget = {
            id: crypto.randomUUID(),
            category,
            monthlyLimit,
            month,
            userId: session.user.id
          };
          set(state => ({ budgets: [...state.budgets, newBudget] }));
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
                // Keep the original description or append info? Just keep it.
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
                recurrence: e.recurrence,
                next_occurrence: e.next_occurrence
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
            supabase.from('user_settings').delete().eq('user_id', session.user.id)
          ]);
        }
        set({
          expenses: [],
          bills: [],
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

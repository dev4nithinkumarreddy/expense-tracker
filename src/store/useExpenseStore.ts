import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO string
  notes?: string;
  receipt_url?: string;
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
}

interface ExpenseState {
  expenses: Expense[];
  bills: Bill[];
  settings: Settings;
  lastActiveMonth: string;
  session: Session | null;
  
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
  
  checkMonthRollover: () => void;
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
      },
      lastActiveMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
      session: null,
      
      setSession: (session) => set({ session }),
      
      fetchCloudData: async () => {
        const { session } = get();
        if (!session) return;
        
        try {
          const [expensesRes, billsRes, settingsRes] = await Promise.all([
            supabase.from('expenses').select('*').eq('user_id', session.user.id),
            supabase.from('bills').select('*').eq('user_id', session.user.id),
            supabase.from('user_settings').select('*').eq('user_id', session.user.id).single()
          ]);

          if (expensesRes.data) set({ expenses: expensesRes.data as Expense[] });
          if (billsRes.data) set({ bills: billsRes.data as Bill[] });
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
        
        const { session } = get();
        if (session) {
          supabase.from('expenses').insert({
            id: newExpense.id,
            user_id: session.user.id,
            amount: newExpense.amount,
            description: newExpense.description,
            category: newExpense.category,
            date: newExpense.date,
            notes: newExpense.notes,
            receipt_url: newExpense.receipt_url
          }).then();
        }
      },
      
      updateExpense: (id, updatedFields) => {
        set((state) => ({
          expenses: state.expenses.map(e => e.id === id ? { ...e, ...updatedFields } : e)
        }));
        
        const { session, expenses } = get();
        if (session) {
          const expense = expenses.find(e => e.id === id);
          if (expense) {
            supabase.from('expenses').update({
              amount: expense.amount,
              description: expense.description,
              category: expense.category,
              date: expense.date,
              notes: expense.notes,
              receipt_url: expense.receipt_url
            }).eq('id', id).then();
          }
        }
      },
      
      deleteExpense: (id) => {
        set((state) => ({ expenses: state.expenses.filter(e => e.id !== id) }));
        const { session } = get();
        if (session) supabase.from('expenses').delete().eq('id', id).then();
      },
      
      addBill: (bill) => {
        const id = crypto.randomUUID();
        const newBill = { ...bill, id };
        set((state) => ({ bills: [...state.bills, newBill] }));
        
        const { session } = get();
        if (session) {
          supabase.from('bills').insert({
            id: newBill.id,
            user_id: session.user.id,
            title: newBill.title,
            amount: newBill.amount,
            auto_deduct: newBill.autoDeduct,
            category: newBill.category
          }).then();
        }
      },
      
      updateBill: (id, updatedFields) => {
        set((state) => ({
          bills: state.bills.map(b => b.id === id ? { ...b, ...updatedFields } : b)
        }));
        
        const { session, bills } = get();
        if (session) {
          const bill = bills.find(b => b.id === id);
          if (bill) {
            supabase.from('bills').update({
              title: bill.title,
              amount: bill.amount,
              auto_deduct: bill.autoDeduct,
              category: bill.category
            }).eq('id', id).then();
          }
        }
      },
      
      deleteBill: (id) => {
        set((state) => ({ bills: state.bills.filter(b => b.id !== id) }));
        const { session } = get();
        if (session) supabase.from('bills').delete().eq('id', id).then();
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

      addCategory: (category) => set((state) => ({
        settings: { ...state.settings, categories: [...state.settings.categories, category] }
      })),
      
      deleteCategory: (category) => set((state) => ({
        settings: { ...state.settings, categories: state.settings.categories.filter(c => c !== category) }
      })),
      
      checkMonthRollover: () => set((state) => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        if (state.lastActiveMonth !== currentMonth) {
          const newExpenses: Expense[] = [];
          
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
          
          return {
            lastActiveMonth: currentMonth,
            expenses: [...state.expenses, ...newExpenses]
          };
        }
        return state;
      })
    }),
    {
      name: 'expense-tracker-storage',
    }
  )
);

import type { StateCreator } from 'zustand';
import { defaultCategories, type ExpenseState, type SettingsSlice } from '../types';

export const createSettingsSlice: StateCreator<ExpenseState, [], [], SettingsSlice> = (set, get) => ({
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

  updateSettings: (newSettings) => {
    set((state) => ({ settings: { ...state.settings, ...newSettings } }));
    const { session, settings, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({
        type: 'UPDATE_SETTINGS',
        payload: {
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
          user_name: settings.userName,
          updated_at: new Date().toISOString()
        }
      });
      syncPendingMutations();
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
  }
});

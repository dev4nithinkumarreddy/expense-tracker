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
    // IMPORTANT: read settings from get() AFTER set() so we capture the merged/updated values
    const { session, settings: updatedSettings, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({
        type: 'UPDATE_SETTINGS',
        payload: {
          user_id: session.user.id,
          monthly_income: updatedSettings.monthlyIncome,
          currency: updatedSettings.currency,
          dark_mode: updatedSettings.darkMode,
          categories: updatedSettings.categories,
          carry_forward: updatedSettings.carryForward,
          category_budgets: updatedSettings.categoryBudgets,
          quick_adds: updatedSettings.quickAdds,
          privacy_mode: updatedSettings.privacyMode,
          theme: updatedSettings.theme,
          category_emojis: updatedSettings.categoryEmojis,
          notifications_enabled: updatedSettings.notificationsEnabled,
          user_name: updatedSettings.userName,
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

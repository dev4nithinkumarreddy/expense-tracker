import type { StateCreator } from 'zustand';
import { defaultCategories, type ExpenseState, type SettingsSlice } from '../types';

export const defaultDashboardWidgets = {
  safeToSpend: true,
  budgetRing: true,
  accountsBar: true,
  categoryBudgets: true,
  quickAdds: true,
  weeklyTrend: true,
  upcomingBills: true,
  recentActivity: true,
};

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
    upiId: '',
    soundEnabled: false,
    dashboardMode: 'detailed',
    dashboardWidgets: { ...defaultDashboardWidgets },
    isGuestMode: false,
    settingsInitialized: false,
    updated_at: undefined
  },

  updateSettings: (newSettings) => {
    const updatedAt = new Date().toISOString();
    set((state) => {
      const sanitizedCategories = newSettings.categories
        ? Array.from(new Set(newSettings.categories.map(c => typeof c === 'string' ? c.trim() : '').filter(Boolean)))
        : state.settings.categories;

      return {
        settings: {
          ...state.settings,
          ...newSettings,
          categories: sanitizedCategories,
          settingsInitialized: true,
          updated_at: updatedAt
        }
      };
    });
    // IMPORTANT: read settings from get() AFTER set() so we capture the merged/updated values
    const { session, settings: updatedSettings, addPendingMutation, syncPendingMutations } = get();
    addPendingMutation({
      type: 'UPDATE_SETTINGS',
      payload: {
        user_id: session?.user?.id || '',
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
        upi_id: updatedSettings.upiId,
        updated_at: updatedAt
      }
    });
    if (session) {
      syncPendingMutations();
    }
  },

  addCategory: (category) => {
    const trimmed = typeof category === 'string' ? category.trim() : '';
    if (!trimmed) return;
    const state = get();
    if (state.settings.categories.includes(trimmed)) return;
    state.updateSettings({ categories: [...state.settings.categories, trimmed] });
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

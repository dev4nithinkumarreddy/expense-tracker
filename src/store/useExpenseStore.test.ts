import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExpenseStore } from './useExpenseStore';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => Math.random().toString(36).substring(2, 9)
});

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    }))
  }
}));

describe('useExpenseStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useExpenseStore.setState({
      expenses: [],
      bills: [],
      budgets: [],
      pendingMutations: [],
      session: { user: { id: 'test-user-id' } } as any
    });
  });

  it('should add an expense and push to pending mutations', () => {
    const store = useExpenseStore.getState();
    store.addExpense({
      amount: 100,
      description: 'Coffee',
      category: 'Food',
      date: new Date().toISOString()
    });

    const newState = useExpenseStore.getState();
    expect(newState.expenses.length).toBe(1);
    expect(newState.expenses[0].amount).toBe(100);
    expect(newState.pendingMutations.length).toBe(1);
    expect(newState.pendingMutations[0].type).toBe('INSERT_EXPENSE');
  });

  it('should update an expense', () => {
    const store = useExpenseStore.getState();
    store.addExpense({
      amount: 100,
      description: 'Coffee',
      category: 'Food',
      date: new Date().toISOString()
    });

    const addedExpense = useExpenseStore.getState().expenses[0];
    useExpenseStore.getState().updateExpense(addedExpense.id, { amount: 150 });

    const newState = useExpenseStore.getState();
    expect(newState.expenses[0].amount).toBe(150);
  });

  it('should auto-generate recurring expenses on month rollover', () => {
    const store = useExpenseStore.getState();
    // Set a past month
    useExpenseStore.setState({ lastActiveMonth: '2023-01' });

    // Add a recurring expense that should have occurred multiple times
    store.addExpense({
      amount: 50,
      description: 'Subscription',
      category: 'Entertainment',
      date: '2023-01-01T00:00:00.000Z',
      recurrence: 'monthly',
      next_occurrence: '2023-02-01T00:00:00.000Z'
    });

    // Check rollover
    useExpenseStore.getState().checkMonthRollover();

    const newState = useExpenseStore.getState();
    // Should have generated expenses for passed months
    expect(newState.expenses.length).toBeGreaterThan(1);
    
    // Original expense should have its next_occurrence updated to the future
    const original = newState.expenses.find(e => e.description === 'Subscription');
    expect(new Date(original!.next_occurrence!).getTime()).toBeGreaterThan(new Date('2023-02-01').getTime());
  });

  it('should update streak when adding expenses across consecutive days', async () => {
    const store = useExpenseStore.getState();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // Add expense for yesterday
    await store.addExpense({
      amount: 50,
      description: 'Lunch',
      category: 'Food',
      date: yesterday.toISOString()
    });

    expect(useExpenseStore.getState().settings.currentStreak).toBe(1);

    // Add expense for today
    await store.addExpense({
      amount: 100,
      description: 'Dinner',
      category: 'Food',
      date: today.toISOString()
    });

    // Streak should now be 2
    expect(useExpenseStore.getState().settings.currentStreak).toBe(2);

    // Adding another expense today shouldn't increase streak past 2
    await store.addExpense({
      amount: 30,
      description: 'Snack',
      category: 'Food',
      date: today.toISOString()
    });

    expect(useExpenseStore.getState().settings.currentStreak).toBe(2);
  });

  it('should recalculate streak when an expense is deleted', async () => {
    const store = useExpenseStore.getState();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    await store.addExpense({
      amount: 50,
      description: 'Lunch',
      category: 'Food',
      date: yesterday.toISOString()
    });

    await store.addExpense({
      amount: 100,
      description: 'Dinner',
      category: 'Food',
      date: today.toISOString()
    });

    expect(useExpenseStore.getState().settings.currentStreak).toBe(2);

    const todayExpense = useExpenseStore.getState().expenses.find(e => e.description === 'Dinner');
    store.deleteExpense(todayExpense!.id);

    // Since today's expense was deleted, streak falls back to yesterday's active streak (1)
    expect(useExpenseStore.getState().settings.currentStreak).toBe(1);
  });

  it('should reorder categories properly', () => {
    const store = useExpenseStore.getState();
    const initialCategories = ['Food', 'Grocery', 'Fuel', 'Shopping'];
    useExpenseStore.setState({
      settings: {
        ...useExpenseStore.getState().settings,
        categories: initialCategories
      }
    });

    const newOrder = ['Shopping', 'Fuel', 'Grocery', 'Food'];
    store.reorderCategories(newOrder);

    expect(useExpenseStore.getState().settings.categories).toEqual(newOrder);
  });

  it('should generate recurring clones with recurrence: none and next_occurrence: null', () => {
    const store = useExpenseStore.getState();
    useExpenseStore.setState({ lastActiveMonth: '2023-01' });

    store.addExpense({
      amount: 50,
      description: 'Gym Membership',
      category: 'Health',
      date: '2023-01-01T00:00:00.000Z',
      recurrence: 'monthly',
      next_occurrence: '2023-02-01T00:00:00.000Z'
    });

    store.checkMonthRollover();

    const expenses = useExpenseStore.getState().expenses;
    const clones = expenses.filter(e => e.description === 'Gym Membership' && e.id !== expenses[0].id);
    expect(clones.length).toBeGreaterThan(0);
    clones.forEach(clone => {
      expect(clone.recurrence).toBe('none');
      expect(clone.next_occurrence).toBeNull();
    });
  });

  it('should update and delete budgets even when offline or guest (session is null)', async () => {
    useExpenseStore.setState({ session: null, budgets: [] });
    const store = useExpenseStore.getState();

    await store.updateBudget('Food', 5000, '2026-09');
    let state = useExpenseStore.getState();
    expect(state.budgets.length).toBe(1);
    expect(state.budgets[0].category).toBe('Food');
    expect(state.budgets[0].monthlyLimit).toBe(5000);

    // Update existing
    await store.updateBudget('Food', 6000, '2026-09');
    state = useExpenseStore.getState();
    expect(state.budgets.length).toBe(1);
    expect(state.budgets[0].monthlyLimit).toBe(6000);

    // Delete by setting <= 0
    await store.updateBudget('Food', 0, '2026-09');
    state = useExpenseStore.getState();
    expect(state.budgets.length).toBe(0);
  });

  it('should completely wipe all collections on eraseAllData', async () => {
    useExpenseStore.setState({
      expenses: [{ id: '1', amount: 10, description: 'Tea', category: 'Food', date: new Date().toISOString() }],
      bills: [{ id: '1', title: 'Wifi', amount: 1000, category: 'Bills', autoDeduct: false }],
      subscriptions: [{ id: '1', name: 'Netflix', amount: 499, billing_cycle: 'monthly', next_billing_date: '2026-10-01', category: 'Entertainment' }],
      budgets: [{ id: '1', category: 'Food', monthlyLimit: 5000, month: '2026-09', userId: 'test' }],
      pendingMutations: [{ type: 'INSERT_EXPENSE', payload: {} }] as any,
      session: null
    });

    await useExpenseStore.getState().eraseAllData();

    const state = useExpenseStore.getState();
    expect(state.expenses).toEqual([]);
    expect(state.bills).toEqual([]);
    expect(state.subscriptions).toEqual([]);
    expect(state.budgets).toEqual([]);
    expect(state.pendingMutations).toEqual([]);
  });
});

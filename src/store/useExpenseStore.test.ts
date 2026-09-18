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
});

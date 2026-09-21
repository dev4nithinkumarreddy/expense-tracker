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
      recentlyDeleted: [],
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

  it('should return the generated ID on addExpense to support 1-tap duplicate with instant undo', async () => {
    const store = useExpenseStore.getState();
    const newId = await store.addExpense({
      amount: 150,
      description: 'Morning Coffee',
      category: 'Food',
      date: new Date().toISOString()
    });

    expect(typeof newId).toBe('string');
    expect(newId.length).toBeGreaterThan(0);
    
    // Check expense is stored with this ID
    let state = useExpenseStore.getState();
    const added = state.expenses.find(e => e.id === newId);
    expect(added).toBeDefined();
    expect(added?.description).toBe('Morning Coffee');

    // Simulate undo
    store.deleteExpense(newId);
    state = useExpenseStore.getState();
    expect(state.expenses.find(e => e.id === newId)).toBeUndefined();
  });

  it('should preserve deleted expenses in recentlyDeleted and allow restoration', async () => {
    const store = useExpenseStore.getState();
    const id = await store.addExpense({
      amount: 450,
      description: 'Groceries',
      category: 'Grocery',
      date: new Date().toISOString()
    });

    // Delete the expense
    store.deleteExpense(id);

    let state = useExpenseStore.getState();
    expect(state.expenses.length).toBe(0);
    expect(state.recentlyDeleted.length).toBe(1);
    expect(state.recentlyDeleted[0].expense.id).toBe(id);
    expect(state.recentlyDeleted[0].expense.description).toBe('Groceries');
    expect(state.recentlyDeleted[0].deletedAt).toBeDefined();

    // Restore the expense
    await store.restoreExpense(id);

    state = useExpenseStore.getState();
    expect(state.expenses.length).toBe(1);
    expect(state.expenses[0].id).toBe(id);
    expect(state.expenses[0].description).toBe('Groceries');
    expect(state.recentlyDeleted.length).toBe(0);
  });

  it('should permanently delete an expense from recentlyDeleted', async () => {
    const store = useExpenseStore.getState();
    const id = await store.addExpense({
      amount: 200,
      description: 'Book',
      category: 'Shopping',
      date: new Date().toISOString()
    });

    store.deleteExpense(id);
    expect(useExpenseStore.getState().recentlyDeleted.length).toBe(1);

    await store.permanentlyDeleteExpense(id);
    expect(useExpenseStore.getState().recentlyDeleted.length).toBe(0);
    expect(useExpenseStore.getState().expenses.length).toBe(0);
  });

  it('should empty all recentlyDeleted items on clearRecentlyDeleted', async () => {
    const store = useExpenseStore.getState();
    const id1 = await store.addExpense({ amount: 100, description: 'Item 1', category: 'Other', date: new Date().toISOString() });
    const id2 = await store.addExpense({ amount: 200, description: 'Item 2', category: 'Other', date: new Date().toISOString() });

    store.deleteExpense(id1);
    store.deleteExpense(id2);

    expect(useExpenseStore.getState().recentlyDeleted.length).toBe(2);

    await store.clearRecentlyDeleted();
    expect(useExpenseStore.getState().recentlyDeleted.length).toBe(0);
  });

  describe('Planned module: Bills, Subscriptions, Debts, and Wishlist', () => {
    it('should add, update, and delete bills', () => {
      const store = useExpenseStore.getState();
      store.addBill({
        title: 'Electricity',
        amount: 1500,
        autoDeduct: true,
        category: 'Bills'
      });

      let state = useExpenseStore.getState();
      expect(state.bills.length).toBe(1);
      expect(state.bills[0].title).toBe('Electricity');
      expect(state.bills[0].autoDeduct).toBe(true);

      const billId = state.bills[0].id;
      store.updateBill(billId, { amount: 1650 });
      state = useExpenseStore.getState();
      expect(state.bills[0].amount).toBe(1650);

      store.deleteBill(billId);
      state = useExpenseStore.getState();
      expect(state.bills.length).toBe(0);
    });

    it('should auto-deduct bills on month rollover', () => {
      const store = useExpenseStore.getState();
      useExpenseStore.setState({ lastActiveMonth: '2023-01', expenses: [] });
      store.addBill({
        title: 'Internet',
        amount: 999,
        autoDeduct: true,
        category: 'Bills'
      });
      store.addBill({
        title: 'Gym',
        amount: 2000,
        autoDeduct: false,
        category: 'Bills'
      });

      store.checkMonthRollover();

      const state = useExpenseStore.getState();
      const autoDeducted = state.expenses.filter(e => e.description.includes('Auto-deduct'));
      expect(autoDeducted.length).toBe(1);
      expect(autoDeducted[0].amount).toBe(999);
      expect(autoDeducted[0].description).toBe('Auto-deduct: Internet');
    });

    it('should carry forward surplus on month rollover when enabled', () => {
      const store = useExpenseStore.getState();
      useExpenseStore.setState({
        lastActiveMonth: '2023-01',
        settings: {
          ...useExpenseStore.getState().settings,
          monthlyIncome: 30000,
          carryForward: true
        },
        expenses: [
          { id: '1', amount: 10000, description: 'Rent', category: 'Bills', date: '2023-01-10T00:00:00.000Z' }
        ],
        bills: []
      });

      store.checkMonthRollover();

      const state = useExpenseStore.getState();
      const carryForwardExpense = state.expenses.find(e => e.description === 'Previous Month Carry Forward');
      expect(carryForwardExpense).toBeDefined();
      expect(carryForwardExpense?.amount).toBe(-20000);
    });

    it('should add, update, and delete subscriptions', () => {
      const store = useExpenseStore.getState();
      store.addSubscription({
        name: 'Spotify',
        amount: 119,
        billing_cycle: 'monthly',
        next_billing_date: '2026-10-15',
        category: 'Entertainment'
      });

      let state = useExpenseStore.getState();
      expect(state.subscriptions.length).toBe(1);
      expect(state.subscriptions[0].name).toBe('Spotify');

      const subId = state.subscriptions[0].id;
      store.updateSubscription(subId, { amount: 129 });
      state = useExpenseStore.getState();
      expect(state.subscriptions[0].amount).toBe(129);

      store.deleteSubscription(subId);
      state = useExpenseStore.getState();
      expect(state.subscriptions.length).toBe(0);
    });

    it('should add, update, and delete debts (IOUs)', () => {
      const store = useExpenseStore.getState();
      store.addDebt({
        person_name: 'Rahul',
        amount: 500,
        type: 'lent',
        status: 'pending',
        date: '2026-09-20'
      });

      let state = useExpenseStore.getState();
      expect(state.debts.length).toBe(1);
      expect(state.debts[0].person_name).toBe('Rahul');
      expect(state.debts[0].type).toBe('lent');

      const debtId = state.debts[0].id;
      store.updateDebt(debtId, { status: 'settled' });
      state = useExpenseStore.getState();
      expect(state.debts[0].status).toBe('settled');

      store.deleteDebt(debtId);
      state = useExpenseStore.getState();
      expect(state.debts.length).toBe(0);
    });

    it('should add, update, and delete wishlist items', () => {
      const store = useExpenseStore.getState();
      store.addWishlistItem({
        item_name: 'Mechanical Keyboard',
        estimated_amount: 4500,
        category: 'Shopping'
      });

      let state = useExpenseStore.getState();
      expect(state.wishlistItems.length).toBe(1);
      expect(state.wishlistItems[0].item_name).toBe('Mechanical Keyboard');
      expect(state.wishlistItems[0].is_purchased).toBe(false);

      const wishId = state.wishlistItems[0].id;
      store.updateWishlistItem(wishId, { is_purchased: true });
      state = useExpenseStore.getState();
      expect(state.wishlistItems[0].is_purchased).toBe(true);

      store.deleteWishlistItem(wishId);
      state = useExpenseStore.getState();
      expect(state.wishlistItems.length).toBe(0);
    });

    it('should sanitize due_date when adding a bill without due_date', () => {
      const store = useExpenseStore.getState();
      store.addBill({
        title: 'PG Rent',
        amount: 7000,
        autoDeduct: true,
        category: 'Bills',
        due_day: 5
      });

      const state = useExpenseStore.getState();
      expect(state.bills.length).toBe(1);
      expect(state.bills[0].title).toBe('PG Rent');
      expect(state.pendingMutations.length).toBe(1);
      const billMutation = state.pendingMutations[0];
      expect(billMutation.type).toBe('INSERT_BILL');
      expect(billMutation.payload.due_date).toBeUndefined();
      expect(billMutation.payload.due_day).toBe(5);
    });

    it('should add, reorder, and delete categories', () => {
      const store = useExpenseStore.getState();
      const initialCount = store.settings.categories.length;

      store.addCategory('Investment');
      let state = useExpenseStore.getState();
      expect(state.settings.categories).toContain('Investment');
      expect(state.settings.categories.length).toBe(initialCount + 1);

      store.reorderCategories(['Investment', ...state.settings.categories.filter(c => c !== 'Investment')]);
      state = useExpenseStore.getState();
      expect(state.settings.categories[0]).toBe('Investment');

      store.deleteCategory('Investment');
      state = useExpenseStore.getState();
      expect(state.settings.categories).not.toContain('Investment');
    });

    it('should wipe state cleanly on eraseAllData', async () => {
      const store = useExpenseStore.getState();
      store.addBill({ title: 'Bill', amount: 500, autoDeduct: false, category: 'Bills' });
      store.addDebt({ person_name: 'Person', amount: 200, type: 'lent', status: 'pending', date: '2026-09-21' });

      expect(useExpenseStore.getState().bills.length).toBe(1);
      expect(useExpenseStore.getState().debts.length).toBe(1);

      await store.eraseAllData();

      const state = useExpenseStore.getState();
      expect(state.expenses.length).toBe(0);
      expect(state.bills.length).toBe(0);
      expect(state.debts.length).toBe(0);
      expect(state.subscriptions.length).toBe(0);
      expect(state.budgets.length).toBe(0);
      expect(state.wishlistItems.length).toBe(0);
    });
  });
});


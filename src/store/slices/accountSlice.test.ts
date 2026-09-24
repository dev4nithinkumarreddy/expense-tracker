import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExpenseStore } from '../useExpenseStore';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => Math.random().toString(36).substring(2, 9),
});

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
    })),
  },
}));

describe('accountSlice', () => {
  beforeEach(() => {
    useExpenseStore.setState({
      expenses: [],
      pendingMutations: [],
      accounts: [
        { id: 'acc-bank', name: 'Main Bank', type: 'bank', balance: 10000, currency: '₹' },
        { id: 'acc-cash', name: 'Cash', type: 'cash', balance: 2000, currency: '₹' },
        { id: 'acc-card', name: 'Credit Card', type: 'credit_card', balance: 500, credit_limit: 50000, currency: '₹' },
      ],
      session: { user: { id: 'test-user-id' } } as any,
    });
  });

  it('adds an account and queues an INSERT_ACCOUNT mutation when logged in', async () => {
    vi.spyOn(useExpenseStore.getState(), 'syncPendingMutations').mockImplementation(async () => {});

    const store = useExpenseStore.getState();
    const newId = await store.addAccount({
      name: 'Savings Pot',
      type: 'savings',
      balance: 15000,
      currency: '₹',
    });

    const state = useExpenseStore.getState();
    const created = state.accounts.find((a) => a.id === newId);
    expect(created).toBeDefined();
    expect(created?.name).toBe('Savings Pot');
    expect(created?.balance).toBe(15000);

    const mutation = state.pendingMutations.find((m) => m.type === 'INSERT_ACCOUNT');
    expect(mutation).toBeDefined();
    expect(mutation?.payload.name).toBe('Savings Pot');
  });

  it('updates an account and queues UPDATE_ACCOUNT', () => {
    const store = useExpenseStore.getState();
    store.updateAccount('acc-bank', { balance: 12000, name: 'HDFC Bank' });

    const state = useExpenseStore.getState();
    const updated = state.accounts.find((a) => a.id === 'acc-bank');
    expect(updated?.balance).toBe(12000);
    expect(updated?.name).toBe('HDFC Bank');

    const mutation = state.pendingMutations.find((m) => m.type === 'UPDATE_ACCOUNT');
    expect(mutation).toBeDefined();
  });

  it('deletes an account and queues DELETE_ACCOUNT', () => {
    const store = useExpenseStore.getState();
    store.deleteAccount('acc-cash');

    const state = useExpenseStore.getState();
    expect(state.accounts.find((a) => a.id === 'acc-cash')).toBeUndefined();

    const mutation = state.pendingMutations.find((m) => m.type === 'DELETE_ACCOUNT');
    expect(mutation).toBeDefined();
  });

  it('transfers funds between accounts and records a transfer expense', async () => {
    const store = useExpenseStore.getState();
    await store.transferFunds('acc-bank', 'acc-cash', 1500, 'ATM withdrawal');

    const state = useExpenseStore.getState();
    const bank = state.accounts.find((a) => a.id === 'acc-bank');
    const cash = state.accounts.find((a) => a.id === 'acc-cash');

    expect(bank?.balance).toBe(8500); // 10000 - 1500
    expect(cash?.balance).toBe(3500); // 2000 + 1500

    expect(state.expenses.length).toBe(1);
    expect(state.expenses[0].amount).toBe(1500);
    expect(state.expenses[0].category).toBe('Transfer');
  });

  it('deducts from bank account balance when logging an expense with account_id', async () => {
    const store = useExpenseStore.getState();
    await store.addExpense({
      amount: 450,
      description: 'Dinner with friends',
      category: 'Food',
      date: new Date().toISOString(),
      account_id: 'acc-bank',
    });

    const state = useExpenseStore.getState();
    const bank = state.accounts.find((a) => a.id === 'acc-bank');
    expect(bank?.balance).toBe(9550); // 10000 - 450
  });

  it('increases owed balance on credit card when logging an expense with credit card account_id', async () => {
    const store = useExpenseStore.getState();
    await store.addExpense({
      amount: 1200,
      description: 'Flight tickets',
      category: 'Travel',
      date: new Date().toISOString(),
      account_id: 'acc-card',
    });

    const state = useExpenseStore.getState();
    const card = state.accounts.find((a) => a.id === 'acc-card');
    expect(card?.balance).toBe(1700); // 500 + 1200
  });

  it('increases bank account balance when logging an income transaction', async () => {
    const store = useExpenseStore.getState();
    await store.addExpense({
      amount: 5000,
      description: 'Freelance bonus',
      category: 'Income',
      date: new Date().toISOString(),
      account_id: 'acc-bank',
    });

    const state = useExpenseStore.getState();
    const bank = state.accounts.find((a) => a.id === 'acc-bank');
    expect(bank?.balance).toBe(15000); // 10000 + 5000
  });

  it('reconciles dummy placeholder accounts with real remaining budget', () => {
    useExpenseStore.setState({
      settings: { monthlyIncome: 15000, currency: '₹' } as any,
      expenses: [
        { id: 'e1', amount: 14600, description: 'Rent', category: 'Bills', date: new Date().toISOString() },
      ],
      bills: [],
      subscriptions: [],
      accounts: [
        { id: 'acc-bank-1', name: 'Main Bank', type: 'bank', balance: 25000, currency: '₹' },
        { id: 'acc-cash-1', name: 'Cash Wallet', type: 'cash', balance: 2500, currency: '₹' },
      ],
    });

    const store = useExpenseStore.getState();
    store.reconcileAccountsWithBudget();

    const state = useExpenseStore.getState();
    const bank = state.accounts.find((a) => a.id === 'acc-bank-1');
    const cash = state.accounts.find((a) => a.id === 'acc-cash-1');

    // 15000 - 14600 = 400
    expect(bank?.balance).toBe(400);
    expect(cash?.balance).toBe(0);
  });

  it('reverts account balances when a transfer transaction is deleted', async () => {
    const store = useExpenseStore.getState();
    await store.transferFunds('acc-bank', 'acc-cash', 1000, 'ATM cash');

    let state = useExpenseStore.getState();
    expect(state.accounts.find((a) => a.id === 'acc-bank')?.balance).toBe(9000);
    expect(state.accounts.find((a) => a.id === 'acc-cash')?.balance).toBe(3000);

    const transferExp = state.expenses[0];
    expect(transferExp).toBeDefined();

    store.deleteExpense(transferExp.id);

    state = useExpenseStore.getState();
    // Bank should get 1000 back, cash should lose 1000
    expect(state.accounts.find((a) => a.id === 'acc-bank')?.balance).toBe(10000);
    expect(state.accounts.find((a) => a.id === 'acc-cash')?.balance).toBe(2000);
  });

  it('reduces credit card debt when transferring from bank to credit card', async () => {
    const store = useExpenseStore.getState();
    // Initial: bank 10000, credit card balance 500 (debt)
    await store.transferFunds('acc-bank', 'acc-card', 300, 'Card payment');

    const state = useExpenseStore.getState();
    expect(state.accounts.find((a) => a.id === 'acc-bank')?.balance).toBe(9700); // 10000 - 300
    expect(state.accounts.find((a) => a.id === 'acc-card')?.balance).toBe(200); // 500 - 300
  });

  it('syncs primary bank balance so combined liquid funds (Bank + Cash) match remaining budget', () => {
    useExpenseStore.setState({
      settings: { monthlyIncome: 10000, currency: '₹' } as any,
      expenses: [
        { id: 'e1', amount: 9600, description: 'Groceries', category: 'Food', date: new Date().toISOString() },
      ],
      bills: [],
      subscriptions: [],
      accounts: [
        { id: 'acc-bank', name: 'Main Bank', type: 'bank', balance: 0, currency: '₹' },
        { id: 'acc-cash', name: 'Cash', type: 'cash', balance: 100, currency: '₹' },
      ],
    });

    const store = useExpenseStore.getState();
    // Available remaining = 10000 - 9600 = 400
    // With 100 already in cash, bank should reconcile to 300 so total = 400
    store.syncAccountWithBalance('acc-bank');

    const state = useExpenseStore.getState();
    const bank = state.accounts.find((a) => a.id === 'acc-bank');
    const cash = state.accounts.find((a) => a.id === 'acc-cash');
    expect(bank?.balance).toBe(300);
    expect(cash?.balance).toBe(100);
    expect((bank?.balance ?? 0) + (cash?.balance ?? 0)).toBe(400);
  });

  it('syncs both bank and cash to 0 when remaining budget is completely depleted (0)', () => {
    useExpenseStore.setState({
      settings: { monthlyIncome: 15000, currency: '₹' } as any,
      expenses: [
        { id: 'e1', amount: 15000, description: 'All Budget Spent', category: 'General', date: new Date().toISOString() },
      ],
      bills: [],
      subscriptions: [],
      accounts: [
        { id: 'acc-bank', name: 'Main Bank', type: 'bank', balance: 0, currency: '₹' },
        { id: 'acc-cash', name: 'Cash Wallet', type: 'cash', balance: 100, currency: '₹' },
      ],
    });

    const store = useExpenseStore.getState();
    // Remaining budget = 0
    store.syncAccountWithBalance();

    const state = useExpenseStore.getState();
    const bank = state.accounts.find((a) => a.id === 'acc-bank');
    const cash = state.accounts.find((a) => a.id === 'acc-cash');
    expect(bank?.balance).toBe(0);
    expect(cash?.balance).toBe(0);
    expect((bank?.balance ?? 0) + (cash?.balance ?? 0)).toBe(0);
  });

  it('syncs cash down when remaining budget is low (less than cash balance)', () => {
    useExpenseStore.setState({
      settings: { monthlyIncome: 1000, currency: '₹' } as any,
      expenses: [
        { id: 'e1', amount: 960, description: 'Most Budget Spent', category: 'General', date: new Date().toISOString() },
      ],
      bills: [],
      subscriptions: [],
      accounts: [
        { id: 'acc-bank', name: 'Main Bank', type: 'bank', balance: 0, currency: '₹' },
        { id: 'acc-cash', name: 'Cash Wallet', type: 'cash', balance: 100, currency: '₹' },
      ],
    });

    const store = useExpenseStore.getState();
    // Remaining budget = 40 (which is less than 100 in cash)
    store.syncAccountWithBalance();

    const state = useExpenseStore.getState();
    const bank = state.accounts.find((a) => a.id === 'acc-bank');
    const cash = state.accounts.find((a) => a.id === 'acc-cash');
    expect(bank?.balance).toBe(0);
    expect(cash?.balance).toBe(40);
    expect((bank?.balance ?? 0) + (cash?.balance ?? 0)).toBe(40);
  });
});

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
});

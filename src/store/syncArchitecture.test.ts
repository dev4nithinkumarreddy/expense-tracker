import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExpenseStore } from './useExpenseStore';
import { supabase } from '../lib/supabase';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'uuid-' + Math.random().toString(36).substring(2, 9)
});

// Mock Supabase
vi.mock('../lib/supabase', () => {
  const mockFrom = vi.fn();
  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb) => {
      if (typeof cb === 'function') cb('SUBSCRIBED');
      return { unsubscribe: vi.fn() };
    }),
    send: vi.fn(),
  }));

  return {
    supabase: {
      from: mockFrom,
      channel: mockChannel,
    },
  };
});

describe('Cross-Device Sync Architecture (Phases 1-5)', () => {
  const userId = 'user-test-456';
  const session = { user: { id: userId } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    useExpenseStore.setState({
      expenses: [],
      bills: [],
      budgets: [],
      debts: [],
      subscriptions: [],
      wishlistItems: [],
      accounts: [
        { id: 'acc-bank-1', name: 'Main Bank', type: 'bank', balance: 5000, currency: '₹' },
        { id: 'acc-cash-1', name: 'Cash Wallet', type: 'cash', balance: 1000, currency: '₹' },
      ],
      settings: {
        monthlyIncome: 45000,
        currency: '₹',
        darkMode: true,
        categories: ['Food', 'Bills'],
        carryForward: false,
        categoryBudgets: {},
        quickAdds: [],
        privacyMode: true,
        theme: 'default',
        categoryEmojis: {},
        userName: '',
        soundEnabled: false,
        settingsInitialized: false,
        updated_at: undefined,
      },
      pendingMutations: [],
      recentlyDeleted: [],
      session,
      isSyncing: false,
      lastSyncSuccess: null,
      lastSyncError: null,
    });
  });

  // --- PHASE 1 TESTS: Two-way merge & seeding ---
  it('Phase 1: two-way merge uploads local data not on cloud and downloads cloud data not on local', async () => {
    const localExpense = {
      id: 'e1111111-1111-4111-8111-111111111111',
      amount: 500,
      description: 'Local Grocery',
      category: 'Food',
      date: '2026-09-29T10:00:00.000Z',
    };
    const cloudExpense = {
      id: 'e2222222-2222-4222-8222-222222222222',
      user_id: userId,
      amount: 1200,
      description: 'Cloud Flight',
      category: 'Travel',
      date: '2026-09-29T12:00:00.000Z',
    };

    useExpenseStore.setState({
      expenses: [localExpense as any],
    });

    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'expenses') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [cloudExpense], error: null })) })),
          upsert: upsertSpy,
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            then: vi.fn((fn: any) => Promise.resolve({ data: [], error: null }).then(fn)),
          })),
        })),
        upsert: vi.fn(() => Promise.resolve({ error: null })),
      };
    });

    await useExpenseStore.getState().fetchCloudData();

    const state = useExpenseStore.getState();
    // Both local and cloud expenses should now exist in state
    expect(state.expenses.some((e) => e.id === localExpense.id)).toBe(true);
    expect(state.expenses.some((e) => e.id === cloudExpense.id)).toBe(true);
    // Local expense was uploaded to cloud
    expect(upsertSpy).toHaveBeenCalled();
  });

  // --- PHASE 2 TESTS: Settings protection & damage repair ---
  it('Phase 2: fresh device with defaults does NOT overwrite cloud with default values', async () => {
    // Fresh device with default settings
    useExpenseStore.setState({
      settings: {
        monthlyIncome: 45000,
        currency: '₹',
        darkMode: true,
        categories: [],
        carryForward: false,
        categoryBudgets: {},
        quickAdds: [],
        privacyMode: true,
        theme: 'default',
        categoryEmojis: {},
        userName: '',
        soundEnabled: false,
        settingsInitialized: false,
      },
    });

    const upsertSettingsSpy = vi.fn(() => Promise.resolve({ error: null }));
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })), // cloud empty
            })),
          })),
          upsert: upsertSettingsSpy,
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        upsert: vi.fn(() => Promise.resolve({ error: null })),
      };
    });

    await useExpenseStore.getState().fetchCloudData();

    // Untouched default settings on fresh device must NOT seed/overwrite cloud
    expect(upsertSettingsSpy).not.toHaveBeenCalled();
  });

  it('Phase 2: authoritative local settings repair damaged default cloud row', async () => {
    // Device A with customized real settings
    useExpenseStore.setState({
      settings: {
        monthlyIncome: 15000,
        currency: '₹',
        darkMode: false,
        categories: ['Food'],
        carryForward: false,
        categoryBudgets: {},
        quickAdds: [],
        privacyMode: false,
        theme: 'emerald',
        categoryEmojis: {},
        userName: 'Nithin',
        soundEnabled: true,
        settingsInitialized: true,
        updated_at: '2026-09-29T10:00:00.000Z',
      },
    });

    const damagedCloudSettings = {
      user_id: userId,
      monthly_income: 45000,
      dark_mode: true,
      theme: 'default',
      user_name: '',
      currency: '₹',
    };

    const repairUpsertSpy = vi.fn(() => Promise.resolve({ error: null }));
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: damagedCloudSettings, error: null })),
            })),
          })),
          upsert: repairUpsertSpy,
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        upsert: vi.fn(() => Promise.resolve({ error: null })),
      };
    });

    await useExpenseStore.getState().fetchCloudData();

    // Device A must repair damaged cloud row with its authoritative settings
    expect(repairUpsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        monthly_income: 15000,
        dark_mode: false,
        user_name: 'Nithin',
      })
    );
  });

  // --- PHASE 3 TESTS: Offline mutation queue durability ---
  it('Phase 3: user actions when session is null are queued and flushed when session connects', async () => {
    // User is offline / cold start before auth initializes
    useExpenseStore.setState({ session: null });

    const store = useExpenseStore.getState();
    await store.addExpense({
      amount: 250,
      description: 'Coffee Offline',
      category: 'Food',
      date: '2026-09-29T09:00:00.000Z',
    });

    let state = useExpenseStore.getState();
    expect(state.pendingMutations.length).toBe(1);
    expect(state.pendingMutations[0].type).toBe('INSERT_EXPENSE');
    expect(state.pendingMutations[0].createdAt).toBeDefined();

    // Now user logs in / session connects
    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'expenses') {
        return {
          upsert: upsertSpy,
        };
      }
      return {
        upsert: vi.fn(() => Promise.resolve({ error: null })),
      };
    });

    store.setSession({ user: { id: 'logged-in-user-99' } } as any);

    // Wait a tick for async flush
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Upsert was called with the authenticated user ID
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'logged-in-user-99',
        description: 'Coffee Offline',
      })
    );
  });

  it('Phase 3: 42501 (insufficient privilege) RLS error does NOT drop mutation from queue', async () => {
    useExpenseStore.setState({
      pendingMutations: [
        {
          id: 'mut-1',
          type: 'INSERT_EXPENSE',
          payload: { id: 'exp-1', amount: 100 },
          createdAt: Date.now(),
        },
      ],
    });

    (supabase.from as any).mockImplementation(() => ({
      upsert: vi.fn(() => Promise.resolve({ error: { code: '42501', message: 'JWT expired' } })),
    }));

    await useExpenseStore.getState().syncPendingMutations();

    const state = useExpenseStore.getState();
    // 42501 must stay in the queue to retry with backoff, NOT dropped
    expect(state.pendingMutations.length).toBe(1);
    expect(state.pendingMutations[0].id).toBe('mut-1');
  });

  // --- PHASE 4 TESTS: Safe signout & clearData ---
  it('Phase 4: clearData does NOT wipe local data if pending mutations exist', async () => {
    useExpenseStore.setState({
      expenses: [{ id: 'exp-keep', amount: 500, description: 'Unsaved', category: 'Food', date: '2026-09-29' } as any],
      pendingMutations: [{ id: 'mut-unsynced', type: 'INSERT_EXPENSE', payload: {}, createdAt: Date.now() }],
    });

    await useExpenseStore.getState().clearData();

    const state = useExpenseStore.getState();
    // Must NOT be wiped because unsynced mutations are present
    expect(state.expenses.length).toBe(1);
    expect(state.pendingMutations.length).toBe(1);
  });

  it('Phase 4: clearData clears local data cleanly if pending mutations are empty', async () => {
    useExpenseStore.setState({
      expenses: [{ id: 'exp-synced', amount: 500, description: 'Synced', category: 'Food', date: '2026-09-29' } as any],
      pendingMutations: [],
    });

    await useExpenseStore.getState().clearData();

    const state = useExpenseStore.getState();
    expect(state.expenses.length).toBe(0);
  });

  // --- PHASE 5 TESTS: Timestamp and sync status accuracy ---
  it('Phase 5: lastSyncSuccess and lastSyncError update properly', async () => {
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          then: vi.fn((fn: any) => Promise.resolve({ data: [], error: null }).then(fn)),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    }));

    expect(useExpenseStore.getState().lastSyncSuccess).toBeNull();

    await useExpenseStore.getState().fetchCloudData();

    const state = useExpenseStore.getState();
    expect(state.lastSyncSuccess).not.toBeNull();
    expect(state.lastSyncError).toBeNull();
  });
});

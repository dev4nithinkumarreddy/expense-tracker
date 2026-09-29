import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { calculateStreak } from '../../lib/streak';
import { generateDeterministicUUID } from '../../lib/utils';
import { applyExpenseToAccounts } from './expenseSlice';
import { 
  defaultCategories, 
  type ExpenseState, 
  type SyncSlice, 
  type Expense, 
  type Bill, 
  type Budget, 
  type Subscription, 
  type WishlistItem, 
  type Debt,
  type Account
} from '../types';

// Standard UUID identifiers for default cloud accounts
export const CLOUD_BANK_UUID = 'a0000000-0000-4000-8000-000000000001';
export const CLOUD_CASH_UUID = 'a0000000-0000-4000-8000-000000000002';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toCloudAccountId(id?: string | null): string | null {
  if (!id) return null;
  if (id === 'acc-bank-1') return CLOUD_BANK_UUID;
  if (id === 'acc-cash-1') return CLOUD_CASH_UUID;
  if (id === 'acc-card-1') return 'a0000000-0000-4000-8000-000000000003';
  if (UUID_REGEX.test(id)) return id;
  return null;
}

export function fromCloudAccountId(id?: string | null): string {
  if (!id) return '';
  if (id === CLOUD_BANK_UUID) return 'acc-bank-1';
  if (id === CLOUD_CASH_UUID) return 'acc-cash-1';
  return id;
}

// Module-scoped synchronization lock & retry state (never stored on window)
let isSyncingLock = false;
let syncRetryTimer: ReturnType<typeof setTimeout> | null = null;
let consecutiveSyncFailures = 0;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 30000;

function scheduleSyncRetry(syncFn: () => void) {
  if (syncRetryTimer) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, consecutiveSyncFailures - 1), MAX_BACKOFF_MS);
  syncRetryTimer = setTimeout(() => {
    syncRetryTimer = null;
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncFn();
    }
  }, backoff);
}

export const createSyncSlice: StateCreator<ExpenseState, [], [], SyncSlice> = (set, get) => ({
  lastActiveMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  session: null,
  isModalOpen: false,
  sharedData: null,
  shouldTriggerScan: false,
  pendingMutations: [],
  isSyncing: false,

  setSession: (session) => set({ session }),
  setSharedData: (data) => set({ sharedData: data }),
  setShouldTriggerScan: (shouldTriggerScan) => set({ shouldTriggerScan }),
  setModalOpen: (isModalOpen) => set({ isModalOpen }),

  addPendingMutation: (mutation) => {
    set((state) => ({ pendingMutations: [...state.pendingMutations, { ...mutation, id: crypto.randomUUID(), createdAt: Date.now() }] }));
  },

  removePendingMutation: (id) => {
    set((state) => ({ pendingMutations: state.pendingMutations.filter(m => m.id !== id) }));
  },

  syncPendingMutations: async () => {
    const { pendingMutations, session, removePendingMutation } = get();
    if (!session || pendingMutations.length === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    
    if (isSyncingLock) return;
    isSyncingLock = true;
    set({ isSyncing: true });

    try {
      if (syncRetryTimer) {
        clearTimeout(syncRetryTimer);
        syncRetryTimer = null;
      }

      let syncedAny = false;

      for (const mut of pendingMutations) {
        try {
          let error: any = null;
          if (mut.type === 'INSERT_EXPENSE') {
            const payload = { ...mut.payload };
            if (payload.account_id) {
              payload.account_id = toCloudAccountId(payload.account_id);
            }
            if (payload.transfer_account_id) {
              payload.transfer_account_id = toCloudAccountId(payload.transfer_account_id);
            }
            let res = await supabase.from('expenses').upsert(payload);
            if (res.error && (
              res.error.code === '23503' ||
              res.error.code === '22P02' ||
              res.error.code === 'PGRST204' ||
              res.error.message?.includes('account_id') ||
              res.error.message?.includes('transfer_account_id') ||
              res.error.message?.includes('uuid')
            )) {
              console.warn("Retrying expense upsert without account foreign keys:", res.error);
              const fallbackPayload = { ...payload };
              delete (fallbackPayload as any).account_id;
              delete (fallbackPayload as any).transfer_account_id;
              res = await supabase.from('expenses').upsert(fallbackPayload);
            }
            error = res.error;
          } else if (mut.type === 'UPDATE_EXPENSE') {
            const payload = { ...mut.payload };
            if (payload.account_id) {
              payload.account_id = toCloudAccountId(payload.account_id);
            }
            if (payload.transfer_account_id) {
              payload.transfer_account_id = toCloudAccountId(payload.transfer_account_id);
            }
            let res = await supabase.from('expenses').update(payload).eq('id', mut.payload.id);
            if (res.error && (
              res.error.code === '23503' ||
              res.error.code === '22P02' ||
              res.error.code === 'PGRST204' ||
              res.error.message?.includes('account_id') ||
              res.error.message?.includes('transfer_account_id') ||
              res.error.message?.includes('uuid')
            )) {
              console.warn("Retrying expense update without account foreign keys:", res.error);
              const fallbackPayload = { ...payload };
              delete (fallbackPayload as any).account_id;
              delete (fallbackPayload as any).transfer_account_id;
              res = await supabase.from('expenses').update(fallbackPayload).eq('id', mut.payload.id);
            }
            error = res.error;
          } else if (mut.type === 'DELETE_EXPENSE') {
            const res = await supabase.from('expenses').delete().eq('id', mut.payload.id);
            error = res.error;
          } else if (mut.type === 'INSERT_BILL') {
            const payload = { ...mut.payload };
            if (payload.due_date === null || payload.due_date === undefined) delete payload.due_date;
            const res = await supabase.from('bills').upsert(payload);
            error = res.error;
          } else if (mut.type === 'UPDATE_BILL') {
            const payload = { ...mut.payload };
            if (payload.due_date === null || payload.due_date === undefined) delete payload.due_date;
            const res = await supabase.from('bills').update(payload).eq('id', payload.id);
            error = res.error;
          } else if (mut.type === 'DELETE_BILL') {
            const res = await supabase.from('bills').delete().eq('id', mut.payload.id);
            error = res.error;
          } else if (mut.type === 'UPSERT_BUDGET') {
            const res = await supabase.from('budgets').upsert(mut.payload);
            error = res.error;
          } else if (mut.type === 'DELETE_BUDGET') {
            const res = await supabase.from('budgets').delete().eq('id', mut.payload.id);
            error = res.error;
          } else if (mut.type === 'INSERT_WISHLIST_ITEM') {
            const res = await supabase.from('wishlist').upsert(mut.payload);
            error = res.error;
          } else if (mut.type === 'UPDATE_WISHLIST_ITEM') {
            const res = await supabase.from('wishlist').update(mut.payload).eq('id', mut.payload.id);
            error = res.error;
          } else if (mut.type === 'DELETE_WISHLIST_ITEM') {
            const res = await supabase.from('wishlist').delete().eq('id', mut.payload.id);
            error = res.error;
          } else if (mut.type === 'INSERT_DEBT') {
            const res = await supabase.from('debts').upsert(mut.payload);
            error = res.error;
          } else if (mut.type === 'UPDATE_DEBT') {
            const res = await supabase.from('debts').update(mut.payload).eq('id', mut.payload.id);
            error = res.error;
          } else if (mut.type === 'DELETE_DEBT') {
            const res = await supabase.from('debts').delete().eq('id', mut.payload.id);
            error = res.error;
          } else if (mut.type === 'INSERT_SUBSCRIPTION') {
            const res = await supabase.from('subscriptions').upsert(mut.payload);
            error = res.error;
          } else if (mut.type === 'UPDATE_SUBSCRIPTION') {
            const res = await supabase.from('subscriptions').update(mut.payload).eq('id', mut.payload.id);
            error = res.error;
          } else if (mut.type === 'DELETE_SUBSCRIPTION') {
            const res = await supabase.from('subscriptions').delete().eq('id', mut.payload.id);
            error = res.error;
          } else if (mut.type === 'UPDATE_SETTINGS') {
            const res = await supabase.from('user_settings').upsert(mut.payload);
            error = res.error;
          } else if (mut.type === 'INSERT_ACCOUNT') {
            const cloudId = toCloudAccountId(mut.payload.id) || mut.payload.id;
            const payload = {
              ...mut.payload,
              id: cloudId,
              user_id: mut.payload.user_id || session.user.id
            };
            const res = await (supabase.from('accounts' as any).upsert(payload) as any);
            error = res.error;
          } else if (mut.type === 'UPDATE_ACCOUNT') {
            const cloudId = toCloudAccountId(mut.payload.id) || mut.payload.id;
            const payload = { ...mut.payload, id: cloudId };
            const res = await (supabase.from('accounts' as any).update(payload).eq('id', cloudId) as any);
            error = res.error;
          } else if (mut.type === 'DELETE_ACCOUNT') {
            const cloudId = toCloudAccountId(mut.payload.id) || mut.payload.id;
            const res = await (supabase.from('accounts' as any).delete().eq('id', cloudId) as any);
            error = res.error;
          }

          // Duplicate key errors mean the row is already in the database
          if (error && (error.code === '23505' || error.message?.includes('already exists'))) {
            error = null;
          }

          if (!error) {
            syncedAny = true;
            removePendingMutation(mut.id);
            consecutiveSyncFailures = 0;
            toast.dismiss('sync-paused-error');
            if (mut.type.includes('EXPENSE')) {
               queryClient.invalidateQueries({ queryKey: ['expenses'] });
            } else if (mut.type.includes('BILL')) {
               queryClient.invalidateQueries({ queryKey: ['bills'] });
            } else if (mut.type.includes('BUDGET')) {
               queryClient.invalidateQueries({ queryKey: ['budgets'] });
            }
          } else {
            console.error("Mutation failed:", error, mut);
            // Drop client-level syntax/constraint errors so the queue is never blocked
            const isNonRecoverable = ['22P02', '23502', '42703', 'PGRST100'].includes(error.code);
            if (isNonRecoverable) {
              console.warn(`Dropping unrecoverable mutation (${mut.type}) to unblock sync queue:`, error);
              removePendingMutation(mut.id);
              continue;
            }

            consecutiveSyncFailures++;
            toast.error(`Sync paused: ${error.message || 'Server error'}. Retrying...`, { id: 'sync-paused-error' });
            scheduleSyncRetry(() => get().syncPendingMutations());
            break; 
          }
        } catch (e: any) {
           console.error("Sync error:", e);
           consecutiveSyncFailures++;
           toast.error(`Sync network error. Retrying in background...`, { id: 'sync-paused-error' });
           scheduleSyncRetry(() => get().syncPendingMutations());
           break;
        }
      }

      if (session && syncedAny && typeof supabase?.channel === 'function') {
        try {
          const syncChannel = supabase.channel(`device-sync-${session.user.id}`);
          if (typeof syncChannel?.send === 'function') {
            syncChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { timestamp: Date.now() }
            });
          }
        } catch {
          // Non-blocking
        }
      }
    } finally {
      isSyncingLock = false;
      set({ isSyncing: false });
    }
  },

  fetchCloudData: async () => {
    const { session } = get();
    if (!session) return;
    
    set({ isSyncing: true });
    try {
      // Prune zombie pending mutations older than 24 hours.
      // These are mutations from a previous session that never flushed — keeping them
      // causes phantom data differences between devices (they get merged with cloud data).
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const pruneNow = Date.now();
      set((state) => ({
        pendingMutations: state.pendingMutations.filter(
          m => !m.createdAt || (pruneNow - m.createdAt) < TWENTY_FOUR_HOURS_MS
        )
      }));

      const [expensesRes, billsRes, settingsRes, budgetsRes, wishlistRes, debtsRes, subsRes, accountsRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', session.user.id),
        supabase.from('bills').select('*').eq('user_id', session.user.id),
        supabase.from('user_settings').select('*').eq('user_id', session.user.id).maybeSingle(),
        supabase.from('budgets').select('*').eq('user_id', session.user.id),
        supabase.from('wishlist').select('*').eq('user_id', session.user.id),
        supabase.from('debts').select('*').eq('user_id', session.user.id),
        supabase.from('subscriptions').select('*').eq('user_id', session.user.id),
        (supabase.from('accounts' as any).select('*').eq('user_id', session.user.id) as any).catch(() => ({ data: null }))
      ]);

      if (subsRes && subsRes.data) {
        const { pendingMutations } = get();
        let mergedSubs: Subscription[] = subsRes.data.map(s => ({
          id: s.id,
          name: s.name,
          amount: s.amount,
          billing_cycle: (s.billing_cycle === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly',
          next_billing_date: s.next_billing_date,
          category: s.category
        }));

        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_SUBSCRIPTION') {
            mergedSubs.push(mut.payload as Subscription);
          } else if (mut.type === 'UPDATE_SUBSCRIPTION') {
            mergedSubs = mergedSubs.map(s => s.id === mut.payload.id ? { ...s, ...mut.payload } : s);
          } else if (mut.type === 'DELETE_SUBSCRIPTION') {
            mergedSubs = mergedSubs.filter(s => s.id !== mut.payload.id);
          }
        });
        set({ subscriptions: mergedSubs });
      }

      if (expensesRes && expensesRes.data) {
        const { pendingMutations } = get();
        let mergedExpenses: Expense[] = expensesRes.data.map((e: any) => ({
          id: e.id,
          amount: Number(e.amount),
          description: e.description,
          category: e.category,
          date: e.date,
          notes: e.notes || undefined,
          receipt_url: e.receipt_url || undefined,
          recurrence: e.recurrence || 'none',
          next_occurrence: e.next_occurrence || null,
          recurring_source_id: e.recurring_source_id || null,
          account_id: fromCloudAccountId(e.account_id) || undefined,
          transfer_account_id: fromCloudAccountId(e.transfer_account_id) || undefined,
        }));
        
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_EXPENSE') {
            mergedExpenses.push(mut.payload as Expense);
          } else if (mut.type === 'UPDATE_EXPENSE') {
            mergedExpenses = mergedExpenses.map(e => e.id === mut.payload.id ? { ...e, ...mut.payload } : e);
          } else if (mut.type === 'DELETE_EXPENSE') {
            mergedExpenses = mergedExpenses.filter(e => e.id !== mut.payload.id);
          }
        });
        set((state) => ({
          expenses: mergedExpenses,
          settings: {
            ...state.settings,
            currentStreak: calculateStreak(mergedExpenses)
          }
        }));
        queryClient.setQueryData(['expenses', session.user.id], mergedExpenses);
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
      }

      if (billsRes && billsRes.data) {
        const { pendingMutations } = get();
        let mergedBills: Bill[] = billsRes.data.map(b => ({
          id: b.id,
          title: b.title,
          amount: b.amount,
          autoDeduct: b.auto_deduct,
          category: b.category,
          due_day: b.due_day ?? (b.due_date ? new Date(b.due_date).getDate() : 1),
          due_date: b.due_date || undefined
        }));
        
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_BILL') {
            mergedBills.push({
              id: mut.payload.id,
              title: mut.payload.title,
              amount: mut.payload.amount,
              autoDeduct: mut.payload.auto_deduct,
              category: mut.payload.category,
              due_day: mut.payload.due_day,
              due_date: mut.payload.due_date
            });
          } else if (mut.type === 'UPDATE_BILL') {
            mergedBills = mergedBills.map(b => b.id === mut.payload.id ? {
              ...b,
              title: mut.payload.title ?? b.title,
              amount: mut.payload.amount ?? b.amount,
              autoDeduct: mut.payload.auto_deduct ?? b.autoDeduct,
              category: mut.payload.category ?? b.category,
              due_day: mut.payload.due_day ?? b.due_day,
              due_date: mut.payload.due_date ?? b.due_date
            } : b);
          } else if (mut.type === 'DELETE_BILL') {
            mergedBills = mergedBills.filter(b => b.id !== mut.payload.id);
          }
        });
        set({ bills: mergedBills });
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      }

      if (budgetsRes && budgetsRes.data) {
        const { pendingMutations } = get();
        let mergedBudgets: Budget[] = budgetsRes.data.map(b => ({
          id: b.id,
          category: b.category,
          monthlyLimit: b.monthly_limit,
          month: b.month,
          userId: b.user_id
        }));
        
        pendingMutations.forEach(mut => {
          if (mut.type === 'UPSERT_BUDGET') {
            const existing = mergedBudgets.find(b => b.id === mut.payload.id);
            if (existing) {
              mergedBudgets = mergedBudgets.map(b => b.id === mut.payload.id ? {
                ...b,
                monthlyLimit: mut.payload.monthly_limit
              } : b);
            } else {
              mergedBudgets.push({
                id: mut.payload.id,
                category: mut.payload.category,
                monthlyLimit: mut.payload.monthly_limit,
                month: mut.payload.month,
                userId: mut.payload.user_id
              });
            }
          } else if (mut.type === 'DELETE_BUDGET') {
            mergedBudgets = mergedBudgets.filter(b => b.id !== mut.payload.id);
          }
        });
        set({ budgets: mergedBudgets });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      }

      // Prune stale UPDATE_SETTINGS mutations: if older than 1 hour, they are from a dead
      // session and should not block cloud settings from being applied on this device.
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const now = Date.now();
      const { pendingMutations: allMuts } = get();
      const staleSettingIds = allMuts
        .filter(m => m.type === 'UPDATE_SETTINGS' && m.createdAt && (now - m.createdAt) > ONE_HOUR_MS)
        .map(m => m.id);
      if (staleSettingIds.length > 0) {
        set((state) => ({
          pendingMutations: state.pendingMutations.filter(m => !staleSettingIds.includes(m.id))
        }));
      }

      // Also deduplicate UPDATE_SETTINGS: keep only the most recent one
      const { pendingMutations: deduped } = get();
      const settingMuts = deduped.filter(m => m.type === 'UPDATE_SETTINGS');
      if (settingMuts.length > 1) {
        // Sort descending by createdAt, drop all but the newest
        const sorted = [...settingMuts].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        const idsToRemove = sorted.slice(1).map(m => m.id);
        set((state) => ({
          pendingMutations: state.pendingMutations.filter(m => !idsToRemove.includes(m.id))
        }));
      }

      const { pendingMutations: activeMutations } = get();
      const hasPendingSettings = activeMutations.some(m => m.type === 'UPDATE_SETTINGS');
      if (!hasPendingSettings && settingsRes?.data) {
        const s = settingsRes.data;
        set((state) => ({
          settings: {
            ...state.settings,
            monthlyIncome: s.monthly_income,
            currency: s.currency,
            darkMode: s.dark_mode,
            categories: s.categories || defaultCategories,
            carryForward: s.carry_forward,
            categoryBudgets: (s.category_budgets as Record<string, number>) || {},
            quickAdds: (s.quick_adds as { description: string; amount: number; category: string; icon: string }[]) || [],
            privacyMode: s.privacy_mode ?? true,
            theme: s.theme || 'default',
            categoryEmojis: (s.category_emojis as Record<string, string>) || {},
            notificationsEnabled: s.notifications_enabled || false,
            userName: s.user_name || state.settings.userName,
            currentStreak: calculateStreak(state.expenses)
          }
        }));
      } else if (!hasPendingSettings && !settingsRes?.data) {
        // Upload initial local settings to Supabase so subsequent devices get it
        const currentSettings = get().settings;
        await supabase.from('user_settings').upsert({
          user_id: session.user.id,
          monthly_income: currentSettings.monthlyIncome,
          currency: currentSettings.currency,
          dark_mode: currentSettings.darkMode,
          categories: currentSettings.categories,
          carry_forward: currentSettings.carryForward,
          category_budgets: currentSettings.categoryBudgets,
          quick_adds: currentSettings.quickAdds,
          privacy_mode: currentSettings.privacyMode,
          theme: currentSettings.theme,
          category_emojis: currentSettings.categoryEmojis,
          notifications_enabled: currentSettings.notificationsEnabled,
          user_name: currentSettings.userName,
        });
      }

      if (wishlistRes && wishlistRes.data) {
        const { pendingMutations } = get();
        let mergedWishlist = wishlistRes.data as WishlistItem[];
        
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_WISHLIST_ITEM') {
            mergedWishlist.push(mut.payload as WishlistItem);
          } else if (mut.type === 'UPDATE_WISHLIST_ITEM') {
            mergedWishlist = mergedWishlist.map(w => w.id === mut.payload.id ? { ...w, ...mut.payload } : w);
          } else if (mut.type === 'DELETE_WISHLIST_ITEM') {
            mergedWishlist = mergedWishlist.filter(w => w.id !== mut.payload.id);
          }
        });
        set({ wishlistItems: mergedWishlist });
      }

      if (debtsRes?.data) {
        const { pendingMutations } = get();
        let mergedDebts = debtsRes.data as Debt[];
        
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_DEBT') {
            mergedDebts.push(mut.payload as Debt);
          } else if (mut.type === 'UPDATE_DEBT') {
            mergedDebts = mergedDebts.map(d => d.id === mut.payload.id ? { ...d, ...mut.payload } : d);
          } else if (mut.type === 'DELETE_DEBT') {
            mergedDebts = mergedDebts.filter(d => d.id !== mut.payload.id);
          }
        });
        set({ debts: mergedDebts });
      }

      if (accountsRes && !accountsRes.error && accountsRes.data) {
        if (accountsRes.data.length === 0) {
          // Cloud has no accounts yet. Seed default/local accounts to Supabase:
          const currentAccounts: Account[] = (get().accounts && get().accounts.length > 0)
            ? get().accounts
            : [
                { id: 'acc-bank-1', name: 'Main Bank', type: 'bank' as const, balance: 0, currency: '₹', color: '#007AFF', icon: '🏦' },
                { id: 'acc-cash-1', name: 'Cash Wallet', type: 'cash' as const, balance: 0, currency: '₹', color: '#34C759', icon: '💵' },
              ];

          const seedPayloads = currentAccounts.map((acc: any) => ({
            id: toCloudAccountId(acc.id) || acc.id,
            user_id: session.user.id,
            name: acc.name,
            type: acc.type,
            balance: acc.balance ?? 0,
            currency: acc.currency || '₹',
            color: acc.color || null,
            icon: acc.icon || null,
            credit_limit: acc.credit_limit || null,
            statement_day: acc.statement_day || null,
            due_day: acc.due_day || null
          }));

          try {
            await (supabase.from('accounts' as any).upsert(seedPayloads) as any);
          } catch (e) {
            console.warn('Failed to seed cloud accounts:', e);
          }
          set({ accounts: currentAccounts });
        } else {
          const { pendingMutations } = get();
          let mergedAccounts: Account[] = accountsRes.data.map((a: any) => ({
            id: fromCloudAccountId(a.id),
            name: a.name,
            type: a.type,
            balance: Number(a.balance) || 0,
            currency: a.currency || '₹',
            color: a.color,
            icon: a.icon,
            credit_limit: a.credit_limit,
            statement_day: a.statement_day,
            due_day: a.due_day,
          }));

          pendingMutations.forEach(mut => {
            if (mut.type === 'INSERT_ACCOUNT') {
              const localId = fromCloudAccountId(mut.payload.id);
              mergedAccounts.push({ ...mut.payload, id: localId });
            } else if (mut.type === 'UPDATE_ACCOUNT') {
              const localId = fromCloudAccountId(mut.payload.id);
              mergedAccounts = mergedAccounts.map(a => a.id === localId ? { ...a, ...mut.payload, id: localId } : a);
            } else if (mut.type === 'DELETE_ACCOUNT') {
              const localId = fromCloudAccountId(mut.payload.id);
              mergedAccounts = mergedAccounts.filter(a => a.id !== localId);
            }
          });
          set({ accounts: mergedAccounts });
          get().reconcileAccountsWithBudget?.();
        }
      }
    } catch (error) {
      console.error("Failed to fetch cloud data:", error);
    } finally {
      set({ isSyncing: false });
    }
  },

  clearData: async () => {
    set({
      expenses: [],
      bills: [],
      budgets: [],
      wishlistItems: [],
      debts: [],
      pendingMutations: [],
      recentlyDeleted: []
    });
  },

  checkMonthRollover: () => set((state) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let newExpenses: Expense[] = [];

    if (state.lastActiveMonth !== currentMonth) {
      if (state.settings.carryForward) {
        const lastMonthExpenses = state.expenses.filter(e => e.date.startsWith(state.lastActiveMonth));
        const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const lastMonthBills = state.bills.reduce((sum, b) => sum + b.amount, 0);
        const remaining = state.settings.monthlyIncome - lastMonthTotal - lastMonthBills;
        
        if (remaining !== 0) {
          const carryForwardId = generateDeterministicUUID('carry_forward', `${state.session?.user?.id || 'local'}:${currentMonth}`);
          if (!state.expenses.some(e => e.id === carryForwardId)) {
            newExpenses.push({
              id: carryForwardId,
              amount: -remaining, 
              description: remaining > 0 ? 'Previous Month Carry Forward' : 'Previous Month Overspend',
              category: 'Other',
              date: new Date().toISOString(),
              notes: 'Automatically carried over'
            });
          }
        }
      }
      
      state.bills.forEach(bill => {
        if (bill.autoDeduct) {
          const autoDeductId = generateDeterministicUUID('auto_deduct', `${bill.id}:${currentMonth}`);
          if (!state.expenses.some(e => e.id === autoDeductId)) {
            newExpenses.push({
              id: autoDeductId,
              amount: bill.amount,
              description: `Auto-deduct: ${bill.title}`,
              category: bill.category || 'Bills',
              date: new Date().toISOString(),
              notes: 'Automatically deducted for the new month'
            });
          }
        }
      });
    }

    // --- Process recurring expenses idempotently ---
    const now = new Date();
    const generatedExpenses: Expense[] = [];
    const updatedExpenses: Expense[] = [];

    state.expenses.forEach(expense => {
      if (expense.recurrence && expense.recurrence !== 'none' && expense.next_occurrence) {
        let nextOccurDate = new Date(expense.next_occurrence);
        
        // Generate all occurrences that have passed
        while (nextOccurDate <= now) {
          const dateIso = nextOccurDate.toISOString();
          const dateKey = dateIso.slice(0, 10);
          const deterministicId = generateDeterministicUUID('recurring', `${expense.id}:${dateKey}`);

          // Idempotency check: don't create duplicate if already exists locally
          const alreadyExists = state.expenses.some(e => 
            e.id === deterministicId || 
            (e.recurring_source_id === expense.id && e.date.slice(0, 10) === dateKey)
          );

          if (!alreadyExists && !generatedExpenses.some(g => g.id === deterministicId)) {
            const clone: Expense = {
              ...expense,
              id: deterministicId,
              recurring_source_id: expense.id,
              date: dateIso,
              recurrence: 'none',
              next_occurrence: null,
            };
            generatedExpenses.push(clone);
          }

          // Advance to next occurrence date
          if (expense.recurrence === 'daily') {
            nextOccurDate.setDate(nextOccurDate.getDate() + 1);
          } else if (expense.recurrence === 'weekly') {
            nextOccurDate.setDate(nextOccurDate.getDate() + 7);
          } else if (expense.recurrence === 'monthly') {
            nextOccurDate.setMonth(nextOccurDate.getMonth() + 1);
          }
        }

        if (nextOccurDate.toISOString() !== expense.next_occurrence) {
          updatedExpenses.push({ ...expense, next_occurrence: nextOccurDate.toISOString() });
        }
      }
    });

    const allNewExpenses = [...newExpenses, ...generatedExpenses];

    // Queue all generated and updated expenses for offline/online sync
    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session && allNewExpenses.length > 0) {
      allNewExpenses.forEach(e => {
        addPendingMutation({
          type: 'INSERT_EXPENSE',
          payload: {
            id: e.id,
            user_id: session.user.id,
            amount: e.amount,
            description: e.description,
            category: e.category,
            date: e.date,
            notes: e.notes || null,
            receipt_url: e.receipt_url || null,
            recurrence: 'none',
            next_occurrence: null,
            recurring_source_id: e.recurring_source_id || null,
            account_id: e.account_id || null
          }
        });
      });
    }

    if (session && updatedExpenses.length > 0) {
      updatedExpenses.forEach(e => {
        addPendingMutation({
          type: 'UPDATE_EXPENSE',
          payload: {
            id: e.id,
            next_occurrence: e.next_occurrence
          }
        });
      });
    }

    if (session && (allNewExpenses.length > 0 || updatedExpenses.length > 0)) {
      syncPendingMutations();
    }

    // Build updated state
    let finalExpenses = [...state.expenses, ...allNewExpenses];
    updatedExpenses.forEach(updatedE => {
      finalExpenses = finalExpenses.map(e => e.id === updatedE.id ? updatedE : e);
    });

    let finalAccounts = state.accounts;
    allNewExpenses.forEach(newExp => {
      finalAccounts = applyExpenseToAccounts(finalAccounts, newExp, 1);
    });

    return {
      ...state,
      lastActiveMonth: currentMonth,
      expenses: finalExpenses,
      accounts: finalAccounts
    };
  }),

  eraseAllData: async () => {
    const { session } = get();
    if (session) {
      try {
        await Promise.all([
          supabase.from('expenses').delete().eq('user_id', session.user.id),
          supabase.from('bills').delete().eq('user_id', session.user.id),
          supabase.from('subscriptions').delete().eq('user_id', session.user.id),
          supabase.from('budgets').delete().eq('user_id', session.user.id),
          supabase.from('wishlist').delete().eq('user_id', session.user.id),
          supabase.from('debts').delete().eq('user_id', session.user.id),
          supabase.from('user_settings').delete().eq('user_id', session.user.id),
          (supabase.from('accounts' as any).delete().eq('user_id', session.user.id) as any).catch(() => {})
        ]);
        queryClient.removeQueries();
        toast.success("All data erased successfully");
      } catch (err: any) {
        console.error("Failed to erase cloud data:", err);
        toast.error("Failed to wipe cloud data. Please check your connection.");
      }
    }
    set({
      expenses: [],
      bills: [],
      subscriptions: [],
      budgets: [],
      wishlistItems: [],
      debts: [],
      pendingMutations: [],
      recentlyDeleted: [],
      accounts: [
        { id: 'acc-bank-1', name: 'Main Bank', type: 'bank', balance: 0, currency: '₹', color: '#007AFF', icon: '🏦' },
        { id: 'acc-cash-1', name: 'Cash Wallet', type: 'cash', balance: 0, currency: '₹', color: '#34C759', icon: '💵' },
      ],
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
      }
    });
  }
});

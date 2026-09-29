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

export function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

export function getRecordTimestamp(record: any): number {
  const ts = record?.updated_at || record?.created_at || record?.date;
  if (!ts) return 0;
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export async function chunkedUpsert<T extends Record<string, any>>(
  table: string,
  records: T[],
  chunkSize: number = 100
): Promise<{ success: T[]; failed: { record: T; error: any }[] }> {
  if (records.length === 0) return { success: [], failed: [] };

  const success: T[] = [];
  const failed: { record: T; error: any }[] = [];

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase.from(table as any).upsert(chunk as any);
    if (!error) {
      success.push(...chunk);
    } else {
      console.warn(`[Sync] Chunk upsert to ${table} failed, trying individually:`, error);
      for (const item of chunk) {
        let itemRes = await supabase.from(table as any).upsert(item as any);
        if (
          itemRes.error &&
          table === 'expenses' &&
          (itemRes.error.code === '23503' || itemRes.error.message?.includes('account_id') || itemRes.error.message?.includes('transfer_account_id'))
        ) {
          const fallback = { ...item };
          delete (fallback as any).account_id;
          delete (fallback as any).transfer_account_id;
          itemRes = await supabase.from(table as any).upsert(fallback as any);
        }

        if (!itemRes.error) {
          success.push(item);
        } else {
          failed.push({ record: item, error: itemRes.error });
        }
      }
    }
  }

  return { success, failed };
}

export function isSettingsDefault(s: any): boolean {
  if (!s) return true;
  const income = s.monthlyIncome ?? s.monthly_income ?? 45000;
  const dark = s.darkMode ?? s.dark_mode ?? true;
  const theme = s.theme || 'default';
  const name = (s.userName ?? s.user_name ?? '').trim();
  return income === 45000 && dark === true && theme === 'default' && name === '';
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
            const isNonRecoverable = ['22P02', '23502', '42703', 'PGRST100', '42501'].includes(error.code);
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
      // Mutations with no createdAt were created before this fix — treat them as stale.
      // Only keep mutations that have a fresh createdAt within the 24h window.
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const pruneNow = Date.now();
      set((state) => ({
        pendingMutations: state.pendingMutations.filter(
          m => m.createdAt != null && (pruneNow - m.createdAt) < TWENTY_FOUR_HOURS_MS
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

      // =====================================================================
      // PHASE 1: ROBUST TWO-WAY MERGE & LOCAL-TO-CLOUD SEEDING
      // =====================================================================

      // --- 1. ACCOUNTS (Merged first to satisfy foreign key constraints) ---
      if (accountsRes && !accountsRes.error && accountsRes.data) {
        const localAccounts: Account[] = (get().accounts && get().accounts.length > 0)
          ? get().accounts
          : [
              { id: 'acc-bank-1', name: 'Main Bank', type: 'bank' as const, balance: 0, currency: '₹', color: '#007AFF', icon: '🏦' },
              { id: 'acc-cash-1', name: 'Cash Wallet', type: 'cash' as const, balance: 0, currency: '₹', color: '#34C759', icon: '💵' },
            ];

        let remappedAccountsCount = 0;
        const accountRemap = new Map<string, string>();

        const sanitizedLocal = localAccounts.map((acc: Account) => {
          if (acc.id === 'acc-bank-1' || acc.id === 'acc-cash-1' || acc.id === 'acc-card-1') {
            return acc;
          }
          if (!isValidUUID(acc.id)) {
            const newId = crypto.randomUUID();
            accountRemap.set(acc.id, newId);
            remappedAccountsCount++;
            return { ...acc, id: newId };
          }
          return acc;
        });

        const cloudMapped: Account[] = accountsRes.data.map((a: any) => ({
          id: fromCloudAccountId(a.id),
          name: a.name,
          type: a.type,
          balance: Number(a.balance) || 0,
          currency: a.currency || '₹',
          color: a.color || undefined,
          icon: a.icon || undefined,
          credit_limit: a.credit_limit != null ? Number(a.credit_limit) : undefined,
          statement_day: a.statement_day || undefined,
          due_day: a.due_day || undefined,
        }));

        const cloudMap = new Map(cloudMapped.map(a => [toCloudAccountId(a.id) || a.id, a]));
        const localMap = new Map(sanitizedLocal.map(a => [toCloudAccountId(a.id) || a.id, a]));

        const localOnly = sanitizedLocal.filter(a => !cloudMap.has(toCloudAccountId(a.id) || a.id));
        const cloudOnly = cloudMapped.filter(a => !localMap.has(toCloudAccountId(a.id) || a.id));

        const inBothLocal = sanitizedLocal.filter(a => cloudMap.has(toCloudAccountId(a.id) || a.id));
        const localWins: Account[] = [];
        const cloudWins: Account[] = [];
        let accountConflicts = 0;

        for (const localAcc of inBothLocal) {
          const cloudAcc = cloudMap.get(toCloudAccountId(localAcc.id) || localAcc.id)!;
          accountConflicts++;
          const localTs = getRecordTimestamp(localAcc);
          const cloudTs = getRecordTimestamp(cloudAcc);
          if (localTs > cloudTs) {
            localWins.push(localAcc);
          } else {
            cloudWins.push(cloudAcc);
          }
        }

        const accountsToUpload = [...localOnly, ...localWins];
        const uploadPayloads = accountsToUpload.map(acc => ({
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
          due_day: acc.due_day || null,
        }));

        const { success: accSuccess, failed: accFailed } = await chunkedUpsert('accounts', uploadPayloads);

        accFailed.forEach(({ record, error }) => {
          console.error('[Sync] Account upload failed, re-queuing:', record.id, error);
          get().addPendingMutation({
            type: 'INSERT_ACCOUNT',
            payload: record,
          });
        });

        const mergedAccountMap = new Map<string, Account>();
        cloudOnly.forEach(a => mergedAccountMap.set(toCloudAccountId(a.id) || a.id, a));
        cloudWins.forEach(a => mergedAccountMap.set(toCloudAccountId(a.id) || a.id, a));
        localOnly.forEach(a => mergedAccountMap.set(toCloudAccountId(a.id) || a.id, a));
        localWins.forEach(a => mergedAccountMap.set(toCloudAccountId(a.id) || a.id, a));

        let finalAccounts = Array.from(mergedAccountMap.values());

        const { pendingMutations } = get();
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_ACCOUNT') {
            const localId = fromCloudAccountId(mut.payload.id);
            if (!finalAccounts.some(a => a.id === localId)) {
              finalAccounts.push({ ...mut.payload, id: localId });
            }
          } else if (mut.type === 'UPDATE_ACCOUNT') {
            const localId = fromCloudAccountId(mut.payload.id);
            finalAccounts = finalAccounts.map(a => a.id === localId ? { ...a, ...mut.payload, id: localId } : a);
          } else if (mut.type === 'DELETE_ACCOUNT') {
            const localId = fromCloudAccountId(mut.payload.id);
            finalAccounts = finalAccounts.filter(a => a.id !== localId);
          }
        });

        set({ accounts: finalAccounts });
        get().reconcileAccountsWithBudget?.();
        console.log(`[Sync] accounts: uploaded ${accSuccess.length}, downloaded ${cloudOnly.length}, conflicts ${accountConflicts}, remapped ${remappedAccountsCount}`);
      }

      // --- 2. EXPENSES MERGE & SEED ---
      if (expensesRes && !expensesRes.error && expensesRes.data) {
        const localExpenses = get().expenses || [];
        let remappedExpensesCount = 0;
        const expenseRemap = new Map<string, string>();

        const sanitizedLocal = localExpenses.map((exp: Expense) => {
          if (!isValidUUID(exp.id)) {
            const newId = crypto.randomUUID();
            expenseRemap.set(exp.id, newId);
            remappedExpensesCount++;
            return { ...exp, id: newId };
          }
          return exp;
        }).map((exp: Expense) => {
          if (exp.recurring_source_id && expenseRemap.has(exp.recurring_source_id)) {
            return { ...exp, recurring_source_id: expenseRemap.get(exp.recurring_source_id)! };
          }
          return exp;
        });

        if (expenseRemap.size > 0) {
          set((state) => ({
            pendingMutations: state.pendingMutations.map((m) => {
              if (m.payload?.id && expenseRemap.has(m.payload.id)) {
                return { ...m, payload: { ...m.payload, id: expenseRemap.get(m.payload.id)! } };
              }
              return m;
            }),
          }));
        }

        const cloudMapped: Expense[] = expensesRes.data.map((e: any) => ({
          id: e.id,
          amount: Number(e.amount),
          description: e.description,
          category: e.category,
          date: e.date,
          notes: e.notes || undefined,
          receipt_url: e.receipt_url || undefined,
          recurrence: (e.recurrence || 'none') as 'none' | 'daily' | 'weekly' | 'monthly',
          next_occurrence: e.next_occurrence || null,
          recurring_source_id: e.recurring_source_id || null,
          account_id: fromCloudAccountId(e.account_id) || undefined,
          transfer_account_id: fromCloudAccountId(e.transfer_account_id) || undefined,
          updated_at: e.updated_at || e.created_at || e.date,
        }));

        const cloudMap = new Map(cloudMapped.map(e => [e.id, e]));
        const localMap = new Map(sanitizedLocal.map(e => [e.id, e]));

        const localOnly = sanitizedLocal.filter(e => !cloudMap.has(e.id));
        const cloudOnly = cloudMapped.filter(e => !localMap.has(e.id));

        const inBothLocal = sanitizedLocal.filter(e => cloudMap.has(e.id));
        const localWins: Expense[] = [];
        const cloudWins: Expense[] = [];
        let expenseConflicts = 0;

        for (const localExp of inBothLocal) {
          const cloudExp = cloudMap.get(localExp.id)!;
          expenseConflicts++;
          const localTs = getRecordTimestamp(localExp);
          const cloudTs = getRecordTimestamp(cloudExp);
          if (localTs > cloudTs) {
            localWins.push(localExp);
          } else {
            cloudWins.push(cloudExp);
          }
        }

        const expensesToUpload = [...localOnly, ...localWins];
        const uploadPayloads = expensesToUpload.map(e => ({
          id: e.id,
          user_id: session.user.id,
          amount: e.amount,
          description: e.description,
          category: e.category,
          date: e.date,
          notes: e.notes || null,
          receipt_url: e.receipt_url || null,
          recurrence: e.recurrence || 'none',
          next_occurrence: e.next_occurrence || null,
          recurring_source_id: e.recurring_source_id || null,
          account_id: toCloudAccountId(e.account_id),
          transfer_account_id: toCloudAccountId(e.transfer_account_id),
        }));

        const { success: expSuccess, failed: expFailed } = await chunkedUpsert('expenses', uploadPayloads);

        expFailed.forEach(({ record, error }) => {
          console.error('[Sync] Expense upload failed, re-queuing:', record.id, error);
          get().addPendingMutation({
            type: 'INSERT_EXPENSE',
            payload: record,
          });
        });

        const mergedExpenseMap = new Map<string, Expense>();
        cloudOnly.forEach(e => mergedExpenseMap.set(e.id, e));
        cloudWins.forEach(e => mergedExpenseMap.set(e.id, e));
        localOnly.forEach(e => mergedExpenseMap.set(e.id, e));
        localWins.forEach(e => mergedExpenseMap.set(e.id, e));

        let finalExpenses = Array.from(mergedExpenseMap.values());

        const { pendingMutations } = get();
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_EXPENSE') {
            if (!finalExpenses.some(e => e.id === mut.payload.id)) {
              finalExpenses.push(mut.payload as Expense);
            }
          } else if (mut.type === 'UPDATE_EXPENSE') {
            finalExpenses = finalExpenses.map(e => e.id === mut.payload.id ? { ...e, ...mut.payload } : e);
          } else if (mut.type === 'DELETE_EXPENSE') {
            finalExpenses = finalExpenses.filter(e => e.id !== mut.payload.id);
          }
        });

        set((state) => ({
          expenses: finalExpenses,
          settings: {
            ...state.settings,
            currentStreak: calculateStreak(finalExpenses)
          }
        }));
        queryClient.setQueryData(['expenses', session.user.id], finalExpenses);
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        console.log(`[Sync] expenses: uploaded ${expSuccess.length}, downloaded ${cloudOnly.length}, conflicts ${expenseConflicts}, remapped ${remappedExpensesCount}`);
      }

      // --- 3. BILLS MERGE & SEED ---
      if (billsRes && !billsRes.error && billsRes.data) {
        const localBills = get().bills || [];
        let remappedBillsCount = 0;
        const billRemap = new Map<string, string>();

        const sanitizedLocal = localBills.map((b: Bill) => {
          if (!isValidUUID(b.id)) {
            const newId = crypto.randomUUID();
            billRemap.set(b.id, newId);
            remappedBillsCount++;
            return { ...b, id: newId };
          }
          return b;
        });

        if (billRemap.size > 0) {
          set((state) => ({
            pendingMutations: state.pendingMutations.map((m) => {
              if (m.payload?.id && billRemap.has(m.payload.id)) {
                return { ...m, payload: { ...m.payload, id: billRemap.get(m.payload.id)! } };
              }
              return m;
            }),
          }));
        }

        const cloudMapped: Bill[] = billsRes.data.map((b: any) => ({
          id: b.id,
          title: b.title,
          amount: b.amount,
          autoDeduct: Boolean(b.auto_deduct),
          category: b.category,
          due_day: b.due_day ?? (b.due_date ? new Date(b.due_date).getDate() : 1),
          due_date: b.due_date || undefined,
          updated_at: b.updated_at || b.created_at,
        }));

        const cloudMap = new Map(cloudMapped.map(b => [b.id, b]));
        const localMap = new Map(sanitizedLocal.map(b => [b.id, b]));

        const localOnly = sanitizedLocal.filter(b => !cloudMap.has(b.id));
        const cloudOnly = cloudMapped.filter(b => !localMap.has(b.id));

        const inBothLocal = sanitizedLocal.filter(b => cloudMap.has(b.id));
        const localWins: Bill[] = [];
        const cloudWins: Bill[] = [];
        let billConflicts = 0;

        for (const localBill of inBothLocal) {
          const cloudBill = cloudMap.get(localBill.id)!;
          billConflicts++;
          const localTs = getRecordTimestamp(localBill);
          const cloudTs = getRecordTimestamp(cloudBill);
          if (localTs > cloudTs) {
            localWins.push(localBill);
          } else {
            cloudWins.push(cloudBill);
          }
        }

        const billsToUpload = [...localOnly, ...localWins];
        const uploadPayloads = billsToUpload.map(b => ({
          id: b.id,
          user_id: session.user.id,
          title: b.title,
          amount: b.amount,
          auto_deduct: b.autoDeduct,
          category: b.category,
          due_day: b.due_day || null,
          due_date: b.due_date || null,
        }));

        const { success: billSuccess, failed: billFailed } = await chunkedUpsert('bills', uploadPayloads);

        billFailed.forEach(({ record, error }) => {
          console.error('[Sync] Bill upload failed, re-queuing:', record.id, error);
          get().addPendingMutation({
            type: 'INSERT_BILL',
            payload: record,
          });
        });

        const mergedBillMap = new Map<string, Bill>();
        cloudOnly.forEach(b => mergedBillMap.set(b.id, b));
        cloudWins.forEach(b => mergedBillMap.set(b.id, b));
        localOnly.forEach(b => mergedBillMap.set(b.id, b));
        localWins.forEach(b => mergedBillMap.set(b.id, b));

        let finalBills = Array.from(mergedBillMap.values());

        const { pendingMutations } = get();
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_BILL') {
            if (!finalBills.some(b => b.id === mut.payload.id)) {
              finalBills.push({
                id: mut.payload.id,
                title: mut.payload.title,
                amount: mut.payload.amount,
                autoDeduct: mut.payload.auto_deduct ?? mut.payload.autoDeduct ?? false,
                category: mut.payload.category,
                due_day: mut.payload.due_day,
                due_date: mut.payload.due_date
              });
            }
          } else if (mut.type === 'UPDATE_BILL') {
            finalBills = finalBills.map(b => b.id === mut.payload.id ? {
              ...b,
              title: mut.payload.title ?? b.title,
              amount: mut.payload.amount ?? b.amount,
              autoDeduct: mut.payload.auto_deduct ?? mut.payload.autoDeduct ?? b.autoDeduct,
              category: mut.payload.category ?? b.category,
              due_day: mut.payload.due_day ?? b.due_day,
              due_date: mut.payload.due_date ?? b.due_date
            } : b);
          } else if (mut.type === 'DELETE_BILL') {
            finalBills = finalBills.filter(b => b.id !== mut.payload.id);
          }
        });

        set({ bills: finalBills });
        queryClient.invalidateQueries({ queryKey: ['bills'] });
        console.log(`[Sync] bills: uploaded ${billSuccess.length}, downloaded ${cloudOnly.length}, conflicts ${billConflicts}, remapped ${remappedBillsCount}`);
      }

      // --- 4. BUDGETS MERGE & SEED ---
      if (budgetsRes && !budgetsRes.error && budgetsRes.data) {
        const localBudgets = get().budgets || [];
        let remappedBudgetsCount = 0;
        const budgetRemap = new Map<string, string>();

        const sanitizedLocal = localBudgets.map((b: Budget) => {
          if (!isValidUUID(b.id)) {
            const newId = crypto.randomUUID();
            budgetRemap.set(b.id, newId);
            remappedBudgetsCount++;
            return { ...b, id: newId };
          }
          return b;
        });

        if (budgetRemap.size > 0) {
          set((state) => ({
            pendingMutations: state.pendingMutations.map((m) => {
              if (m.payload?.id && budgetRemap.has(m.payload.id)) {
                return { ...m, payload: { ...m.payload, id: budgetRemap.get(m.payload.id)! } };
              }
              return m;
            }),
          }));
        }

        const cloudMapped: Budget[] = budgetsRes.data.map((b: any) => ({
          id: b.id,
          category: b.category,
          monthlyLimit: Number(b.monthly_limit),
          month: b.month,
          userId: b.user_id,
          updated_at: b.updated_at || b.created_at,
        }));

        const cloudMap = new Map(cloudMapped.map(b => [b.id, b]));
        const localMap = new Map(sanitizedLocal.map(b => [b.id, b]));

        const localOnly = sanitizedLocal.filter(b => !cloudMap.has(b.id));
        const cloudOnly = cloudMapped.filter(b => !localMap.has(b.id));

        const inBothLocal = sanitizedLocal.filter(b => cloudMap.has(b.id));
        const localWins: Budget[] = [];
        const cloudWins: Budget[] = [];
        let budgetConflicts = 0;

        for (const localBudget of inBothLocal) {
          const cloudBudget = cloudMap.get(localBudget.id)!;
          budgetConflicts++;
          const localTs = getRecordTimestamp(localBudget);
          const cloudTs = getRecordTimestamp(cloudBudget);
          if (localTs > cloudTs) {
            localWins.push(localBudget);
          } else {
            cloudWins.push(cloudBudget);
          }
        }

        const budgetsToUpload = [...localOnly, ...localWins];
        const uploadPayloads = budgetsToUpload.map(b => ({
          id: b.id,
          user_id: session.user.id,
          category: b.category,
          monthly_limit: b.monthlyLimit,
          month: b.month,
        }));

        const { success: budgetSuccess, failed: budgetFailed } = await chunkedUpsert('budgets', uploadPayloads);

        budgetFailed.forEach(({ record, error }) => {
          console.error('[Sync] Budget upload failed, re-queuing:', record.id, error);
          get().addPendingMutation({
            type: 'UPSERT_BUDGET',
            payload: record,
          });
        });

        const mergedBudgetMap = new Map<string, Budget>();
        cloudOnly.forEach(b => mergedBudgetMap.set(b.id, b));
        cloudWins.forEach(b => mergedBudgetMap.set(b.id, b));
        localOnly.forEach(b => mergedBudgetMap.set(b.id, b));
        localWins.forEach(b => mergedBudgetMap.set(b.id, b));

        let finalBudgets = Array.from(mergedBudgetMap.values());

        const { pendingMutations } = get();
        pendingMutations.forEach(mut => {
          if (mut.type === 'UPSERT_BUDGET') {
            const existing = finalBudgets.find(b => b.id === mut.payload.id);
            if (existing) {
              finalBudgets = finalBudgets.map(b => b.id === mut.payload.id ? {
                ...b,
                monthlyLimit: mut.payload.monthly_limit ?? mut.payload.monthlyLimit
              } : b);
            } else {
              finalBudgets.push({
                id: mut.payload.id,
                category: mut.payload.category,
                monthlyLimit: mut.payload.monthly_limit ?? mut.payload.monthlyLimit,
                month: mut.payload.month,
                userId: mut.payload.user_id || session.user.id
              });
            }
          } else if (mut.type === 'DELETE_BUDGET') {
            finalBudgets = finalBudgets.filter(b => b.id !== mut.payload.id);
          }
        });

        set({ budgets: finalBudgets });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
        console.log(`[Sync] budgets: uploaded ${budgetSuccess.length}, downloaded ${cloudOnly.length}, conflicts ${budgetConflicts}, remapped ${remappedBudgetsCount}`);
      }

      // --- 5. SUBSCRIPTIONS MERGE & SEED ---
      if (subsRes && !subsRes.error && subsRes.data) {
        const localSubscriptions = get().subscriptions || [];
        let remappedSubsCount = 0;
        const subRemap = new Map<string, string>();

        const sanitizedLocal = localSubscriptions.map((s: Subscription) => {
          if (!isValidUUID(s.id)) {
            const newId = crypto.randomUUID();
            subRemap.set(s.id, newId);
            remappedSubsCount++;
            return { ...s, id: newId };
          }
          return s;
        });

        if (subRemap.size > 0) {
          set((state) => ({
            pendingMutations: state.pendingMutations.map((m) => {
              if (m.payload?.id && subRemap.has(m.payload.id)) {
                return { ...m, payload: { ...m.payload, id: subRemap.get(m.payload.id)! } };
              }
              return m;
            }),
          }));
        }

        const cloudMapped: Subscription[] = subsRes.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          amount: s.amount,
          billing_cycle: (s.billing_cycle === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly',
          next_billing_date: s.next_billing_date,
          category: s.category,
          updated_at: s.updated_at || s.created_at,
        }));

        const cloudMap = new Map(cloudMapped.map(s => [s.id, s]));
        const localMap = new Map(sanitizedLocal.map(s => [s.id, s]));

        const localOnly = sanitizedLocal.filter(s => !cloudMap.has(s.id));
        const cloudOnly = cloudMapped.filter(s => !localMap.has(s.id));

        const inBothLocal = sanitizedLocal.filter(s => cloudMap.has(s.id));
        const localWins: Subscription[] = [];
        const cloudWins: Subscription[] = [];
        let subConflicts = 0;

        for (const localSub of inBothLocal) {
          const cloudSub = cloudMap.get(localSub.id)!;
          subConflicts++;
          const localTs = getRecordTimestamp(localSub);
          const cloudTs = getRecordTimestamp(cloudSub);
          if (localTs > cloudTs) {
            localWins.push(localSub);
          } else {
            cloudWins.push(cloudSub);
          }
        }

        const subsToUpload = [...localOnly, ...localWins];
        const uploadPayloads = subsToUpload.map(s => ({
          id: s.id,
          user_id: session.user.id,
          name: s.name,
          amount: s.amount,
          billing_cycle: s.billing_cycle,
          next_billing_date: s.next_billing_date,
          category: s.category,
        }));

        const { success: subSuccess, failed: subFailed } = await chunkedUpsert('subscriptions', uploadPayloads);

        subFailed.forEach(({ record, error }) => {
          console.error('[Sync] Subscription upload failed, re-queuing:', record.id, error);
          get().addPendingMutation({
            type: 'INSERT_SUBSCRIPTION',
            payload: record,
          });
        });

        const mergedSubMap = new Map<string, Subscription>();
        cloudOnly.forEach(s => mergedSubMap.set(s.id, s));
        cloudWins.forEach(s => mergedSubMap.set(s.id, s));
        localOnly.forEach(s => mergedSubMap.set(s.id, s));
        localWins.forEach(s => mergedSubMap.set(s.id, s));

        let finalSubs = Array.from(mergedSubMap.values());

        const { pendingMutations } = get();
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_SUBSCRIPTION') {
            if (!finalSubs.some(s => s.id === mut.payload.id)) {
              finalSubs.push(mut.payload as Subscription);
            }
          } else if (mut.type === 'UPDATE_SUBSCRIPTION') {
            finalSubs = finalSubs.map(s => s.id === mut.payload.id ? { ...s, ...mut.payload } : s);
          } else if (mut.type === 'DELETE_SUBSCRIPTION') {
            finalSubs = finalSubs.filter(s => s.id !== mut.payload.id);
          }
        });

        set({ subscriptions: finalSubs });
        console.log(`[Sync] subscriptions: uploaded ${subSuccess.length}, downloaded ${cloudOnly.length}, conflicts ${subConflicts}, remapped ${remappedSubsCount}`);
      }

      // --- 6. WISHLIST MERGE & SEED ---
      if (wishlistRes && !wishlistRes.error && wishlistRes.data) {
        const localWishlist = get().wishlistItems || [];
        let remappedWishlistCount = 0;
        const wishlistRemap = new Map<string, string>();

        const sanitizedLocal = localWishlist.map((w: WishlistItem) => {
          if (!isValidUUID(w.id)) {
            const newId = crypto.randomUUID();
            wishlistRemap.set(w.id, newId);
            remappedWishlistCount++;
            return { ...w, id: newId };
          }
          return w;
        });

        if (wishlistRemap.size > 0) {
          set((state) => ({
            pendingMutations: state.pendingMutations.map((m) => {
              if (m.payload?.id && wishlistRemap.has(m.payload.id)) {
                return { ...m, payload: { ...m.payload, id: wishlistRemap.get(m.payload.id)! } };
              }
              return m;
            }),
          }));
        }

        const cloudMapped: WishlistItem[] = wishlistRes.data.map((w: any) => ({
          id: w.id,
          item_name: w.item_name,
          estimated_amount: w.estimated_amount != null ? Number(w.estimated_amount) : undefined,
          category: w.category || undefined,
          is_purchased: Boolean(w.is_purchased),
          created_at: w.created_at || new Date().toISOString(),
          updated_at: w.updated_at || w.created_at,
        }));

        const cloudMap = new Map(cloudMapped.map(w => [w.id, w]));
        const localMap = new Map(sanitizedLocal.map(w => [w.id, w]));

        const localOnly = sanitizedLocal.filter(w => !cloudMap.has(w.id));
        const cloudOnly = cloudMapped.filter(w => !localMap.has(w.id));

        const inBothLocal = sanitizedLocal.filter(w => cloudMap.has(w.id));
        const localWins: WishlistItem[] = [];
        const cloudWins: WishlistItem[] = [];
        let wishlistConflicts = 0;

        for (const localItem of inBothLocal) {
          const cloudItem = cloudMap.get(localItem.id)!;
          wishlistConflicts++;
          const localTs = getRecordTimestamp(localItem);
          const cloudTs = getRecordTimestamp(cloudItem);
          if (localTs > cloudTs) {
            localWins.push(localItem);
          } else {
            cloudWins.push(cloudItem);
          }
        }

        const wishlistToUpload = [...localOnly, ...localWins];
        const uploadPayloads = wishlistToUpload.map(w => ({
          id: w.id,
          user_id: session.user.id,
          item_name: w.item_name,
          estimated_amount: w.estimated_amount || null,
          category: w.category || null,
          is_purchased: w.is_purchased,
        }));

        const { success: wishSuccess, failed: wishFailed } = await chunkedUpsert('wishlist', uploadPayloads);

        wishFailed.forEach(({ record, error }) => {
          console.error('[Sync] Wishlist upload failed, re-queuing:', record.id, error);
          get().addPendingMutation({
            type: 'INSERT_WISHLIST_ITEM',
            payload: record,
          });
        });

        const mergedWishlistMap = new Map<string, WishlistItem>();
        cloudOnly.forEach(w => mergedWishlistMap.set(w.id, w));
        cloudWins.forEach(w => mergedWishlistMap.set(w.id, w));
        localOnly.forEach(w => mergedWishlistMap.set(w.id, w));
        localWins.forEach(w => mergedWishlistMap.set(w.id, w));

        let finalWishlist = Array.from(mergedWishlistMap.values());

        const { pendingMutations } = get();
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_WISHLIST_ITEM') {
            if (!finalWishlist.some(w => w.id === mut.payload.id)) {
              finalWishlist.push(mut.payload as WishlistItem);
            }
          } else if (mut.type === 'UPDATE_WISHLIST_ITEM') {
            finalWishlist = finalWishlist.map(w => w.id === mut.payload.id ? { ...w, ...mut.payload } : w);
          } else if (mut.type === 'DELETE_WISHLIST_ITEM') {
            finalWishlist = finalWishlist.filter(w => w.id !== mut.payload.id);
          }
        });

        set({ wishlistItems: finalWishlist });
        console.log(`[Sync] wishlist: uploaded ${wishSuccess.length}, downloaded ${cloudOnly.length}, conflicts ${wishlistConflicts}, remapped ${remappedWishlistCount}`);
      }

      // --- 7. DEBTS MERGE & SEED ---
      if (debtsRes && !debtsRes.error && debtsRes.data) {
        const localDebts = get().debts || [];
        let remappedDebtsCount = 0;
        const debtRemap = new Map<string, string>();

        const sanitizedLocal = localDebts.map((d: Debt) => {
          if (!isValidUUID(d.id)) {
            const newId = crypto.randomUUID();
            debtRemap.set(d.id, newId);
            remappedDebtsCount++;
            return { ...d, id: newId };
          }
          return d;
        });

        if (debtRemap.size > 0) {
          set((state) => ({
            pendingMutations: state.pendingMutations.map((m) => {
              if (m.payload?.id && debtRemap.has(m.payload.id)) {
                return { ...m, payload: { ...m.payload, id: debtRemap.get(m.payload.id)! } };
              }
              return m;
            }),
          }));
        }

        const cloudMapped: Debt[] = debtsRes.data.map((d: any) => ({
          id: d.id,
          person_name: d.person_name,
          amount: Number(d.amount),
          type: (d.type === 'borrowed' ? 'borrowed' : 'lent') as 'lent' | 'borrowed',
          status: (d.status === 'settled' ? 'settled' : 'pending') as 'pending' | 'settled',
          date: d.date,
          due_date: d.due_date || undefined,
          notes: d.notes || undefined,
          created_at: d.created_at,
          updated_at: d.updated_at || d.created_at || d.date,
        }));

        const cloudMap = new Map(cloudMapped.map(d => [d.id, d]));
        const localMap = new Map(sanitizedLocal.map(d => [d.id, d]));

        const localOnly = sanitizedLocal.filter(d => !cloudMap.has(d.id));
        const cloudOnly = cloudMapped.filter(d => !localMap.has(d.id));

        const inBothLocal = sanitizedLocal.filter(d => cloudMap.has(d.id));
        const localWins: Debt[] = [];
        const cloudWins: Debt[] = [];
        let debtConflicts = 0;

        for (const localDebt of inBothLocal) {
          const cloudDebt = cloudMap.get(localDebt.id)!;
          debtConflicts++;
          const localTs = getRecordTimestamp(localDebt);
          const cloudTs = getRecordTimestamp(cloudDebt);
          if (localTs > cloudTs) {
            localWins.push(localDebt);
          } else {
            cloudWins.push(cloudDebt);
          }
        }

        const debtsToUpload = [...localOnly, ...localWins];
        const uploadPayloads = debtsToUpload.map(d => ({
          id: d.id,
          user_id: session.user.id,
          person_name: d.person_name,
          amount: d.amount,
          type: d.type,
          status: d.status,
          date: d.date,
          due_date: d.due_date || null,
          notes: d.notes || null,
        }));

        const { success: debtSuccess, failed: debtFailed } = await chunkedUpsert('debts', uploadPayloads);

        debtFailed.forEach(({ record, error }) => {
          console.error('[Sync] Debt upload failed, re-queuing:', record.id, error);
          get().addPendingMutation({
            type: 'INSERT_DEBT',
            payload: record,
          });
        });

        const mergedDebtMap = new Map<string, Debt>();
        cloudOnly.forEach(d => mergedDebtMap.set(d.id, d));
        cloudWins.forEach(d => mergedDebtMap.set(d.id, d));
        localOnly.forEach(d => mergedDebtMap.set(d.id, d));
        localWins.forEach(d => mergedDebtMap.set(d.id, d));

        let finalDebts = Array.from(mergedDebtMap.values());

        const { pendingMutations } = get();
        pendingMutations.forEach(mut => {
          if (mut.type === 'INSERT_DEBT') {
            if (!finalDebts.some(d => d.id === mut.payload.id)) {
              finalDebts.push(mut.payload as Debt);
            }
          } else if (mut.type === 'UPDATE_DEBT') {
            finalDebts = finalDebts.map(d => d.id === mut.payload.id ? { ...d, ...mut.payload } : d);
          } else if (mut.type === 'DELETE_DEBT') {
            finalDebts = finalDebts.filter(d => d.id !== mut.payload.id);
          }
        });

        set({ debts: finalDebts });
        console.log(`[Sync] debts: uploaded ${debtSuccess.length}, downloaded ${cloudOnly.length}, conflicts ${debtConflicts}, remapped ${remappedDebtsCount}`);
      }

      // --- 8. SETTINGS (Preserved for Phase 2) ---
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const now = Date.now();
      const { pendingMutations: allMuts } = get();
      const staleSettingIds = allMuts
        .filter(m => m.type === 'UPDATE_SETTINGS' && (!m.createdAt || (now - m.createdAt) > ONE_HOUR_MS))
        .map(m => m.id);
      if (staleSettingIds.length > 0) {
        set((state) => ({
          pendingMutations: state.pendingMutations.filter(m => !staleSettingIds.includes(m.id))
        }));
      }

      const { pendingMutations: deduped } = get();
      const settingMuts = deduped.filter(m => m.type === 'UPDATE_SETTINGS');
      if (settingMuts.length > 1) {
        const sorted = [...settingMuts].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        const idsToRemove = sorted.slice(1).map(m => m.id);
        set((state) => ({
          pendingMutations: state.pendingMutations.filter(m => !idsToRemove.includes(m.id))
        }));
      }

      const { pendingMutations: activeMutations } = get();
      const hasPendingSettings = activeMutations.some(m => m.type === 'UPDATE_SETTINGS');

      const hydrateSettingsFromCloud = (s: any) => {
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
            userName: s.user_name || '',
            settingsInitialized: true,
            updated_at: s.updated_at,
            currentStreak: calculateStreak(state.expenses)
          }
        }));
      };

      if (!hasPendingSettings) {
        const localSettings = get().settings;
        const cloudSettings = settingsRes?.data;

        const localIsDefault = isSettingsDefault(localSettings);
        const localHasChanges = Boolean(localSettings.settingsInitialized || !localIsDefault);

        if (cloudSettings) {
          const cloudIsDefault = isSettingsDefault(cloudSettings);

          // CASE 2: FIX THE CURRENT DAMAGE
          // If cloud has default values (erroneously seeded by a fresh device)
          // AND local settings differ from defaults (e.g. Device A with real user settings):
          // Treat local as authoritative, repair cloud row immediately.
          if (cloudIsDefault && localHasChanges) {
            console.log('[Sync] Repairing damaged cloud settings with authoritative local settings');
            const repairUpdatedAt = localSettings.updated_at || new Date().toISOString();
            set((state) => ({
              settings: {
                ...state.settings,
                settingsInitialized: true,
                updated_at: repairUpdatedAt
              }
            }));
            await supabase.from('user_settings').upsert({
              user_id: session.user.id,
              monthly_income: localSettings.monthlyIncome,
              currency: localSettings.currency,
              dark_mode: localSettings.darkMode,
              categories: localSettings.categories,
              carry_forward: localSettings.carryForward,
              category_budgets: localSettings.categoryBudgets,
              quick_adds: localSettings.quickAdds,
              privacy_mode: localSettings.privacyMode,
              theme: localSettings.theme || 'default',
              category_emojis: localSettings.categoryEmojis,
              notifications_enabled: localSettings.notificationsEnabled || false,
              user_name: localSettings.userName || null,
              updated_at: repairUpdatedAt
            });
          }
          // CASE 4: UPDATED_AT CONFLICT RESOLUTION
          // When both sides have valid/custom settings, compare updated_at
          else if (localHasChanges && !cloudIsDefault) {
            const localTs = localSettings.updated_at ? new Date(localSettings.updated_at).getTime() : 0;
            const cloudTs = cloudSettings.updated_at ? new Date(cloudSettings.updated_at).getTime() : 0;

            if (localTs > cloudTs) {
              console.log('[Sync] Local settings are newer than cloud, upserting to cloud');
              await supabase.from('user_settings').upsert({
                user_id: session.user.id,
                monthly_income: localSettings.monthlyIncome,
                currency: localSettings.currency,
                dark_mode: localSettings.darkMode,
                categories: localSettings.categories,
                carry_forward: localSettings.carryForward,
                category_budgets: localSettings.categoryBudgets,
                quick_adds: localSettings.quickAdds,
                privacy_mode: localSettings.privacyMode,
                theme: localSettings.theme || 'default',
                category_emojis: localSettings.categoryEmojis,
                notifications_enabled: localSettings.notificationsEnabled || false,
                user_name: localSettings.userName || null,
                updated_at: localSettings.updated_at || new Date().toISOString()
              });
            } else {
              hydrateSettingsFromCloud(cloudSettings);
            }
          }
          // CASE 3: FRESH DEVICE HYDRATION
          // Local is untouched default -> cloud settings win unconditionally
          else {
            hydrateSettingsFromCloud(cloudSettings);
          }
        } else {
          // Cloud has no row yet (empty table):
          // CASE 1: ONLY seed if user has actually changed settings locally!
          if (localHasChanges) {
            console.log('[Sync] Seeding customized local settings to empty cloud user_settings');
            const seedUpdatedAt = localSettings.updated_at || new Date().toISOString();
            set((state) => ({
              settings: {
                ...state.settings,
                settingsInitialized: true,
                updated_at: seedUpdatedAt
              }
            }));
            await supabase.from('user_settings').upsert({
              user_id: session.user.id,
              monthly_income: localSettings.monthlyIncome,
              currency: localSettings.currency,
              dark_mode: localSettings.darkMode,
              categories: localSettings.categories,
              carry_forward: localSettings.carryForward,
              category_budgets: localSettings.categoryBudgets,
              quick_adds: localSettings.quickAdds,
              privacy_mode: localSettings.privacyMode,
              theme: localSettings.theme || 'default',
              category_emojis: localSettings.categoryEmojis,
              notifications_enabled: localSettings.notificationsEnabled || false,
              user_name: localSettings.userName || null,
              updated_at: seedUpdatedAt
            });
          } else {
            console.log('[Sync] Local device has untouched default settings; skipping cloud seed to prevent overwriting');
          }
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

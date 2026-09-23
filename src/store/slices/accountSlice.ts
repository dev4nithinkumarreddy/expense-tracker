import type { StateCreator } from 'zustand';
import type { ExpenseState, AccountSlice, Account } from '../types';
import { toast } from 'sonner';
import { calculateCashflowSummary } from '../../lib/cashflow';

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-bank-1', name: 'Main Bank', type: 'bank', balance: 0, currency: '₹', color: '#007AFF', icon: '🏦' },
  { id: 'acc-cash-1', name: 'Cash Wallet', type: 'cash', balance: 0, currency: '₹', color: '#34C759', icon: '💵' },
  { id: 'acc-card-1', name: 'Credit Card', type: 'credit_card', balance: 0, credit_limit: 0, statement_day: 15, due_day: 5, currency: '₹', color: '#AF52DE', icon: '💳' },
];

export const createAccountSlice: StateCreator<ExpenseState, [], [], AccountSlice> = (set, get) => ({
  accounts: DEFAULT_ACCOUNTS,

  addAccount: async (account) => {
    const id = crypto.randomUUID();
    const newAccount: Account = { ...account, id };

    set((state) => ({
      accounts: [...state.accounts, newAccount],
    }));

    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({
        type: 'INSERT_ACCOUNT',
        payload: {
          id: newAccount.id,
          user_id: session.user.id,
          name: newAccount.name,
          type: newAccount.type,
          balance: newAccount.balance,
          currency: newAccount.currency || '₹',
          color: newAccount.color,
          icon: newAccount.icon,
          credit_limit: newAccount.credit_limit,
          statement_day: newAccount.statement_day,
          due_day: newAccount.due_day,
        },
      });
      syncPendingMutations();
    }

    toast.success(`Account "${newAccount.name}" created`);
    return id;
  },

  updateAccount: (id, partial) => {
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...partial } : a)),
    }));

    const { session, accounts, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      const updated = accounts.find((a) => a.id === id);
      if (updated) {
        addPendingMutation({
          type: 'UPDATE_ACCOUNT',
          payload: {
            id: updated.id,
            name: updated.name,
            type: updated.type,
            balance: updated.balance,
            currency: updated.currency,
            color: updated.color,
            icon: updated.icon,
            credit_limit: updated.credit_limit,
            statement_day: updated.statement_day,
            due_day: updated.due_day,
          },
        });
        syncPendingMutations();
      }
    }
  },

  deleteAccount: (id) => {
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
    }));

    const { session, addPendingMutation, syncPendingMutations } = get();
    if (session) {
      addPendingMutation({
        type: 'DELETE_ACCOUNT',
        payload: { id },
      });
      syncPendingMutations();
    }

    toast.info('Account removed');
  },

  transferFunds: async (fromId, toId, amount, notes) => {
    if (fromId === toId || amount <= 0) {
      toast.error('Invalid transfer parameters');
      return;
    }

    const { accounts, addExpense } = get();
    const fromAcc = accounts.find((a) => a.id === fromId);
    const toAcc = accounts.find((a) => a.id === toId);

    if (!fromAcc || !toAcc) {
      toast.error('Account not found');
      return;
    }

    // Update balances
    set((state) => ({
      accounts: state.accounts.map((a) => {
        if (a.id === fromId) return { ...a, balance: a.balance - amount };
        if (a.id === toId) return { ...a, balance: a.balance + amount };
        return a;
      }),
    }));

    // Record transfer log expense
    await addExpense({
      amount,
      description: `Transfer: ${fromAcc.name} → ${toAcc.name}`,
      category: 'Transfer',
      date: new Date().toISOString(),
      notes: notes || `Funds transferred from ${fromAcc.name} to ${toAcc.name}`,
      account_id: fromId,
      transfer_account_id: toId,
    });

    toast.success(`Transferred ${fromAcc.currency || '₹'}${amount} to ${toAcc.name}`);
  },

  syncAccountWithBalance: (accountId) => {
    const { accounts, settings, expenses, bills, subscriptions } = get();
    const summary = calculateCashflowSummary(
      settings.monthlyIncome,
      expenses,
      bills,
      subscriptions,
      new Date()
    );
    const remaining = summary.availableBalance;
    const targetAcc = accountId 
      ? accounts.find((a) => a.id === accountId)
      : accounts.find((a) => a.type === 'bank') || accounts[0];

    if (!targetAcc) return;

    set((state) => ({
      accounts: state.accounts.map((acc) => {
        if (acc.id === targetAcc.id) {
          return { ...acc, balance: remaining };
        }
        // If cash has the placeholder 2500, reset it to 0
        if (acc.type === 'cash' && acc.balance === 2500) {
          return { ...acc, balance: 0 };
        }
        return acc;
      }),
    }));

    toast.success(`Synced ${targetAcc.name} to ${targetAcc.currency || settings.currency}${remaining}`);
  },

  reconcileAccountsWithBudget: () => {
    const { accounts, settings, expenses, bills, subscriptions } = get();
    if (!accounts || accounts.length === 0) return;

    const bankAcc = accounts.find((a) => a.type === 'bank' || a.id === 'acc-bank-1');
    const cashAcc = accounts.find((a) => a.type === 'cash' || a.id === 'acc-cash-1');
    const cardAcc = accounts.find((a) => a.type === 'credit_card' || a.id === 'acc-card-1');
    
    // Check if accounts still hold the initial dummy template values (25000 bank / 2500 cash / 100000 limit)
    const hasDummyValues = (bankAcc && bankAcc.balance === 25000) || 
                           (cashAcc && cashAcc.balance === 2500) ||
                           (cardAcc && cardAcc.credit_limit === 100000);
    
    if (hasDummyValues) {
      const summary = calculateCashflowSummary(
        settings.monthlyIncome,
        expenses,
        bills,
        subscriptions,
        new Date()
      );
      const remaining = summary.availableBalance;

      set((state) => ({
        accounts: state.accounts.map((acc) => {
          if (acc.id === bankAcc?.id && bankAcc.balance === 25000) {
            return { ...acc, balance: remaining };
          }
          if (acc.id === cashAcc?.id && acc.balance === 2500) {
            return { ...acc, balance: 0 };
          }
          if (acc.id === cardAcc?.id && acc.credit_limit === 100000) {
            return { ...acc, credit_limit: 0 };
          }
          return acc;
        }),
      }));
    }
  },
});

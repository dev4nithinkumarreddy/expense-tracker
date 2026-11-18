import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExpenseStore } from '../useExpenseStore';

// Stub crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => Math.random().toString(36).substring(2, 9)
});

describe('tripSlice', () => {
  beforeEach(() => {
    useExpenseStore.setState({
      trips: [],
      activeTripId: null,
      expenses: [],
      debts: [],
      pendingMutations: [],
      session: null
    });
  });

  it('should add a trip and mark it active if status is active', async () => {
    const store = useExpenseStore.getState();
    const tripId = await store.addTrip({
      name: 'Goa Weekend',
      destination: 'Goa',
      startDate: '2026-11-20',
      endDate: '2026-11-23',
      budget: 20000,
      coverEmoji: '🏖️',
      status: 'active'
    });

    const state = useExpenseStore.getState();
    expect(state.trips.length).toBe(1);
    expect(state.trips[0].id).toBe(tripId);
    expect(state.trips[0].name).toBe('Goa Weekend');
    expect(state.activeTripId).toBe(tripId);
  });

  it('should update a trip and handle active status change', async () => {
    const store = useExpenseStore.getState();
    const tripId = await store.addTrip({
      name: 'Paris Vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      budget: 150000,
      coverEmoji: '🗼',
      status: 'upcoming'
    });

    expect(useExpenseStore.getState().activeTripId).toBeNull();

    store.updateTrip(tripId, { status: 'active', budget: 160000 });
    const updated = useExpenseStore.getState();
    expect(updated.trips[0].budget).toBe(160000);
    expect(updated.trips[0].status).toBe('active');
    expect(updated.activeTripId).toBe(tripId);

    // Complete the trip
    store.updateTrip(tripId, { status: 'completed' });
    expect(useExpenseStore.getState().activeTripId).toBeNull();
  });

  it('should delete a trip and unlink trip_id from expenses and debts', async () => {
    const store = useExpenseStore.getState();
    const tripId = await store.addTrip({
      name: 'Roadtrip',
      startDate: '2026-11-20',
      endDate: '2026-11-22',
      budget: 5000,
      coverEmoji: '🚗',
      status: 'active'
    });

    useExpenseStore.setState({
      expenses: [
        {
          id: 'exp-1',
          amount: 500,
          description: 'Fuel',
          category: 'Fuel',
          date: '2026-11-20T10:00:00.000Z',
          trip_id: tripId
        },
        {
          id: 'exp-2',
          amount: 200,
          description: 'Coffee',
          category: 'Food',
          date: '2026-11-20T11:00:00.000Z',
          trip_id: null
        }
      ],
      debts: [
        {
          id: 'debt-1',
          person_name: 'Rahul',
          amount: 250,
          type: 'lent',
          status: 'pending',
          date: '2026-11-20',
          trip_id: tripId
        }
      ]
    });

    store.deleteTrip(tripId);

    const state = useExpenseStore.getState();
    expect(state.trips.length).toBe(0);
    expect(state.activeTripId).toBeNull();
    // Expense still exists, but trip_id is unlinked
    expect(state.expenses.length).toBe(2);
    expect(state.expenses[0].trip_id).toBeNull();
    expect(state.expenses[1].trip_id).toBeNull();
    // Debt still exists, but trip_id is unlinked
    expect(state.debts[0].trip_id).toBeNull();
  });

  it('should manually set active trip', async () => {
    const store = useExpenseStore.getState();
    await store.addTrip({
      name: 'Trip 1',
      startDate: '2026-11-20',
      endDate: '2026-11-22',
      budget: 5000,
      coverEmoji: '🚗',
      status: 'upcoming'
    });
    const id2 = await store.addTrip({
      name: 'Trip 2',
      startDate: '2026-12-20',
      endDate: '2026-12-22',
      budget: 10000,
      coverEmoji: '✈️',
      status: 'upcoming'
    });

    store.setActiveTrip(id2);
    const state = useExpenseStore.getState();
    expect(state.activeTripId).toBe(id2);
    expect(state.trips.find(t => t.id === id2)?.status).toBe('active');
  });
});

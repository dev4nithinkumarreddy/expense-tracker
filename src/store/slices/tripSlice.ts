import type { StateCreator } from 'zustand';
import type { ExpenseState, TripSlice, Trip } from '../types';

export const createTripSlice: StateCreator<ExpenseState, [], [], TripSlice> = (set, get) => ({
  trips: [],
  activeTripId: null,

  addTrip: async (tripData) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newTrip: Trip = {
      ...tripData,
      id,
      created_at: now,
      updated_at: now
    };

    set((state) => ({
      trips: [newTrip, ...state.trips],
      activeTripId: tripData.status === 'active' ? newTrip.id : state.activeTripId
    }));

    const { session, addPendingMutation, syncPendingMutations } = get();
    if (addPendingMutation) {
      addPendingMutation({
        type: 'INSERT_TRIP',
        payload: {
          id: newTrip.id,
          user_id: session?.user?.id || '',
          name: newTrip.name,
          destination: newTrip.destination,
          start_date: newTrip.startDate,
          end_date: newTrip.endDate,
          budget: newTrip.budget,
          currency: newTrip.currency,
          cover_emoji: newTrip.coverEmoji,
          notes: newTrip.notes,
          status: newTrip.status,
          created_at: newTrip.created_at,
          updated_at: newTrip.updated_at
        }
      });
      if (session) {
        syncPendingMutations();
      }
    }

    return newTrip.id;
  },

  updateTrip: (id, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const updatedTrips = state.trips.map((t) =>
        t.id === id ? { ...t, ...updates, updated_at: now } : t
      );
      let nextActiveTripId = state.activeTripId;
      if (updates.status === 'active') {
        nextActiveTripId = id;
      } else if (state.activeTripId === id && updates.status === 'completed') {
        nextActiveTripId = null;
      }
      return {
        trips: updatedTrips,
        activeTripId: nextActiveTripId
      };
    });

    const { session, addPendingMutation, syncPendingMutations } = get();
    if (addPendingMutation) {
      addPendingMutation({
        type: 'UPDATE_TRIP',
        payload: {
          id,
          ...updates,
          start_date: updates.startDate,
          end_date: updates.endDate,
          cover_emoji: updates.coverEmoji,
          updated_at: now
        }
      });
      if (session) {
        syncPendingMutations();
      }
    }
  },

  deleteTrip: (id) => {
    set((state) => ({
      trips: state.trips.filter((t) => t.id !== id),
      activeTripId: state.activeTripId === id ? null : state.activeTripId,
      // Unlink expenses and debts without deleting the underlying financial records
      expenses: state.expenses.map((e) => (e.trip_id === id ? { ...e, trip_id: null } : e)),
      debts: state.debts.map((d) => (d.trip_id === id ? { ...d, trip_id: null } : d))
    }));

    const { session, addPendingMutation, syncPendingMutations } = get();
    if (addPendingMutation) {
      addPendingMutation({
        type: 'DELETE_TRIP',
        payload: { id }
      });
      if (session) {
        syncPendingMutations();
      }
    }
  },

  setActiveTrip: (id) => {
    set((state) => ({
      activeTripId: id,
      trips: id
        ? state.trips.map((t) => (t.id === id ? { ...t, status: 'active' } : t))
        : state.trips
    }));
  }
});

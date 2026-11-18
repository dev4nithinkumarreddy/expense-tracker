import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { useExpenseStore, type Trip } from '../../store/useExpenseStore';
import { calculateTripSummary, isTripActiveOnDate } from '../../lib/tripCalculations';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import { Button } from '../ui/button';
import { AddTripModal } from './AddTripModal';
import { TripDetailModal } from './TripDetailModal';

interface TripsTabProps {
  onAddTripExpense?: (trip: Trip) => void;
}

export const TripsTab: React.FC<TripsTabProps> = ({ onAddTripExpense }) => {
  const { trips, expenses, debts, settings } = useExpenseStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [selectedTripForDetails, setSelectedTripForDetails] = useState<Trip | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const { activeTrips, upcomingTrips, completedTrips } = React.useMemo(() => {
    const active: Trip[] = [];
    const upcoming: Trip[] = [];
    const completed: Trip[] = [];

    trips.forEach((trip) => {
      if (trip.status === 'completed') {
        completed.push(trip);
      } else if (isTripActiveOnDate(trip, todayStr)) {
        active.push(trip);
      } else if (trip.startDate > todayStr) {
        upcoming.push(trip);
      } else {
        completed.push(trip);
      }
    });

    return {
      activeTrips: active,
      upcomingTrips: upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate)),
      completedTrips: completed.sort((a, b) => b.endDate.localeCompare(a.endDate))
    };
  }, [trips, todayStr]);

  const renderTripCard = (trip: Trip, isActive: boolean = false) => {
    const summary = calculateTripSummary(trip, expenses, debts);
    const currency = trip.currency || settings.currency || '₹';

    return (
      <motion.div
        key={trip.id}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => {
          vibrate(10);
          setSelectedTripForDetails(trip);
        }}
        className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 transition-all cursor-pointer shadow-2xs ${
          isActive
            ? 'bg-gradient-to-br from-primary/10 via-card to-card border-primary/30'
            : 'bg-card/70 hover:bg-card border-border/60'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl sm:text-4xl select-none p-2 bg-background rounded-2xl border border-border/50 shadow-2xs">
              {trip.coverEmoji || '🏖️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : trip.status === 'completed'
                      ? 'bg-secondary text-muted-foreground border-border/60'
                      : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                  }`}
                >
                  {isActive ? `Day ${summary.currentDay} of ${summary.totalDays}` : trip.status}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {trip.startDate}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight mt-0.5">{trip.name}</h3>
              {trip.destination && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  {trip.destination}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm sm:text-base font-bold text-foreground block">
              {formatCurrency(summary.totalSpent, currency)}
            </span>
            {trip.budget > 0 && (
              <span className="text-xs text-muted-foreground block">
                budget {formatCurrency(trip.budget, currency)}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {trip.budget > 0 && (
          <div className="mt-3.5 space-y-1">
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  summary.percentSpent > 100
                    ? 'bg-rose-500'
                    : summary.percentSpent >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, summary.percentSpent)}%` }}
              />
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Trips & Vacation Budgets</h2>
          <p className="text-xs text-muted-foreground">
            Track spending for vacations without affecting monthly limits
          </p>
        </div>
        <Button
          onClick={() => {
            vibrate(10);
            setTripToEdit(null);
            setIsAddModalOpen(true);
          }}
          className="h-10 px-4 rounded-2xl gap-1.5 font-semibold text-xs shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Plan a Trip</span>
        </Button>
      </div>

      {/* Trips list or empty state */}
      {trips.length === 0 ? (
        <div className="text-center py-16 px-4 bg-secondary/20 rounded-3xl border border-dashed border-border/60">
          <div className="text-5xl select-none mb-3">🏖️</div>
          <h3 className="text-base font-bold">No trips planned yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-5">
            Planning a weekend getaway or a holiday? Create a trip to track hotel, food, and travel expenses separately with daily budgets!
          </p>
          <Button
            onClick={() => {
              vibrate(10);
              setIsAddModalOpen(true);
            }}
            className="rounded-2xl gap-2 font-semibold text-xs"
          >
            <Plus className="w-4 h-4" />
            Plan Your First Trip
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Trips */}
          {activeTrips.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Trips ({activeTrips.length})
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeTrips.map((t) => renderTripCard(t, true))}
              </div>
            </div>
          )}

          {/* Upcoming Trips */}
          {upcomingTrips.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Upcoming Trips ({upcomingTrips.length})
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {upcomingTrips.map((t) => renderTripCard(t, false))}
              </div>
            </div>
          )}

          {/* Completed Trips */}
          {completedTrips.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Past Trips ({completedTrips.length})
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {completedTrips.map((t) => renderTripCard(t, false))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddTripModal
        isOpen={isAddModalOpen}
        tripToEdit={tripToEdit}
        onClose={() => {
          setIsAddModalOpen(false);
          setTripToEdit(null);
        }}
      />

      <TripDetailModal
        isOpen={Boolean(selectedTripForDetails)}
        trip={selectedTripForDetails}
        onClose={() => setSelectedTripForDetails(null)}
        onEditTrip={(trip) => {
          setSelectedTripForDetails(null);
          setTripToEdit(trip);
          setIsAddModalOpen(true);
        }}
        onAddExpense={(trip) => {
          if (onAddTripExpense) {
            onAddTripExpense(trip);
          }
        }}
      />
    </div>
  );
};

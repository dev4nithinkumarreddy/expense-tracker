import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { vibrate } from '../../lib/utils';
import { useExpenseStore, type Trip } from '../../store/useExpenseStore';
import { toast } from 'sonner';

interface AddTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripToEdit?: Trip | null;
}

const POPULAR_EMOJIS = ['🏖️', '✈️', '🏔️', '🗼', '🚗', '⛺', '🌴', '🚢', '🎒', '🏰', '🍣', '🍹', '🏕️', '⛷️', '🎡'];

export const AddTripModal: React.FC<AddTripModalProps> = ({ isOpen, onClose, tripToEdit }) => {
  const { addTrip, updateTrip, settings } = useExpenseStore();

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [coverEmoji, setCoverEmoji] = useState('🏖️');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState<'active' | 'upcoming' | 'completed'>('upcoming');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (tripToEdit) {
        setName(tripToEdit.name);
        setDestination(tripToEdit.destination || '');
        setCoverEmoji(tripToEdit.coverEmoji || '🏖️');
        setStartDate(tripToEdit.startDate);
        setEndDate(tripToEdit.endDate);
        setBudget(tripToEdit.budget ? String(tripToEdit.budget) : '');
        setStatus(tripToEdit.status);
        setNotes(tripToEdit.notes || '');
      } else {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setName('');
        setDestination('');
        setCoverEmoji('🏖️');
        setStartDate(today);
        setEndDate(nextWeek);
        setBudget('');
        setStatus('active');
        setNotes('');
      }
    }
  }, [isOpen, tripToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a trip name');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    if (endDate < startDate) {
      toast.error('End date cannot be earlier than start date');
      return;
    }

    const numBudget = parseFloat(budget) || 0;
    setIsSubmitting(true);

    try {
      if (tripToEdit) {
        updateTrip(tripToEdit.id, {
          name: name.trim(),
          destination: destination.trim() || undefined,
          coverEmoji,
          startDate,
          endDate,
          budget: numBudget,
          status,
          notes: notes.trim() || undefined
        });
        toast.success(`Trip "${name}" updated!`);
      } else {
        await addTrip({
          name: name.trim(),
          destination: destination.trim() || undefined,
          coverEmoji,
          startDate,
          endDate,
          budget: numBudget,
          currency: settings.currency || '₹',
          status,
          notes: notes.trim() || undefined
        });
        toast.success(`Trip "${name}" created! 🌴`);
      }
      vibrate(20);
      onClose();
    } catch (err) {
      toast.error('Failed to save trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-card border border-border/80 shadow-2xl rounded-3xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="text-3xl select-none">{coverEmoji}</div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  {tripToEdit ? 'Edit Trip' : 'Plan a New Trip'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Track vacation spending, daily budgets & split bills
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                vibrate(10);
                onClose();
              }}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto flex-1 pr-1">
            {/* Emoji Selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Cover Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      vibrate(5);
                      setCoverEmoji(emoji);
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform active:scale-90 ${
                      coverEmoji === emoji
                        ? 'bg-primary/20 border-2 border-primary scale-110 shadow-xs'
                        : 'bg-secondary/60 hover:bg-secondary border border-border/40'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Trip Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Trip Name *
              </label>
              <Input
                placeholder="e.g. Goa Vacation, Manali Trip, Paris 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 rounded-2xl bg-secondary/40 border-border/60"
              />
            </div>

            {/* Destination */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Destination (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. North Goa, India"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="pl-10 h-11 rounded-2xl bg-secondary/40 border-border/60"
                />
              </div>
            </div>

            {/* Dates: Start & End */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Start Date
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="h-11 rounded-2xl bg-secondary/40 border-border/60"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  End Date
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="h-11 rounded-2xl bg-secondary/40 border-border/60"
                  />
                </div>
              </div>
            </div>

            {/* Budget & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Total Budget ({settings.currency || '₹'})
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 25000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="h-11 rounded-2xl bg-secondary/40 border-border/60"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-11 rounded-2xl bg-secondary/40 border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="active">Active Now 🟢</option>
                  <option value="upcoming">Upcoming 🗓️</option>
                  <option value="completed">Completed ✅</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Notes & Itinerary
              </label>
              <Input
                placeholder="Flight numbers, hotel names, or things to pack..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-11 rounded-2xl bg-secondary/40 border-border/60"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold"
              >
                {tripToEdit ? 'Save Changes' : 'Start Tracking Trip'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

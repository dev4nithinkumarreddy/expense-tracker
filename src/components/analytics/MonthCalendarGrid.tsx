import { useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  isSameDay, 
  isToday, 
  format 
} from 'date-fns';
import { vibrate } from '../../lib/utils';
import type { Expense } from '../../store/useExpenseStore';
import { getExpenseLocalDate } from '../../lib/streak';

interface MonthCalendarGridProps {
  currentMonthDate: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  expenses: Expense[];
}

export function MonthCalendarGrid({
  currentMonthDate,
  selectedDate,
  onSelectDate,
  expenses
}: MonthCalendarGridProps) {
  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);
  const monthDays = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  // Sunday = 0, Monday = 1. We start weeks on Monday (index 0).
  const startDayOfWeek = (getDay(monthStart) + 6) % 7;
  const emptyPrefixDays = new Array(startDayOfWeek).fill(null);

  // Map expenses by local day string "YYYY-MM-DD"
  const daySpendMap = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    expenses.forEach((e) => {
      if (e.category === 'Income' || e.amount <= 0) return;
      const dateKey = getExpenseLocalDate(e.date);
      const current = map.get(dateKey) || { count: 0, total: 0 };
      map.set(dateKey, {
        count: current.count + 1,
        total: current.total + Number(e.amount)
      });
    });
    return map;
  }, [expenses]);

  const dailyTotals = Array.from(daySpendMap.values()).map(v => v.total);
  const avgSpend = dailyTotals.length > 0 ? dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length : 500;

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-card/85 dark:bg-card/65 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-xs space-y-3">
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Interactive Calendar Inspector
        </span>
        <span className="text-[11px] text-muted-foreground">
          Tap any date to view individual transactions
        </span>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((day) => (
          <span key={day} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
            {day}
          </span>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {/* Leading blanks */}
        {emptyPrefixDays.map((_, i) => (
          <div key={`prefix-${i}`} className="aspect-square" />
        ))}

        {/* Days of Month */}
        {monthDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const spendInfo = daySpendMap.get(dateKey);
          const hasSpend = (spendInfo?.total || 0) > 0;
          const isHeavySpend = hasSpend && (spendInfo?.total || 0) > avgSpend * 1.5;
          const isCurrentSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentDay = isToday(day);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => {
                vibrate(10);
                if (isCurrentSelected) {
                  onSelectDate(null); // toggle off
                } else {
                  onSelectDate(day);
                }
              }}
              className={`group relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all select-none active:scale-95 ${
                isCurrentSelected
                  ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 z-10'
                  : isCurrentDay
                  ? 'bg-secondary/90 text-foreground font-bold ring-2 ring-primary/60'
                  : 'hover:bg-secondary/60 text-foreground'
              }`}
            >
              <span className={`text-xs ${isCurrentSelected ? 'font-bold' : isCurrentDay ? 'font-bold' : 'font-medium'}`}>
                {day.getDate()}
              </span>

              {/* Heat Dot Indicator */}
              <div className="h-1.5 flex items-center justify-center mt-0.5">
                {hasSpend ? (
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125 ${
                      isCurrentSelected
                        ? 'bg-white'
                        : isHeavySpend
                        ? 'bg-amber-500 ring-1 ring-amber-400'
                        : 'bg-primary'
                    }`}
                    title={`${dateKey}: ${spendInfo?.count} expenses`}
                  />
                ) : (
                  <span className="w-1.5 h-1.5 opacity-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

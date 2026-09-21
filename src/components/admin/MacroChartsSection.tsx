import { motion } from 'framer-motion';
import { BarChart3, PieChart, Clock, Flame, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';

interface MacroChartsSectionProps {
  platformCategories?: Array<{
    name: string;
    amount: number;
    percent: number;
  }>;
  hourlyDistribution?: number[];
  totalSpend: number;
}

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-indigo-500'
];

export function MacroChartsSection({
  platformCategories = [],
  hourlyDistribution = new Array(24).fill(0),
  totalSpend
}: MacroChartsSectionProps) {
  const maxHourlyCount = Math.max(...hourlyDistribution, 1);
  const peakHourIndex = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
  const peakHourFormatted = `${peakHourIndex % 12 || 12}:00 ${peakHourIndex >= 12 ? 'PM' : 'AM'}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Platform Category Spend Distribution */}
      <div className="p-6 rounded-3xl bg-card border border-border/70 shadow-sm flex flex-col justify-between gap-5">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Platform Spending Distribution
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground">
              Total {formatCurrency(totalSpend)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Macro breakdown of expenses aggregated across all registered users
          </p>
        </div>

        {platformCategories.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No platform expenses recorded yet.
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Multi-segment stacked bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
              {platformCategories.map((cat, idx) => (
                <div
                  key={cat.name}
                  className={`h-full ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} transition-all`}
                  style={{ width: `${cat.percent}%` }}
                  title={`${cat.name}: ${cat.percent}%`}
                />
              ))}
            </div>

            {/* Category breakdown list */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {platformCategories.map((cat, idx) => (
                <div
                  key={cat.name}
                  className="p-2.5 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} shrink-0`} />
                    <span className="font-medium text-foreground truncate">{cat.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-foreground">{cat.percent}%</span>
                    <p className="text-[10px] text-muted-foreground font-mono">{formatCurrency(cat.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground border-t border-border/50 pt-3">
          <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
          <span>Real-time aggregations calculated directly from database records</span>
        </div>
      </div>

      {/* 24-Hour Activity Heatmap / Bar Chart */}
      <div className="p-6 rounded-3xl bg-card border border-border/70 shadow-sm flex flex-col justify-between gap-5">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                24-Hour Activity Heatmap
              </h3>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5" />
              <span>Peak: {peakHourFormatted}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Activity density by hour of the day. Use to schedule push notifications when users are most active.
          </p>
        </div>

        {/* Bar Chart Visualization */}
        <div className="pt-4">
          <div className="h-36 flex items-end gap-1 sm:gap-1.5 justify-between">
            {hourlyDistribution.map((count, hour) => {
              const heightPercent = maxHourlyCount > 0 ? Math.max((count / maxHourlyCount) * 100, 8) : 8;
              const isPeak = hour === peakHourIndex && count > 0;
              const hourLabel = `${hour % 12 || 12}${hour >= 12 ? 'p' : 'a'}`;

              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 hidden group-hover:flex items-center px-1.5 py-0.5 rounded bg-foreground text-background text-[10px] font-bold whitespace-nowrap shadow-md pointer-events-none z-10">
                    {hour}:00 - {count} logs
                  </div>

                  <div className="w-full h-28 flex items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ duration: 0.5, delay: hour * 0.01 }}
                      className={`w-full max-w-[14px] rounded-t-sm transition-all duration-200 ${
                        isPeak
                          ? 'bg-amber-500 shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
                          : count > 0
                          ? 'bg-primary/70 group-hover:bg-primary'
                          : 'bg-muted/60'
                      }`}
                    />
                  </div>

                  <span className={`text-[9px] ${isPeak ? 'font-bold text-amber-500' : 'text-muted-foreground'} scale-90 sm:scale-100`}>
                    {hour % 4 === 0 ? hourLabel : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/50 mt-3">
            <span>12 AM (Midnight)</span>
            <span>12 PM (Noon)</span>
            <span>11 PM (Night)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground border-t border-border/50 pt-3">
          <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
          <span>Recommended broadcast window: 30 minutes before peak ({peakHourFormatted})</span>
        </div>
      </div>
    </div>
  );
}

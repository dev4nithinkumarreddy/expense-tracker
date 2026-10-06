import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { calculateSafeToSpend } from '../../lib/safeToSpend';
import { formatCurrency } from '../../lib/formatCurrency';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ShieldCheck, AlertTriangle, AlertCircle, Compass, Sparkles, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SafeToSpendCardProps {
  availableBalance: number;
  upcomingObligations: number;
  currency: string;
  totalMonthlyBudget: number;
  currentSpent?: number;
  salaryCycleDay?: number;
  variant?: 'card' | 'embedded';
}

export function SafeToSpendCard({
  availableBalance,
  upcomingObligations,
  currency,
  totalMonthlyBudget,
  currentSpent = 0,
  salaryCycleDay = 1,
  variant = 'card',
}: SafeToSpendCardProps) {
  const safe = calculateSafeToSpend(
    availableBalance,
    upcomingObligations,
    new Date(),
    totalMonthlyBudget,
    currentSpent,
    salaryCycleDay
  );

  const [simAmount, setSimAmount] = useState<string>('');
  const [showSimInput, setShowSimInput] = useState(false);
  const [showProjectionDetails, setShowProjectionDetails] = useState(false);
  const parsedSim = parseFloat(simAmount) || 0;
  const simulation = parsedSim > 0 ? safe.simulateSpend(parsedSim) : null;

  const { projection } = safe;

  const content = (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Safe Daily Runway</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {safe.daysRemaining} days left in {projection.cycleLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border',
              safe.status === 'safe'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                : safe.status === 'caution'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
                : 'bg-destructive/15 text-destructive border-destructive/25'
            )}
          >
            {safe.status === 'safe' ? (
              <ShieldCheck className="w-3 h-3" />
            ) : safe.status === 'caution' ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {safe.statusText}
          </span>

          <button
            type="button"
            onClick={() => setShowSimInput(!showSimInput)}
            className="text-[10px] font-medium text-primary hover:text-primary/80 px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-all flex items-center gap-1 cursor-pointer"
            title="Simulate how an upcoming expense would impact your daily allowance"
          >
            <Sparkles className="w-3 h-3" />
            <span>{showSimInput ? 'Close' : 'What if?'}</span>
          </button>
        </div>
      </div>

      {/* Main Stat & Context */}
      <div className="flex items-baseline justify-between pt-0.5">
        <div>
          <p className="text-2xl sm:text-3xl font-black display-number tracking-tight text-foreground">
            <AnimatedNumber
              value={simulation ? simulation.newDailyAllowance : safe.dailyAllowance}
              formatFn={(val) => formatCurrency(val, currency)}
            />
            <span className="text-xs font-semibold text-muted-foreground ml-1">/ day</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Target daily pace to stay within your monthly budget
          </p>
        </div>

        {/* Compact What-If Spend Calculator (Expanded or Active) */}
        {(showSimInput || simulation) && (
          <div className="flex flex-col items-end gap-1 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Test:</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus={showSimInput}
                placeholder="₹ Amount"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value.replace(/[^\d.]/g, ''))}
                className="w-24 text-right bg-secondary/70 rounded-xl px-2.5 py-1 text-xs font-medium border border-border/50 focus:outline-none focus:border-primary"
              />
            </div>
            {simulation && (
              <span className="text-[10px] font-semibold text-amber-500">
                -{formatCurrency(simulation.impactPerDay, currency)}/day impact
              </span>
            )}
          </div>
        )}
      </div>

      {/* End-of-Month Projection Pill & Toggle */}
      {totalMonthlyBudget > 0 && (
        <div className="pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={() => setShowProjectionDetails(!showProjectionDetails)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              {projection.projectedStatus === 'surplus' ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3 h-3" />
                </div>
              ) : projection.projectedStatus === 'deficit' ? (
                <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-3 h-3" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Compass className="w-3 h-3" />
                </div>
              )}
              <span className="text-xs font-semibold text-foreground truncate">
                {projection.projectedStatus === 'surplus'
                  ? `Projected Month-End: +${formatCurrency(projection.projectedSurplus, currency)} surplus`
                  : projection.projectedStatus === 'deficit'
                  ? `Projected Deficit: -${formatCurrency(Math.abs(projection.projectedSurplus), currency)} ${projection.expectedDeficitDate ? `around ${projection.expectedDeficitDate}` : ''}`
                  : `Projected Month-End: On track with budget`}
              </span>
            </div>
            <div className="text-muted-foreground shrink-0 pl-1">
              {showProjectionDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Expanded Projection Trajectory Breakdown */}
          {showProjectionDetails && (
            <div className="mt-2 p-2.5 rounded-xl bg-background/80 border border-border/50 text-xs space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Current Daily Pace:</span>
                <span className="font-semibold text-foreground">{formatCurrency(projection.avgDailyPace, currency)} / day</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Projected Total Spend:</span>
                <span className="font-semibold text-foreground">{formatCurrency(projection.projectedSpend, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Monthly Budget:</span>
                <span className="font-semibold text-foreground">{formatCurrency(totalMonthlyBudget, currency)}</span>
              </div>
              <div className="pt-1 border-t border-border/40 flex justify-between items-center font-bold">
                <span>Estimated Outcome:</span>
                <span className={cn(
                  projection.projectedSurplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  {projection.projectedSurplus >= 0 ? "+" : ""}{formatCurrency(projection.projectedSurplus, currency)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (variant === 'embedded') {
    return content;
  }

  return (
    <Card className="rounded-3xl border border-white/20 dark:border-white/10 bg-card/85 dark:bg-card/70 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardContent className="p-4.5">
        {content}
      </CardContent>
    </Card>
  );
}

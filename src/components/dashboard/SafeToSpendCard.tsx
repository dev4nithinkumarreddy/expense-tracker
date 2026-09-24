import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { calculateSafeToSpend } from '../../lib/safeToSpend';
import { formatCurrency } from '../../lib/formatCurrency';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ShieldCheck, AlertTriangle, AlertCircle, Compass, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SafeToSpendCardProps {
  availableBalance: number;
  upcomingObligations: number;
  currency: string;
  totalMonthlyBudget: number;
  variant?: 'card' | 'embedded';
}

export function SafeToSpendCard({
  availableBalance,
  upcomingObligations,
  currency,
  totalMonthlyBudget,
  variant = 'card',
}: SafeToSpendCardProps) {
  const safe = calculateSafeToSpend(
    availableBalance,
    upcomingObligations,
    new Date(),
    totalMonthlyBudget
  );

  const [simAmount, setSimAmount] = useState<string>('');
  const [showSimInput, setShowSimInput] = useState(false);
  const parsedSim = parseFloat(simAmount) || 0;
  const simulation = parsedSim > 0 ? safe.simulateSpend(parsedSim) : null;

  const content = (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 truncate">
              <span>Safe Daily Runway</span>
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {safe.daysRemaining} days remaining this month
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
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
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2.5 pt-0.5">
        <div className="min-w-0">
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
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 p-2 rounded-2xl bg-secondary/50 sm:bg-transparent sm:p-0 border border-border/40 sm:border-0 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">Test:</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus={showSimInput}
                placeholder="Amount"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value.replace(/[^\d.]/g, ''))}
                className="w-24 text-right bg-card dark:bg-secondary/70 rounded-xl px-2.5 py-1 text-xs font-semibold border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {simulation && (
              <span className="text-[10px] font-bold text-amber-500">
                -{formatCurrency(simulation.impactPerDay, currency)}/day impact
              </span>
            )}
          </div>
        )}
      </div>
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

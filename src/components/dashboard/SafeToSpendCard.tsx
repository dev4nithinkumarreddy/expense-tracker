import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { calculateSafeToSpend } from '../../lib/safeToSpend';
import { formatCurrency } from '../../lib/formatCurrency';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ShieldCheck, AlertTriangle, AlertCircle, Compass } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SafeToSpendCardProps {
  availableBalance: number;
  upcomingObligations: number;
  currency: string;
  totalMonthlyBudget: number;
}

export function SafeToSpendCard({
  availableBalance,
  upcomingObligations,
  currency,
  totalMonthlyBudget,
}: SafeToSpendCardProps) {
  const safe = calculateSafeToSpend(
    availableBalance,
    upcomingObligations,
    new Date(),
    totalMonthlyBudget
  );

  const [simAmount, setSimAmount] = useState<string>('');
  const parsedSim = parseFloat(simAmount) || 0;
  const simulation = parsedSim > 0 ? safe.simulateSpend(parsedSim) : null;

  return (
    <Card className="rounded-3xl border border-white/20 dark:border-white/10 bg-card/85 dark:bg-card/70 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardContent className="p-4.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Safe-to-Spend Runway
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {safe.daysRemaining} days remaining in month
              </p>
            </div>
          </div>

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
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div>
            <p className="text-3xl font-black display-number tracking-tight text-foreground">
              <AnimatedNumber
                value={simulation ? simulation.newDailyAllowance : safe.dailyAllowance}
                formatFn={(val) => formatCurrency(val, currency)}
              />
              <span className="text-xs font-semibold text-muted-foreground ml-1">/ day</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Available pool: {formatCurrency(simulation ? simulation.newPool : safe.discretionaryPool, currency)}
            </p>
          </div>

          {/* Quick What-If Spend Calculator */}
          <div className="flex flex-col items-end gap-1">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Test spend (₹)..."
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value.replace(/[^\d.]/g, ''))}
              className="w-28 text-right bg-secondary/60 rounded-xl px-2.5 py-1 text-xs font-medium border border-border/40 focus:outline-none focus:border-primary"
            />
            {simulation && (
              <span className="text-[10px] font-semibold text-amber-500">
                -{formatCurrency(simulation.impactPerDay, currency)}/day impact
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

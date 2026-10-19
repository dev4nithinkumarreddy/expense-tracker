import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { calculateSafeToSpend } from '../../lib/safeToSpend';
import { formatCurrency } from '../../lib/formatCurrency';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';
import CalculateOutlined from '@mui/icons-material/CalculateOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlined from '@mui/icons-material/TrendingDownOutlined';
import KeyboardArrowDownOutlined from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlined from '@mui/icons-material/KeyboardArrowUpOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
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

  const statusIcons = {
    safe: <CheckCircleOutlined className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fontSize="inherit" />,
    caution: <WarningAmberOutlined className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fontSize="inherit" />,
    critical: <ErrorOutlined className="w-3.5 h-3.5 text-destructive" fontSize="inherit" />,
  };

  const statusBadgeClasses = {
    safe: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    caution: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
    critical: 'bg-destructive/10 text-destructive border-destructive/30',
  }[safe.status];

  const content = (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground shrink-0 border border-border">
            <SpeedOutlined className="w-4 h-4 text-primary" fontSize="inherit" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daily Runway
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {safe.daysRemaining} days left in {projection.cycleLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 border select-none',
              statusBadgeClasses
            )}
          >
            {statusIcons[safe.status]}
            <span>{safe.statusText}</span>
          </span>

          <button
            type="button"
            onClick={() => setShowSimInput(!showSimInput)}
            className="text-[11px] font-medium text-foreground hover:bg-secondary active:scale-[0.98] px-2.5 py-1 rounded-md border border-border transition-colors flex items-center gap-1 cursor-pointer select-none"
            title="Simulate how an upcoming expense would impact your daily allowance"
          >
            <CalculateOutlined className="w-3.5 h-3.5 text-primary" fontSize="inherit" />
            <span>{showSimInput ? 'Close' : 'Simulate'}</span>
          </button>
        </div>
      </div>

      {/* Main Stat & Context */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <p className="text-2xl sm:text-3xl font-bold font-mono display-number tracking-tight text-foreground">
            <AnimatedNumber
              value={simulation ? simulation.newDailyAllowance : safe.dailyAllowance}
              formatFn={(val) => formatCurrency(val, currency)}
            />
            <span className="text-xs font-normal text-muted-foreground font-sans ml-1">/ day</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Target daily pace to stay within monthly budget
          </p>
        </div>

        {/* Compact Simulation Calculator */}
        {(showSimInput || simulation) && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Test:</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus={showSimInput}
                placeholder="Amount"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value.replace(/[^\d.]/g, ''))}
                className="w-24 text-right bg-background rounded-lg px-2.5 py-1 text-xs font-mono font-medium border border-border focus:outline-none focus:border-primary"
              />
            </div>
            {simulation && (
              <span className="text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                -{formatCurrency(simulation.impactPerDay, currency)}/day impact
              </span>
            )}
          </div>
        )}
      </div>

      {/* End-of-Month Projection Toggle */}
      {totalMonthlyBudget > 0 && (
        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => setShowProjectionDetails(!showProjectionDetails)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left cursor-pointer border border-border/60"
          >
            <div className="flex items-center gap-2 min-w-0">
              {projection.projectedStatus === 'surplus' ? (
                <TrendingUpOutlined className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fontSize="inherit" />
              ) : projection.projectedStatus === 'deficit' ? (
                <TrendingDownOutlined className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" fontSize="inherit" />
              ) : (
                <SpeedOutlined className="w-4 h-4 text-primary shrink-0" fontSize="inherit" />
              )}
              <span className="text-xs font-medium text-foreground truncate">
                {projection.projectedStatus === 'surplus'
                  ? `Projected Surplus: +${formatCurrency(projection.projectedSurplus, currency)}`
                  : projection.projectedStatus === 'deficit'
                  ? `Projected Deficit: -${formatCurrency(Math.abs(projection.projectedSurplus), currency)} ${projection.expectedDeficitDate ? `around ${projection.expectedDeficitDate}` : ''}`
                  : `Projected Outcome: Balanced with budget`}
              </span>
            </div>
            <div className="text-muted-foreground shrink-0 pl-1">
              {showProjectionDetails ? (
                <KeyboardArrowUpOutlined className="w-4 h-4" fontSize="inherit" />
              ) : (
                <KeyboardArrowDownOutlined className="w-4 h-4" fontSize="inherit" />
              )}
            </div>
          </button>

          {/* Expanded Projection Trajectory Breakdown */}
          {showProjectionDetails && (
            <div className="mt-2 p-3 rounded-lg bg-secondary/30 border border-border text-xs space-y-1.5">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Daily Pace:</span>
                <span className="font-mono font-medium text-foreground">{formatCurrency(projection.avgDailyPace, currency)} / day</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Projected Spend:</span>
                <span className="font-mono font-medium text-foreground">{formatCurrency(projection.projectedSpend, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Monthly Budget:</span>
                <span className="font-mono font-medium text-foreground">{formatCurrency(totalMonthlyBudget, currency)}</span>
              </div>
              <div className="pt-1.5 border-t border-border flex justify-between items-center font-bold">
                <span>Estimated Margin:</span>
                <span className={cn(
                  'font-mono',
                  projection.projectedSurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}>
                  {projection.projectedSurplus >= 0 ? '+' : ''}{formatCurrency(projection.projectedSurplus, currency)}
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
    <Card className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        {content}
      </CardContent>
    </Card>
  );
}

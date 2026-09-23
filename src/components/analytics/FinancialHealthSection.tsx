import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { calculateFinancialHealth } from '../../lib/financialHealth';
import { formatCurrency } from '../../lib/formatCurrency';
import type { Expense } from '../../store/types';
import { Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FinancialHealthSectionProps {
  monthlyIncome: number;
  expenses: Expense[];
  currency: string;
  selectedMonthStr?: string;
}

export function FinancialHealthSection({
  monthlyIncome,
  expenses,
  currency,
  selectedMonthStr,
}: FinancialHealthSectionProps) {
  const health = calculateFinancialHealth(monthlyIncome, expenses, selectedMonthStr);

  return (
    <Card className="rounded-3xl border border-border/50 bg-card/85 dark:bg-card/70 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">50 / 30 / 20 Health Score</CardTitle>
              <p className="text-xs text-muted-foreground">Needs, Wants & Wealth Building</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-bold',
                health.score >= 80
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : health.score >= 60
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-destructive/15 text-destructive'
              )}
            >
              {health.score} / 100 • {health.rating}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Progress Ratio Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-blue-500">Needs: {health.needsPercentage}% (Target 50%)</span>
            <span className="text-amber-500">Wants: {health.wantsPercentage}% (Target 30%)</span>
            <span className="text-emerald-500">Savings: {health.savingsPercentage}% (Target 20%)</span>
          </div>

          <div className="h-3 w-full bg-secondary/70 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${health.needsPercentage}%` }}
              className="h-full bg-blue-500 transition-all duration-500"
              title={`Needs: ${formatCurrency(health.needsAmount, currency)}`}
            />
            <div
              style={{ width: `${health.wantsPercentage}%` }}
              className="h-full bg-amber-500 transition-all duration-500"
              title={`Wants: ${formatCurrency(health.wantsAmount, currency)}`}
            />
            <div
              style={{ width: `${health.savingsPercentage}%` }}
              className="h-full bg-emerald-500 transition-all duration-500"
              title={`Savings: ${formatCurrency(health.savingsAmount, currency)}`}
            />
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">Needs</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(health.needsAmount, currency)}</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">Wants</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(health.wantsAmount, currency)}</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Savings</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(health.savingsAmount, currency)}</p>
          </div>
        </div>

        {/* Actionable Tips */}
        {health.tips.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/30">
            {health.tips.map((tip, idx) => (
              <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span>{tip}</span>
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

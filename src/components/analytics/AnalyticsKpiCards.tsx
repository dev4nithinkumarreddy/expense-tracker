import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Flame, PiggyBank, BarChart3, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';
import type { MonthKPIs } from '../../lib/analytics';

interface AnalyticsKpiCardsProps {
  kpis: MonthKPIs;
  currency: string;
}

export function AnalyticsKpiCards({ kpis, currency }: AnalyticsKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Spent */}
      <Card className="rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl shadow-xs hover:border-primary/30 transition-all group">
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Total Spent</span>
            <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="text-xl sm:text-2xl font-bold tracking-tight">
            {formatCurrency(kpis.totalExpenses, currency)}
          </div>
          <div className="flex items-center gap-1 mt-1.5 text-xs">
            {kpis.percentChangeFromLastMonth !== 0 ? (
              <>
                {kpis.percentChangeFromLastMonth > 0 ? (
                  <span className="text-rose-500 font-semibold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +{kpis.percentChangeFromLastMonth}%
                  </span>
                ) : (
                  <span className="text-emerald-500 font-semibold flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" /> {kpis.percentChangeFromLastMonth}%
                  </span>
                )}
                <span className="text-muted-foreground/80 text-[11px]">vs last mo</span>
              </>
            ) : (
              <span className="text-muted-foreground/70 text-[11px]">No change vs last mo</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Net Savings & Rate */}
      <Card className="rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl shadow-xs hover:border-emerald-500/30 transition-all group">
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Net Savings</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className={`text-xl sm:text-2xl font-bold tracking-tight ${kpis.netSavings < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(kpis.netSavings, currency)}
          </div>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <span className={`font-semibold ${kpis.savingsRate < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
              {kpis.savingsRate}%
            </span>
            <span className="text-muted-foreground/80 text-[11px]">savings rate</span>
          </div>
        </CardContent>
      </Card>

      {/* Daily Burn Rate */}
      <Card className="rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl shadow-xs hover:border-blue-500/30 transition-all group">
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Daily Average</span>
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="text-xl sm:text-2xl font-bold tracking-tight">
            {formatCurrency(kpis.dailyAverage, currency)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Spent per day
          </p>
        </CardContent>
      </Card>

      {/* Month-End Projection */}
      <Card className="rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl shadow-xs hover:border-purple-500/30 transition-all group">
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Forecast</span>
            <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            {formatCurrency(kpis.projectedMonthEnd, currency)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Projected monthly total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../lib/formatCurrency';
import type { MultiMonthTrendItem } from '../../lib/analytics';

interface SixMonthTrendsViewProps {
  sixMonthTrends: MultiMonthTrendItem[];
  sixMonthSummary: {
    totalExp: number;
    avgExp: number;
    totalSav: number;
  };
  currency: string;
}

export function SixMonthTrendsView({
  sixMonthTrends,
  sixMonthSummary,
  currency
}: SixMonthTrendsViewProps) {
  return (
    <div className="space-y-6">
      {/* 6-Month Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl text-center shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">6M Total Spend</span>
          <span className="text-base font-bold text-foreground mt-1 block">
            {formatCurrency(sixMonthSummary.totalExp, currency)}
          </span>
        </Card>
        <Card className="p-4 rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl text-center shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Monthly Avg</span>
          <span className="text-base font-bold text-primary mt-1 block">
            {formatCurrency(sixMonthSummary.avgExp, currency)}
          </span>
        </Card>
        <Card className="p-4 rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl text-center shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">6M Net Savings</span>
          <span className={`text-base font-bold mt-1 block ${sixMonthSummary.totalSav < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
            {formatCurrency(sixMonthSummary.totalSav, currency)}
          </span>
        </Card>
      </div>

      {/* 6-Month Income vs Expense Bar Chart */}
      <Card className="rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl shadow-xs overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">6-Month Cash Flow (Income vs Expenses)</CardTitle>
          <p className="text-xs text-muted-foreground">Historical monthly comparison over the past 6 months</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sixMonthTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis 
                  dataKey="monthLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value), currency), 
                    name === 'income' ? 'Income' : 'Expenses'
                  ]}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 8px 16px -2px rgb(0 0 0 / 0.15)',
                    backgroundColor: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs capitalize font-medium text-foreground">{value}</span>}
                />
                <Bar dataKey="income" fill="hsl(var(--chart-2))" name="income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--chart-1))" name="expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import type { DailySpendItem, MonthKPIs } from '../../lib/analytics';

interface DailySpendingBarCardProps {
  dailyData: DailySpendItem[];
  kpis: MonthKPIs;
  currentDate: Date;
  selectedDate: Date | null;
  currency: string;
  onSelectDate: (date: Date) => void;
}

export function DailySpendingBarCard({
  dailyData,
  kpis,
  currentDate,
  selectedDate,
  currency,
  onSelectDate
}: DailySpendingBarCardProps) {
  return (
    <Card className="rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardHeader className="pb-1 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Daily Spending Pattern</CardTitle>
          <p className="text-xs text-muted-foreground">Expenses across the month • Tap any bar to inspect day</p>
        </div>
        {kpis.peakExpenseDay && (
          <div className="text-right">
            <span className="text-[11px] font-medium bg-secondary/80 px-2.5 py-1 rounded-xl text-muted-foreground">
              Peak: Day {kpis.peakExpenseDay.day} ({formatCurrency(kpis.peakExpenseDay.amount, currency)})
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={dailyData} 
              margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const item = state.activePayload[0].payload as any;
                  if (item && item.dateStr) {
                    vibrate(10);
                    const [y, m, d] = item.dateStr.split('-').map(Number);
                    onSelectDate(new Date(y, m - 1, d));
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis 
                dataKey="dayLabel" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval={2}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip 
                formatter={(value: any) => [formatCurrency(Number(value), currency), 'Spent']}
                labelFormatter={(label) => `Day ${label}, ${format(currentDate, 'MMM yyyy')} (Tap to inspect)`}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 8px 16px -2px rgb(0 0 0 / 0.15)',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))'
                }}
                cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }}
              />
              <Bar 
                dataKey="amount" 
                radius={[4, 4, 0, 0]} 
                className="cursor-pointer"
              >
                {dailyData.map((entry) => {
                  const isSelected = selectedDate ? format(selectedDate, 'yyyy-MM-dd') === entry.dateStr : false;
                  return (
                    <Cell
                      key={`cell-bar-${entry.day}`}
                      fill={isSelected ? 'hsl(var(--chart-2))' : 'hsl(var(--primary))'}
                      opacity={selectedDate && !isSelected ? 0.55 : 1}
                      className="transition-all hover:opacity-80"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

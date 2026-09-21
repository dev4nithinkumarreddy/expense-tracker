import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import type { CategoryBreakdownItem } from '../../lib/analytics';

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))', 'hsl(var(--chart-6))', 'hsl(var(--chart-7))', 'hsl(var(--chart-8))'
];

interface CategoryDonutCardProps {
  categoryData: CategoryBreakdownItem[];
  currency: string;
  totalExpenses: number;
  onSelectCategory: (categoryName: string) => void;
}

export function CategoryDonutCard({
  categoryData,
  currency,
  totalExpenses,
  onSelectCategory
}: CategoryDonutCardProps) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const activeCategory = activeCategoryIndex !== null ? categoryData[activeCategoryIndex] : null;

  return (
    <Card className="rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
        <p className="text-xs text-muted-foreground">Tap or hover over slices to inspect category totals</p>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="relative h-[250px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                innerRadius={68}
                outerRadius={92}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                onMouseEnter={(_, index) => setActiveCategoryIndex(index)}
                onMouseLeave={() => setActiveCategoryIndex(null)}
                onClick={(_, index) => {
                  vibrate(10);
                  onSelectCategory(categoryData[index].name);
                }}
              >
                {categoryData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    className="cursor-pointer transition-all hover:opacity-85"
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [formatCurrency(Number(value), currency), 'Spent']}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 8px 16px -2px rgb(0 0 0 / 0.15)',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))'
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Dynamic Donut Center Metric */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px]">
              {activeCategory ? activeCategory.name : "Total Spent"}
            </span>
            <span className="text-lg font-bold text-foreground mt-0.5">
              {formatCurrency(activeCategory ? activeCategory.value : totalExpenses, currency)}
            </span>
            {activeCategory && (
              <span className="text-[11px] font-semibold text-primary mt-0.5">
                {activeCategory.percentage}% of total
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

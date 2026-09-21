import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import type { CategoryBreakdownItem } from '../../lib/analytics';

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))', 'hsl(var(--chart-6))', 'hsl(var(--chart-7))', 'hsl(var(--chart-8))'
];

interface CategoryPacingListProps {
  categoryData: CategoryBreakdownItem[];
  currency: string;
  categoryEmojis?: Record<string, string>;
  onSelectCategory: (categoryName: string) => void;
}

export function CategoryPacingList({
  categoryData,
  currency,
  categoryEmojis,
  onSelectCategory
}: CategoryPacingListProps) {
  return (
    <Card className="rounded-3xl border-border/50 bg-card/75 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base font-semibold">Categories & Budget Pacing</CardTitle>
            <p className="text-xs text-muted-foreground">Tap any category to view individual transactions</p>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {categoryData.length} categories
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {categoryData.map((cat, idx) => {
          const color = COLORS[idx % COLORS.length];
          const isBudgeted = cat.budgetLimit && cat.budgetLimit > 0;
          const isOverBudget = cat.budgetUsedPercent && cat.budgetUsedPercent > 100;
          const isNearBudget = cat.budgetUsedPercent && cat.budgetUsedPercent >= 80 && !isOverBudget;

          return (
            <div 
              key={cat.name}
              onClick={() => {
                vibrate(10);
                onSelectCategory(cat.name);
              }}
              className="group p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/40 transition-all cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-2xl flex items-center justify-center text-base bg-secondary/80 border border-border/60 shadow-xs shrink-0 transition-transform group-hover:scale-105"
                    style={{ 
                      boxShadow: `inset 0 0 0 1.5px ${color}40`,
                      backgroundColor: `${color}15`
                    }}
                  >
                    {categoryEmojis?.[cat.name] || cat.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-foreground truncate">{cat.name}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {isBudgeted && (
                      <p className="text-[11px] text-muted-foreground">
                        Limit: {formatCurrency(cat.budgetLimit!, currency)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-semibold">{formatCurrency(cat.value, currency)}</span>
                    <span className="text-xs text-muted-foreground w-7 text-right">{cat.percentage}%</span>
                  </div>
                  {isBudgeted && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isOverBudget 
                        ? 'bg-destructive/15 text-destructive font-semibold' 
                        : isNearBudget 
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {cat.budgetUsedPercent}% used
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, isBudgeted ? (cat.budgetUsedPercent || 0) : cat.percentage)}%`,
                    backgroundColor: isOverBudget ? 'hsl(var(--destructive))' : isNearBudget ? '#f59e0b' : color
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

import { useExpenseStore } from "../store/useExpenseStore";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from "recharts";
import { useState, useMemo } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Calendar, 
  Sparkles, 
  ArrowUpRight,
  Flame,
  PieChart as PieIcon,
  BarChart3
} from "lucide-react";
import { Button } from "../components/ui/button";
import { formatCurrency } from "../lib/formatCurrency";
import { 
  calculateMonthKPIs, 
  calculateMultiMonthTrends, 
  calculateDailySpend, 
  calculateCategoryBreakdown, 
  generateSmartInsights 
} from "../lib/analytics";
import { getExpenseLocalDate } from "../lib/streak";
import { CategoryDetailModal } from "../components/CategoryDetailModal";
import { vibrate } from "../lib/utils";

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))', 'hsl(var(--chart-6))', 'hsl(var(--chart-7))', 'hsl(var(--chart-8))'
];

export default function Analytics() {
  const { expenses, settings, budgets } = useExpenseStore();
  
  const [viewMode, setViewMode] = useState<'monthly' | 'trends'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [selectedCategoryForDrilldown, setSelectedCategoryForDrilldown] = useState<string | null>(null);

  const selectedMonthStr = format(currentDate, 'yyyy-MM');
  const monthDisplayLabel = format(currentDate, 'MMMM yyyy');

  // Month KPIs
  const kpis = useMemo(() => {
    return calculateMonthKPIs(expenses, settings.monthlyIncome, currentDate);
  }, [expenses, settings.monthlyIncome, currentDate]);

  // Category Breakdown with Budget Pacing
  const categoryData = useMemo(() => {
    return calculateCategoryBreakdown(expenses, budgets, selectedMonthStr);
  }, [expenses, budgets, selectedMonthStr]);

  // Daily Spending Chart Data
  const dailyData = useMemo(() => {
    return calculateDailySpend(expenses, currentDate);
  }, [expenses, currentDate]);

  // Multi-Month Trend Data (Last 6 months)
  const sixMonthTrends = useMemo(() => {
    return calculateMultiMonthTrends(expenses, settings.monthlyIncome, currentDate, 6);
  }, [expenses, settings.monthlyIncome, currentDate]);

  // Smart Financial Insights
  const smartInsights = useMemo(() => {
    return generateSmartInsights(kpis, categoryData, settings.currency);
  }, [kpis, categoryData, settings.currency]);

  // Extract Smart Tags for selected month
  const tagData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      if (getExpenseLocalDate(e.date).startsWith(selectedMonthStr) && e.category !== 'Income' && e.amount > 0) {
        const tags = e.description.match(/#[\w-]+/g);
        if (tags) {
          tags.forEach(t => {
            const cleanTag = t.toLowerCase();
            map[cleanTag] = (map[cleanTag] || 0) + e.amount;
          });
        }
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses, selectedMonthStr]);

  // Expenses filtered for category drill-down
  const drilldownExpenses = useMemo(() => {
    if (!selectedCategoryForDrilldown) return [];
    return expenses.filter(e => 
      getExpenseLocalDate(e.date).startsWith(selectedMonthStr) &&
      e.category === selectedCategoryForDrilldown &&
      e.amount > 0
    );
  }, [expenses, selectedMonthStr, selectedCategoryForDrilldown]);

  // Active slice in Donut Chart
  const activeCategory = activeCategoryIndex !== null ? categoryData[activeCategoryIndex] : null;

  // 6-Month Summary Aggregates
  const sixMonthSummary = useMemo(() => {
    const totalExp = sixMonthTrends.reduce((sum, item) => sum + item.expenses, 0);
    const totalInc = sixMonthTrends.reduce((sum, item) => sum + item.income, 0);
    const avgExp = Math.round(totalExp / (sixMonthTrends.length || 1));
    const totalSav = totalInc - totalExp;
    return { totalExp, avgExp, totalSav };
  }, [sixMonthTrends]);

  const isCurrentMonthOrFuture = currentDate >= new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return (
    <div className="space-y-6 pb-28">
      {/* Header & Mode Switcher */}
      <header className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground text-sm">Financial health & intelligence</p>
          </div>

          {/* Monthly / Trends Toggle */}
          <div className="flex bg-secondary/60 p-1 rounded-xl border border-border/50 text-xs font-medium">
            <button
              onClick={() => {
                vibrate(10);
                setViewMode('monthly');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'monthly'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              Monthly
            </button>
            <button
              onClick={() => {
                vibrate(10);
                setViewMode('trends');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'trends'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              6M Trends
            </button>
          </div>
        </div>

        {/* Month Navigator */}
        {viewMode === 'monthly' && (
          <div className="flex items-center justify-between bg-secondary/30 p-1.5 rounded-xl border border-border/40">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg" 
              onClick={() => {
                vibrate(10);
                setCurrentDate(subMonths(currentDate, 1));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">
                {format(currentDate, 'MMMM yyyy')}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg" 
              onClick={() => {
                vibrate(10);
                setCurrentDate(addMonths(currentDate, 1));
              }}
              disabled={isCurrentMonthOrFuture}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>

      {/* 4 Financial KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Spent */}
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Total Spent</span>
              <Flame className="w-3.5 h-3.5 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xl font-bold tracking-tight">
              {formatCurrency(kpis.totalExpenses, settings.currency)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs">
              {kpis.percentChangeFromLastMonth !== 0 ? (
                <>
                  {kpis.percentChangeFromLastMonth > 0 ? (
                    <span className="text-destructive font-semibold flex items-center">
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
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Net Savings</span>
              <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className={`text-xl font-bold tracking-tight ${kpis.netSavings < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(kpis.netSavings, settings.currency)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <span className={`font-semibold ${kpis.savingsRate < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                {kpis.savingsRate}%
              </span>
              <span className="text-muted-foreground/80 text-[11px]">savings rate</span>
            </div>
          </CardContent>
        </Card>

        {/* Daily Burn Rate */}
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Daily Average</CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xl font-bold tracking-tight">
              {formatCurrency(kpis.dailyAverage, settings.currency)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Spent per day
            </p>
          </CardContent>
        </Card>

        {/* Month-End Projection */}
        <Card className="border-border/60 bg-card/60 shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Month-End Forecast</CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="text-xl font-bold tracking-tight text-primary">
              {formatCurrency(kpis.projectedMonthEnd, settings.currency)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Projected monthly total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      {viewMode === 'monthly' ? (
        categoryData.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <p className="text-muted-foreground text-sm">No expenses logged for {monthDisplayLabel}.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Log expenses using the + button to view detailed analytics.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Category Donut Breakdown Chart */}
            <Card className="border-border/60 shadow-xs overflow-hidden">
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
                          setSelectedCategoryForDrilldown(categoryData[index].name);
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
                        formatter={(value: any) => [formatCurrency(Number(value), settings.currency), 'Spent']}
                        contentStyle={{ 
                          borderRadius: '8px', 
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
                      {formatCurrency(activeCategory ? activeCategory.value : kpis.totalExpenses, settings.currency)}
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

            {/* Daily Spending Bar Chart */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Daily Spending Pattern</CardTitle>
                  <p className="text-xs text-muted-foreground">Expenses tracked across the days of the month</p>
                </div>
                {kpis.peakExpenseDay && (
                  <div className="text-right">
                    <span className="text-[10px] font-medium bg-secondary px-2 py-1 rounded-md text-muted-foreground">
                      Peak: Day {kpis.peakExpenseDay.day} ({formatCurrency(kpis.peakExpenseDay.amount, settings.currency)})
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
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
                        formatter={(value: any) => [formatCurrency(Number(value), settings.currency), 'Spent']}
                        labelFormatter={(label) => `Day ${label}, ${format(currentDate, 'MMM yyyy')}`}
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 8px 16px -2px rgb(0 0 0 / 0.15)',
                          backgroundColor: 'hsl(var(--card))',
                          color: 'hsl(var(--foreground))'
                        }}
                        cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }}
                      />
                      <Bar 
                        dataKey="amount" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown & Budget Pacing List */}
            <Card className="border-border/60 shadow-xs">
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
                        setSelectedCategoryForDrilldown(cat.name);
                      }}
                      className="group p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/40 transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-background border shadow-xs shrink-0"
                            style={{ borderLeft: `3px solid ${color}` }}
                          >
                            {settings.categoryEmojis?.[cat.name] || cat.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm text-foreground truncate">{cat.name}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {isBudgeted && (
                              <p className="text-[11px] text-muted-foreground">
                                Limit: {formatCurrency(cat.budgetLimit!, settings.currency)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm font-semibold">{formatCurrency(cat.value, settings.currency)}</span>
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

            {/* Smart Financial Insights */}
            {smartInsights.length > 0 && (
              <Card className="border-border/60 shadow-xs bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Smart Financial Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-1">
                  {smartInsights.map(insight => (
                    <div 
                      key={insight.id} 
                      className={`p-3 rounded-xl border flex items-start gap-3 ${
                        insight.type === 'warning' 
                          ? 'bg-destructive/10 border-destructive/20 text-foreground'
                          : insight.type === 'positive'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-foreground'
                            : 'bg-background/80 border-border/60 text-foreground'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{insight.icon}</span>
                      <div>
                        <p className="text-xs font-bold">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Smart Tags Section */}
            {tagData.length > 0 && (
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Hashtag Breakdown</CardTitle>
                  <p className="text-xs text-muted-foreground">Spending organized by custom tags</p>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-1">
                  {tagData.slice(0, 6).map(([tag, amount]) => (
                    <div key={tag} className="flex justify-between items-center p-2 rounded-lg bg-secondary/30">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                        {tag}
                      </span>
                      <span className="text-xs font-semibold">
                        {formatCurrency(amount, settings.currency)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )
      ) : (
        /* 6-Month Macro Trend View */
        <div className="space-y-6">
          {/* 6-Month Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3.5 border-border/60 bg-card/60 text-center">
              <span className="text-[11px] font-medium text-muted-foreground block">6M Total Spend</span>
              <span className="text-base font-bold text-foreground mt-1 block">
                {formatCurrency(sixMonthSummary.totalExp, settings.currency)}
              </span>
            </Card>
            <Card className="p-3.5 border-border/60 bg-card/60 text-center">
              <span className="text-[11px] font-medium text-muted-foreground block">Monthly Avg</span>
              <span className="text-base font-bold text-primary mt-1 block">
                {formatCurrency(sixMonthSummary.avgExp, settings.currency)}
              </span>
            </Card>
            <Card className="p-3.5 border-border/60 bg-card/60 text-center">
              <span className="text-[11px] font-medium text-muted-foreground block">6M Net Savings</span>
              <span className={`text-base font-bold mt-1 block ${sixMonthSummary.totalSav < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                {formatCurrency(sixMonthSummary.totalSav, settings.currency)}
              </span>
            </Card>
          </div>

          {/* 6-Month Income vs Expense Bar Chart */}
          <Card className="border-border/60 shadow-xs">
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
                        formatCurrency(Number(value), settings.currency), 
                        name === 'income' ? 'Income' : 'Expenses'
                      ]}
                      labelFormatter={(label) => `${label}`}
                      contentStyle={{ 
                        borderRadius: '8px', 
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
      )}

      {/* Category Detail Modal */}
      {selectedCategoryForDrilldown && (
        <CategoryDetailModal
          isOpen={Boolean(selectedCategoryForDrilldown)}
          onClose={() => setSelectedCategoryForDrilldown(null)}
          category={selectedCategoryForDrilldown}
          emoji={settings.categoryEmojis?.[selectedCategoryForDrilldown]}
          monthLabel={monthDisplayLabel}
          currency={settings.currency}
          expenses={drilldownExpenses}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  ChevronDown,
  ChevronUp,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { useExpenseStore, type Expense } from '../store/useExpenseStore';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { MonthCalendarGrid } from '../components/analytics/MonthCalendarGrid';
import { DateTransactionsInspector } from '../components/analytics/DateTransactionsInspector';
import { CategoryDetailModal } from '../components/CategoryDetailModal';
import { AnalyticsKpiCards } from '../components/analytics/AnalyticsKpiCards';
import { CategoryDonutCard } from '../components/analytics/CategoryDonutCard';
import { DailySpendingBarCard } from '../components/analytics/DailySpendingBarCard';
import { CategoryPacingList } from '../components/analytics/CategoryPacingList';
import { SmartInsightsCard } from '../components/analytics/SmartInsightsCard';
import { SmartTagsCard } from '../components/analytics/SmartTagsCard';
import { SixMonthTrendsView } from '../components/analytics/SixMonthTrendsView';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import { formatCurrency } from '../lib/formatCurrency';
import { vibrate } from '../lib/utils';
import { playSuccessSound } from '../lib/sound';
import { toast } from 'sonner';

export default function Analytics() {
  const { expenses, settings, budgets, addExpense, deleteExpense } = useExpenseStore();
  
  const [viewMode, setViewMode] = useState<'monthly' | 'trends'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCategoryForDrilldown, setSelectedCategoryForDrilldown] = useState<string | null>(null);

  const {
    monthDisplayLabel,
    kpis,
    categoryData,
    dailyData,
    sixMonthTrends,
    smartInsights,
    tagData,
    drilldownExpenses,
    previousMonthCategorySpend,
    selectedCategoryBudget,
    sixMonthSummary
  } = useAnalyticsData(expenses, settings, budgets, currentDate, selectedCategoryForDrilldown);

  const handleDrilldownLogAgain = async (expense: Expense) => {
    vibrate(20);
    if (settings.soundEnabled) playSuccessSound();
    const newId = await addExpense({
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      date: new Date().toISOString(),
      notes: expense.notes
    });
    toast.success(`Logged ${expense.description} (${formatCurrency(expense.amount, settings.currency)}) for today`, {
      action: {
        label: "Undo",
        onClick: () => {
          vibrate(15);
          deleteExpense(newId);
          toast.info(`Undone: ${expense.description} removed`);
        }
      }
    });
  };

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
          <SegmentedControl
            options={[
              { label: "Monthly", value: "monthly", icon: <PieIcon className="w-3.5 h-3.5" /> },
              { label: "6M Trends", value: "trends", icon: <BarChart3 className="w-3.5 h-3.5" /> }
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as 'monthly' | 'trends')}
            className="text-xs"
          />
        </div>

        {/* Month Navigator with Interactive Calendar Toggle */}
        {viewMode === 'monthly' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-card/80 dark:bg-card/60 backdrop-blur-xl p-1.5 rounded-2xl border border-border/50 shadow-xs">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-xl hover:bg-secondary/80 active:scale-95 transition-all" 
                onClick={() => {
                  vibrate(10);
                  const newMonth = subMonths(currentDate, 1);
                  setCurrentDate(newMonth);
                  setSelectedDate(null);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <button
                type="button"
                onClick={() => {
                  vibrate(10);
                  setIsCalendarOpen(prev => !prev);
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl hover:bg-secondary/70 active:scale-95 transition-all cursor-pointer group"
                title="Tap to view interactive calendar inspector"
              >
                <div className="p-1 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold tracking-tight">
                  {format(currentDate, 'MMMM yyyy')}
                </span>
                {isCalendarOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </button>

              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-xl hover:bg-secondary/80 active:scale-95 transition-all" 
                onClick={() => {
                  vibrate(10);
                  const newMonth = addMonths(currentDate, 1);
                  setCurrentDate(newMonth);
                  setSelectedDate(null);
                }}
                disabled={isCurrentMonthOrFuture}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Interactive Calendar Grid */}
            {isCalendarOpen && (
              <div className="animate-in fade-in-50 zoom-in-95 duration-200">
                <MonthCalendarGrid
                  currentMonthDate={currentDate}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    vibrate(12);
                    setSelectedDate(date);
                  }}
                  expenses={expenses}
                />
              </div>
            )}

            {/* Date Transactions Inspector Drawer */}
            {selectedDate && (
              <div className="animate-in fade-in-50 slide-in-from-top-3 duration-200">
                <DateTransactionsInspector
                  selectedDate={selectedDate}
                  onClose={() => setSelectedDate(null)}
                  expenses={expenses}
                  currency={settings.currency}
                  onLogAgain={handleDrilldownLogAgain}
                />
              </div>
            )}
          </div>
        )}
      </header>

      {/* 4 Financial KPI Stat Cards */}
      <AnalyticsKpiCards kpis={kpis} currency={settings.currency} />

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
            <CategoryDonutCard
              categoryData={categoryData}
              currency={settings.currency}
              totalExpenses={kpis.totalExpenses}
              onSelectCategory={(catName) => setSelectedCategoryForDrilldown(catName)}
            />

            {/* Daily Spending Bar Chart with Interactive Date Selector */}
            <DailySpendingBarCard
              dailyData={dailyData}
              kpis={kpis}
              currentDate={currentDate}
              selectedDate={selectedDate}
              currency={settings.currency}
              onSelectDate={(date) => setSelectedDate(date)}
            />

            {/* Category Breakdown & Budget Pacing List */}
            <CategoryPacingList
              categoryData={categoryData}
              currency={settings.currency}
              categoryEmojis={settings.categoryEmojis}
              onSelectCategory={(catName) => setSelectedCategoryForDrilldown(catName)}
            />

            {/* Smart Financial Insights */}
            <SmartInsightsCard smartInsights={smartInsights} />

            {/* Smart Tags Section */}
            <SmartTagsCard tagData={tagData} currency={settings.currency} />
          </div>
        )
      ) : (
        /* 6-Month Macro Trend View */
        <SixMonthTrendsView
          sixMonthTrends={sixMonthTrends}
          sixMonthSummary={sixMonthSummary}
          currency={settings.currency}
        />
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
          previousMonthSpend={previousMonthCategorySpend}
          totalMonthExpenses={kpis.totalExpenses}
          categoryBudget={selectedCategoryBudget}
          onLogAgain={handleDrilldownLogAgain}
        />
      )}
    </div>
  );
}

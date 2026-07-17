import { useExpenseStore } from "../store/useExpenseStore";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis } from "recharts";
import { useState } from "react";
import { format, parseISO, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { formatCurrency } from "../lib/formatCurrency";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#64748b'];

export default function Analytics() {
  const { expenses, settings } = useExpenseStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const selectedMonthStr = currentDate.toISOString().slice(0, 7);
  
  const currentMonthExpenses = expenses.filter(e => e.date.startsWith(selectedMonthStr));
  const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const categoryData = currentMonthExpenses.reduce((acc, expense) => {
    // Only include positive expenses (ignore carry forward adjustments)
    if (expense.amount > 0) {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  // Month over Month Comparison
  const lastMonthDate = subMonths(currentDate, 1);
  const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);
  
  const lastMonthExpenses = expenses.filter(e => e.date.startsWith(lastMonthStr) && e.amount > 0);
  const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const percentChange = totalLastMonth === 0 ? 0 : Math.round(((totalExpenses - totalLastMonth) / totalLastMonth) * 100);

  // Weekly Trend
  const weeklyData = [
    { name: 'Week 1', value: 0 },
    { name: 'Week 2', value: 0 },
    { name: 'Week 3', value: 0 },
    { name: 'Week 4', value: 0 },
  ];

  currentMonthExpenses.forEach(expense => {
    if (expense.amount > 0) {
      const date = parseISO(expense.date);
      const day = date.getDate();
      if (day <= 7) weeklyData[0].value += expense.amount;
      else if (day <= 14) weeklyData[1].value += expense.amount;
      else if (day <= 21) weeklyData[2].value += expense.amount;
      else weeklyData[3].value += expense.amount;
    }
  });

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">Where your money goes</p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-24 text-center">
            {format(currentDate, 'MMM yyyy')}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            disabled={currentDate >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses, settings.currency, settings.privacyMode)}</div>
            <p className={`text-xs mt-1 ${percentChange > 0 ? 'text-destructive' : percentChange < 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {percentChange > 0 ? '+' : ''}{percentChange}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLastMonth, settings.currency, settings.privacyMode)}</div>
          </CardContent>
        </Card>
      </div>

      {pieData.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No data for this month.</p>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(Number(value), settings.currency, settings.privacyMode), 'Spent']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(Number(value), settings.currency, settings.privacyMode), 'Spent']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: 'hsl(var(--foreground))', backgroundColor: 'hsl(var(--card))' }}
                      cursor={{ fill: 'hsl(var(--secondary))' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Spending Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatCurrency(item.value, settings.currency, settings.privacyMode)}</span>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {Math.round((item.value / total) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

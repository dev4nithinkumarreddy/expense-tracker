import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sliders, Check, RotateCcw, LayoutDashboard, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { vibrate, cn } from "../../lib/utils";
import { useExpenseStore, type DashboardWidgetsConfig } from "../../store/useExpenseStore";
import { defaultDashboardWidgets } from "../../store/slices/settingsSlice";
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import TrackChangesOutlined from '@mui/icons-material/TrackChangesOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import BoltOutlined from '@mui/icons-material/BoltOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';

interface CustomizeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WidgetItem {
  id: keyof DashboardWidgetsConfig;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const WIDGET_ITEMS: WidgetItem[] = [
  {
    id: "safeToSpend",
    label: "Daily Runway & Safe-to-Spend",
    description: "Daily spend allowance and days left in cycle",
    icon: <SpeedOutlined className="w-4 h-4" fontSize="inherit" />
  },
  {
    id: "budgetRing",
    label: "Monthly Budget Ring",
    description: "Visual meter of budget vs actual spent",
    icon: <TrackChangesOutlined className="w-4 h-4" fontSize="inherit" />
  },
  {
    id: "accountsBar",
    label: "Multi-Account Bar",
    description: "Liquid cash balances across Bank, Cash & Wallets",
    icon: <AccountBalanceWalletOutlined className="w-4 h-4" fontSize="inherit" />
  },
  {
    id: "quickAdds",
    label: "Quick Log Buttons",
    description: "Presets for frequent daily expenses",
    icon: <BoltOutlined className="w-4 h-4" fontSize="inherit" />
  },
  {
    id: "categoryBudgets",
    label: "Category Budgets",
    description: "Per-category spending progress and limits",
    icon: <BarChartOutlined className="w-4 h-4" fontSize="inherit" />
  },
  {
    id: "weeklyTrend",
    label: "7-Day Spending Trend",
    description: "Daily spending trajectory over past week",
    icon: <TrendingUpOutlined className="w-4 h-4" fontSize="inherit" />
  },
  {
    id: "upcomingBills",
    label: "Upcoming Bills & Dues",
    description: "Actionable alert cards for scheduled dues",
    icon: <CalendarTodayOutlined className="w-4 h-4" fontSize="inherit" />
  },
  {
    id: "recentActivity",
    label: "Recent Transactions",
    description: "Latest logged expenses with quick actions",
    icon: <ReceiptLongOutlined className="w-4 h-4" fontSize="inherit" />
  }
];

export function CustomizeDashboardModal({ isOpen, onClose }: CustomizeDashboardModalProps) {
  const settings = useExpenseStore((state) => state.settings);
  const updateSettings = useExpenseStore((state) => state.updateSettings);

  const currentMode = settings.dashboardMode || 'detailed';
  const currentWidgets: DashboardWidgetsConfig = {
    ...defaultDashboardWidgets,
    ...(settings.dashboardWidgets || {})
  };

  const handleToggleWidget = (id: keyof DashboardWidgetsConfig) => {
    vibrate(10);
    const updated = {
      ...currentWidgets,
      [id]: !currentWidgets[id]
    };
    updateSettings({ dashboardWidgets: updated });
  };

  const handleSetMode = (mode: 'focus' | 'detailed') => {
    vibrate(15);
    updateSettings({ dashboardMode: mode });
  };

  const handleResetToDefault = () => {
    vibrate(20);
    updateSettings({
      dashboardMode: 'detailed',
      dashboardWidgets: defaultDashboardWidgets
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-lg p-5 sm:p-6 z-10 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Customize Dashboard</h3>
                  <p className="text-xs text-muted-foreground">Select widgets and default layout mode</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 -mr-1">
              {/* Presets Mode Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  View Mode
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSetMode('focus')}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-xl border transition-all text-left",
                      currentMode === 'focus'
                        ? "bg-primary/10 border-primary text-foreground"
                        : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                        <BoltOutlined className="w-4 h-4 text-amber-500" fontSize="inherit" />
                        Focus
                      </div>
                      {currentMode === 'focus' && (
                        <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      Simplified: runway, quick log, and transactions.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetMode('detailed')}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-xl border transition-all text-left",
                      currentMode === 'detailed'
                        ? "bg-primary/10 border-primary text-foreground"
                        : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                        <LayoutDashboard className="w-4 h-4 text-primary" />
                        Detailed
                      </div>
                      {currentMode === 'detailed' && (
                        <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      Complete overview: accounts, budgets, and bills.
                    </span>
                  </button>
                </div>
              </div>

              {/* Individual Widgets Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Modules
                  </label>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="space-y-2">
                  {WIDGET_ITEMS.map((w) => {
                    const isVisible = currentWidgets[w.id];
                    return (
                      <div
                        key={w.id}
                        onClick={() => handleToggleWidget(w.id)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none",
                          isVisible
                            ? "bg-card border-border hover:border-primary/40 shadow-xs"
                            : "bg-muted/20 border-border/40 opacity-60 hover:opacity-80"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0 border border-border">
                            {w.icon}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{w.label}</div>
                            <div className="text-[11px] text-muted-foreground leading-tight">{w.description}</div>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div
                            className={cn(
                              "w-10 h-6 rounded-full transition-colors flex items-center p-1",
                              isVisible ? "bg-primary justify-end" : "bg-muted justify-start"
                            )}
                          >
                            <motion.div
                              layout
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="w-4 h-4 rounded-full bg-white shadow-xs flex items-center justify-center"
                            >
                              {isVisible ? (
                                <Eye className="w-2.5 h-2.5 text-primary" />
                              ) : (
                                <EyeOff className="w-2.5 h-2.5 text-muted-foreground" />
                              )}
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-border flex justify-end shrink-0">
              <Button onClick={onClose} className="px-5 rounded-xl text-xs font-semibold">
                Done
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

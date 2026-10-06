import { motion, AnimatePresence } from "framer-motion";
import { X, Sliders, Check, RotateCcw, Zap, LayoutDashboard, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { vibrate, cn } from "../../lib/utils";
import { useExpenseStore, type DashboardWidgetsConfig } from "../../store/useExpenseStore";
import { defaultDashboardWidgets } from "../../store/slices/settingsSlice";

interface CustomizeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WidgetItem {
  id: keyof DashboardWidgetsConfig;
  label: string;
  description: string;
  icon: string;
}

const WIDGET_ITEMS: WidgetItem[] = [
  {
    id: "safeToSpend",
    label: "Safe-to-Spend & Runway",
    description: "Daily spend allowance and days left in month",
    icon: "🛡️"
  },
  {
    id: "budgetRing",
    label: "Monthly Budget Ring",
    description: "Visual ring of monthly budget vs actual spent",
    icon: "🎯"
  },
  {
    id: "accountsBar",
    label: "Multi-Account Bar",
    description: "Liquid cash balances across Bank, Cash & Wallets",
    icon: "💳"
  },
  {
    id: "quickAdds",
    label: "1-Tap Quick Adds",
    description: "Fast preset buttons for frequent daily expenses",
    icon: "⚡"
  },
  {
    id: "categoryBudgets",
    label: "Category Budgets",
    description: "Per-category spending progress bars and limits",
    icon: "📊"
  },
  {
    id: "weeklyTrend",
    label: "7-Day Spending Sparkline",
    description: "Micro-chart of your daily spending trajectory",
    icon: "📈"
  },
  {
    id: "upcomingBills",
    label: "Upcoming Bills & Dues",
    description: "Actionable alert cards for scheduled dues",
    icon: "📅"
  },
  {
    id: "recentActivity",
    label: "Recent Transactions",
    description: "Latest logged expenses with quick actions",
    icon: "🧾"
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

  const handleToggleWidget = (widgetId: keyof DashboardWidgetsConfig) => {
    vibrate(15);
    const updated = {
      ...currentWidgets,
      [widgetId]: !currentWidgets[widgetId]
    };
    updateSettings({ dashboardWidgets: updated });
  };

  const handleSetMode = (mode: 'focus' | 'detailed') => {
    vibrate(20);
    updateSettings({ dashboardMode: mode });
  };

  const handleReset = () => {
    vibrate(25);
    updateSettings({
      dashboardMode: 'detailed',
      dashboardWidgets: { ...defaultDashboardWidgets }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Card / Bottom Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg bg-card/95 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 z-10 max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Customize Dashboard</h3>
                  <p className="text-xs text-muted-foreground">Personalize your home screen layout</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
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
                      "flex flex-col items-start p-3 rounded-2xl border transition-all text-left",
                      currentMode === 'focus'
                        ? "bg-primary/15 border-primary text-foreground shadow-sm shadow-primary/10"
                        : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Focus
                      </div>
                      {currentMode === 'focus' && (
                        <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      Clean & decluttered: safe runway, quick log & transactions.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetMode('detailed')}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-2xl border transition-all text-left",
                      currentMode === 'detailed'
                        ? "bg-primary/15 border-primary text-foreground shadow-sm shadow-primary/10"
                        : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
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
                      Full breakdown: multi-account, trends, and category budgets.
                    </span>
                  </button>
                </div>
              </div>

              {/* Individual Widget Toggles */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Visible Widgets ({Object.values(currentWidgets).filter(Boolean).length}/{WIDGET_ITEMS.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
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
                            ? "bg-card border-border/80 hover:border-primary/40 shadow-xs"
                            : "bg-muted/20 border-border/30 opacity-60 hover:opacity-80"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{w.icon}</span>
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
                              className="w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center"
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
            <div className="pt-3 border-t border-border/50">
              <Button
                onClick={onClose}
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-2.5"
              >
                Done
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

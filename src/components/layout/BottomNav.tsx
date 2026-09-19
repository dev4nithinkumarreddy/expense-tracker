import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, ReceiptText, CalendarDays, PieChart, Plus } from "lucide-react";
import { cn, vibrate } from "../../lib/utils";
import { useExpenseStore } from "../../store/useExpenseStore";

const leftNavItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: ReceiptText, label: "Expenses", path: "/expenses" },
];

const rightNavItems = [
  { icon: CalendarDays, label: "Planned", path: "/planned" },
  { icon: PieChart, label: "Analytics", path: "/analytics" },
];

export function BottomNav() {
  const { setModalOpen } = useExpenseStore();

  return (
    <nav className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-sm sm:max-w-md">
      <div className="bg-card/85 dark:bg-card/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)] rounded-full p-1.5 px-2 flex items-center justify-between select-none">
        
        {/* Left tabs */}
        <div className="flex items-center gap-1 flex-1 justify-around">
          {leftNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => vibrate(12)}
              aria-label={`Navigate to ${item.label}`}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center py-1.5 px-2 rounded-full text-muted-foreground transition-colors duration-200 flex-1 h-12 select-none",
                  isActive ? "text-primary font-semibold" : "hover:text-foreground active:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="dock-active-pill"
                      transition={{ 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 30, 
                        mass: 0.8 
                      }}
                      className="absolute inset-y-0.5 inset-x-1 bg-gradient-to-b from-primary/18 to-primary/8 dark:from-primary/25 dark:to-primary/12 rounded-full border border-primary/25 shadow-[0_2px_8px_rgba(0,122,255,0.12)]"
                    />
                  )}
                  <motion.div
                    whileTap={{ scale: 0.86 }}
                    transition={{ type: "spring", stiffness: 600, damping: 28 }}
                    className="flex flex-col items-center relative z-10"
                  >
                    <motion.div
                      animate={{ 
                        scale: isActive ? 1.10 : 1,
                        y: isActive ? -0.5 : 0
                      }}
                      transition={{ type: "spring", stiffness: 450, damping: 24 }}
                    >
                      <item.icon className={cn("h-5 w-5 transition-colors duration-150", isActive ? "stroke-[2.4px]" : "stroke-[1.8px]")} />
                    </motion.div>
                    <span className={cn(
                      "text-[10px] tracking-tight mt-0.5 font-medium transition-all duration-150",
                      isActive && "font-semibold text-primary"
                    )}>
                      {item.label}
                    </span>
                  </motion.div>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Center Quick Add Button */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.90 }}
          transition={{ type: "spring", stiffness: 480, damping: 22 }}
          onClick={() => {
            vibrate(20);
            setModalOpen(true);
          }}
          aria-label="Add new expense"
          className="mx-1.5 w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-cyan-500 text-primary-foreground shadow-md shadow-primary/30 flex items-center justify-center shrink-0 border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="w-5 h-5 stroke-[2.4px]" aria-hidden="true" />
        </motion.button>

        {/* Right tabs */}
        <div className="flex items-center gap-1 flex-1 justify-around">
          {rightNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => vibrate(12)}
              aria-label={`Navigate to ${item.label}`}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center py-1.5 px-2 rounded-full text-muted-foreground transition-colors duration-200 flex-1 h-12 select-none",
                  isActive ? "text-primary font-semibold" : "hover:text-foreground active:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="dock-active-pill"
                      transition={{ 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 30, 
                        mass: 0.8 
                      }}
                      className="absolute inset-y-0.5 inset-x-1 bg-gradient-to-b from-primary/18 to-primary/8 dark:from-primary/25 dark:to-primary/12 rounded-full border border-primary/25 shadow-[0_2px_8px_rgba(0,122,255,0.12)]"
                    />
                  )}
                  <motion.div
                    whileTap={{ scale: 0.86 }}
                    transition={{ type: "spring", stiffness: 600, damping: 28 }}
                    className="flex flex-col items-center relative z-10"
                  >
                    <motion.div
                      animate={{ 
                        scale: isActive ? 1.10 : 1,
                        y: isActive ? -0.5 : 0
                      }}
                      transition={{ type: "spring", stiffness: 450, damping: 24 }}
                    >
                      <item.icon className={cn("h-5 w-5 transition-colors duration-150", isActive ? "stroke-[2.4px]" : "stroke-[1.8px]")} />
                    </motion.div>
                    <span className={cn(
                      "text-[10px] tracking-tight mt-0.5 font-medium transition-all duration-150",
                      isActive && "font-semibold text-primary"
                    )}>
                      {item.label}
                    </span>
                  </motion.div>
                </>
              )}
            </NavLink>
          ))}
        </div>

      </div>
    </nav>
  );
}

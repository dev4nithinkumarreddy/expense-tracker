import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, ReceiptText, CalendarDays, PieChart, Plus } from "lucide-react";
import { cn, vibrate } from "../../lib/utils";
import { playTapSound } from "../../lib/sound";
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
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,1rem))] sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-sm sm:max-w-md lg:max-w-xl">
      <div className="bg-card border border-border shadow-lg rounded-full p-1.5 px-2 lg:px-3 flex items-center justify-between select-none">
        
        {/* Left tabs */}
        <div className="flex items-center gap-1 flex-1 justify-around">
          {leftNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                vibrate(12);
                playTapSound();
              }}
              aria-label={`Navigate to ${item.label}`}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col lg:flex-row items-center justify-center py-1.5 px-2 lg:px-4 rounded-full text-muted-foreground transition-colors duration-200 flex-1 h-12 lg:h-11 select-none",
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
                      className="absolute inset-y-0.5 inset-x-1 bg-secondary rounded-full border border-border shadow-2xs"
                    />
                  )}
                  <motion.div
                    whileTap={{ scale: 0.86 }}
                    transition={{ type: "spring", stiffness: 600, damping: 28 }}
                    className="flex flex-col lg:flex-row lg:gap-2 items-center relative z-10"
                  >
                    <motion.div
                      animate={{ 
                        scale: isActive ? 1.10 : 1,
                        y: isActive ? -0.5 : 0
                      }}
                      transition={{ type: "spring", stiffness: 450, damping: 24 }}
                    >
                      <item.icon className={cn("h-5 w-5 lg:h-4 lg:w-4 transition-colors duration-150", isActive ? "stroke-[2.4px]" : "stroke-[1.8px]")} />
                    </motion.div>
                    <span className={cn(
                      "text-[10px] lg:text-xs tracking-tight mt-0.5 lg:mt-0 font-medium transition-all duration-150",
                      isActive && "font-bold text-primary"
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
            playTapSound();
            setModalOpen(true);
          }}
          aria-label="Add new expense"
          className="mx-1.5 lg:mx-2.5 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-xs flex items-center justify-center shrink-0 border border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 stroke-[2.4px]" aria-hidden="true" />
        </motion.button>

        {/* Right tabs */}
        <div className="flex items-center gap-1 flex-1 justify-around">
          {rightNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                vibrate(12);
                playTapSound();
              }}
              aria-label={`Navigate to ${item.label}`}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col lg:flex-row items-center justify-center py-1.5 px-2 lg:px-4 rounded-full text-muted-foreground transition-colors duration-200 flex-1 h-12 lg:h-11 select-none",
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
                      className="absolute inset-y-0.5 inset-x-1 bg-secondary rounded-full border border-border shadow-2xs"
                    />
                  )}
                  <motion.div
                    whileTap={{ scale: 0.86 }}
                    transition={{ type: "spring", stiffness: 600, damping: 28 }}
                    className="flex flex-col lg:flex-row lg:gap-2 items-center relative z-10"
                  >
                    <motion.div
                      animate={{ 
                        scale: isActive ? 1.10 : 1,
                        y: isActive ? -0.5 : 0
                      }}
                      transition={{ type: "spring", stiffness: 450, damping: 24 }}
                    >
                      <item.icon className={cn("h-5 w-5 lg:h-4 lg:w-4 transition-colors duration-150", isActive ? "stroke-[2.4px]" : "stroke-[1.8px]")} />
                    </motion.div>
                    <span className={cn(
                      "text-[10px] lg:text-xs tracking-tight mt-0.5 lg:mt-0 font-medium transition-all duration-150",
                      isActive && "font-bold text-primary"
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

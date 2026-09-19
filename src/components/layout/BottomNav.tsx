import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, ReceiptText, CalendarDays, PieChart, Settings } from "lucide-react";
import { cn, vibrate } from "../../lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: ReceiptText, label: "Expenses", path: "/expenses" },
  { icon: CalendarDays, label: "Planned", path: "/planned" },
  { icon: PieChart, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 w-full max-w-md md:max-w-xl lg:max-w-2xl left-1/2 -translate-x-1/2 glass-toolbar border-t flex justify-around pt-2 px-2 z-50 pb-[env(safe-area-inset-bottom,16px)] shadow-lg">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => vibrate(15)}
          aria-label={`Navigate to ${item.label}`}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center p-2 text-muted-foreground transition-colors select-none",
              isActive && "text-primary"
            )
          }
        >
          {({ isActive }) => (
            <motion.div
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 450, damping: 20 }}
              className="flex flex-col items-center"
            >
              <item.icon className={cn("h-5 w-5 mb-1 transition-all", isActive ? "stroke-[2.2px] text-primary" : "stroke-[1.8px]")} />
              <span className={cn("text-[10px] tracking-tight font-medium", isActive && "font-semibold text-primary")}>
                {item.label}
              </span>
            </motion.div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

import { NavLink } from "react-router-dom";
import { LayoutDashboard, ReceiptText, CalendarDays, PieChart, Settings } from "lucide-react";
import { cn, vibrate } from "../../lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: ReceiptText, label: "Expenses", path: "/expenses" },
  { icon: CalendarDays, label: "Bills", path: "/bills" },
  { icon: PieChart, label: "Analytics", path: "/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 bg-card/60 backdrop-blur-lg border-t border-white/10 flex justify-around pt-2 px-2 z-50 pb-[env(safe-area-inset-bottom,16px)]">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => vibrate(30)}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center p-2 text-muted-foreground transition-colors",
              isActive && "text-primary"
            )
          }
        >
          <item.icon className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

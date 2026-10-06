import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, ShieldCheck, ArrowRight, X } from "lucide-react";
import { Button } from "../ui/button";
import { useExpenseStore } from "../../store/useExpenseStore";
import { vibrate } from "../../lib/utils";

interface CloudBackupNudgeProps {
  onSignInClick: () => void;
}

export function CloudBackupNudge({ onSignInClick }: CloudBackupNudgeProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const session = useExpenseStore((state) => state.session);
  const isGuestMode = useExpenseStore((state) => state.settings.isGuestMode);
  const expenseCount = useExpenseStore((state) => state.expenses.length);

  // Only show if user is in guest mode (not signed in to cloud) and has logged >= 3 expenses
  if (session || !isGuestMode || expenseCount < 3 || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    vibrate(10);
    setIsDismissed(true);
  };

  const handleAction = () => {
    vibrate(20);
    onSignInClick();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-violet-600/15 border border-blue-500/25 p-4 shadow-sm"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <Cloud className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Local Storage Protected</span>
            </div>
            <h4 className="text-sm font-semibold text-foreground tracking-tight">
              Sync with Cloud to protect {expenseCount} expenses
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Your records are currently saved in this browser. Link a free account to enable cross-device sync & automatic backups.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAction}
                className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-3 shadow-xs flex items-center gap-1.5"
              >
                <span>Sync with Cloud</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 text-xs text-muted-foreground hover:text-foreground px-2.5"
              >
                Maybe Later
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss cloud backup suggestion"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

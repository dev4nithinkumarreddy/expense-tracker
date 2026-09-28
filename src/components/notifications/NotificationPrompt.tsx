import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Sparkles, Loader2, Share } from "lucide-react";
import { Button } from "../ui/button";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { useExpenseStore } from "../../store/useExpenseStore";
import { toast } from "sonner";
import { vibrate } from "../../lib/utils";
import { playTapSound, playSuccessSound } from "../../lib/sound";

const COOLDOWN_KEY = "expense_tracker_notification_prompt_cooldown";
const COOLDOWN_DAYS = 3;

export function NotificationPrompt() {
  const { session, isModalOpen, settings } = useExpenseStore();
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const [subscribing, setSubscribing] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start true until checked
  const [isIosNonStandalone, setIsIosNonStandalone] = useState(false);

  useEffect(() => {
    // Check cooldown from localStorage
    const cooldownUntil = localStorage.getItem(COOLDOWN_KEY);
    if (cooldownUntil && Date.now() < Number(cooldownUntil)) {
      setDismissed(true);
      return;
    }

    // Detect iOS non-standalone mode
    if (typeof window !== "undefined") {
      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
      if (isIos && !isStandalone) {
        setIsIosNonStandalone(true);
      }
    }

    setDismissed(false);
  }, []);

  // Conditions to show:
  // 1. User has an active login session
  // 2. Modals are not open (e.g. AddExpenseModal)
  // 3. Not dismissed / on cooldown
  // 4. Notifications not already subscribed
  // 5. Browser has not permanently denied notifications
  // 6. Push is supported (or on iOS where home-screen PWA is required)
  const shouldShow =
    session &&
    !isModalOpen &&
    !dismissed &&
    !isSubscribed &&
    permission !== "granted" &&
    permission !== "denied" &&
    (isSupported || isIosNonStandalone);

  const handleDismiss = () => {
    vibrate(10);
    if (settings.soundEnabled) playTapSound();
    const cooldownTimestamp = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(COOLDOWN_KEY, cooldownTimestamp.toString());
    setDismissed(true);
  };

  const handleEnable = async () => {
    vibrate(15);
    if (settings.soundEnabled) playTapSound();

    if (isIosNonStandalone) {
      toast.info("On iPhone, tap Share ⎋ → 'Add to Home Screen' to enable push notifications.");
      handleDismiss();
      return;
    }

    setSubscribing(true);
    try {
      const success = await subscribe();
      if (success) {
        if (settings.soundEnabled) playSuccessSound();
        toast.success("Notifications enabled! You'll receive timely bill & streak alerts.");
        setDismissed(true);
      } else {
        if (Notification.permission === "denied") {
          toast.error("Notification permission was denied. You can enable it in browser settings.");
          handleDismiss();
        } else {
          toast.error("Could not enable notifications. Please check browser permissions.");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to enable notifications");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <div 
          className="fixed top-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] left-0 right-0 z-45 flex justify-center px-3.5 sm:px-4 pointer-events-none select-none"
          role="region"
          aria-label="Notification prompt"
        >
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -45, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto w-full max-w-sm sm:max-w-md bg-card/92 dark:bg-card/88 backdrop-blur-2xl border border-border/80 dark:border-white/12 shadow-[0_12px_36px_rgba(0,0,0,0.16)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)] rounded-2xl p-3.5 sm:p-4 text-card-foreground"
          >
            <div className="flex items-start gap-3">
              {/* Bell Icon with Apple-style rounded squircle & glow */}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary/20 to-cyan-500/20 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs relative">
                <Bell className="w-5 h-5 stroke-[2.2]" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background animate-pulse" />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-sm font-bold text-foreground tracking-tight">
                    Stay on Track
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Reminders
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {isIosNonStandalone
                    ? "Add this app to your Home Screen to receive instant bill and budget alerts on iPhone."
                    : "Get instant alerts for upcoming bills, budget warnings, and daily streaks."}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2.5">
                  <Button
                    size="sm"
                    onClick={handleEnable}
                    disabled={subscribing}
                    className="h-8 px-3.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shadow-primary/25 cursor-pointer active:scale-95 transition-all"
                  >
                    {subscribing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Enabling...
                      </>
                    ) : isIosNonStandalone ? (
                      <>
                        <Share className="w-3.5 h-3.5 mr-1.5" />
                        How to Add
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Enable Now
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="text-muted-foreground/80 hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer shrink-0 -mr-1 -mt-1 active:scale-90"
                aria-label="Dismiss notification reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

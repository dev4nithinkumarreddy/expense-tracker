import { motion, useReducedMotion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { useState } from 'react';

interface LoadingScreenProps {
  /**
   * Whether to render as a full-viewport overlay or an inline container for route suspense.
   * @default true
   */
  fullScreen?: boolean;
  /**
   * Primary title or brand label.
   * @default "Expense Tracker"
   */
  message?: string;
  /**
   * Subtle status message underneath.
   * @default "Preparing your workspace..."
   */
  submessage?: string;
  /**
   * Whether to show the subtle progress track under the logo.
   * @default true
   */
  showProgress?: boolean;
}

export function LoadingScreen({
  fullScreen = true,
  message = "Expense Tracker",
  submessage = "Preparing your workspace...",
  showProgress = true,
}: LoadingScreenProps) {
  const prefersReducedMotion = useReducedMotion();
  const [logoLoaded, setLogoLoaded] = useState(true);

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl select-none"
    : "flex flex-col items-center justify-center py-16 px-4 w-full select-none";

  return (
    <div className={containerClasses} role="status" aria-label={message}>
      {/* Ambient background glow orb */}
      <motion.div
        animate={
          prefersReducedMotion
            ? { opacity: 0.4 }
            : {
                scale: [1, 1.12, 1],
                opacity: [0.35, 0.6, 0.35],
              }
        }
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-72 h-72 rounded-full bg-primary/20 blur-[80px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Frosted Glass Emblem Card */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 26,
        }}
        className="relative flex flex-col items-center p-6 rounded-3xl bg-card/65 dark:bg-card/45 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl shadow-primary/10 min-w-[220px]"
      >
        {/* Soft internal gradient shine */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/15 to-transparent pointer-events-none dark:from-white/5" />

        {/* Icon / Brand container */}
        <div className="relative mb-3.5">
          <motion.div
            animate={
              prefersReducedMotion
                ? {}
                : {
                    scale: [1, 1.04, 1],
                  }
            }
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-primary/5 border border-primary/25 shadow-inner flex items-center justify-center p-2.5 relative overflow-hidden"
          >
            {/* Shimmer light pass across the icon */}
            {!prefersReducedMotion && (
              <motion.div
                animate={{
                  x: ['-140%', '240%'],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 0.6,
                }}
                className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 pointer-events-none"
              />
            )}

            {logoLoaded ? (
              <img
                src="/icon.png"
                alt="App Logo"
                className="w-full h-full object-contain rounded-xl drop-shadow-sm"
                onError={() => setLogoLoaded(false)}
              />
            ) : (
              <Wallet className="w-7 h-7 text-primary drop-shadow-sm" />
            )}
          </motion.div>
        </div>

        {/* Brand / Title */}
        <h2 className="text-sm font-semibold tracking-tight text-foreground/90">
          {message}
        </h2>

        {/* Subtitle / Status indicator */}
        {submessage && (
          <motion.p
            animate={
              prefersReducedMotion
                ? { opacity: 0.7 }
                : {
                    opacity: [0.55, 0.9, 0.55],
                  }
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="text-[11px] font-medium tracking-wide text-muted-foreground mt-1"
          >
            {submessage}
          </motion.p>
        )}

        {/* Sleek micro-progress shimmer track */}
        {showProgress && (
          <div className="h-1 w-24 rounded-full bg-muted/60 dark:bg-muted/40 overflow-hidden relative mt-3.5">
            {!prefersReducedMotion ? (
              <motion.div
                animate={{
                  x: ['-100%', '220%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="w-1/2 h-full rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            ) : (
              <div className="w-1/2 h-full rounded-full bg-primary/60 mx-auto" />
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

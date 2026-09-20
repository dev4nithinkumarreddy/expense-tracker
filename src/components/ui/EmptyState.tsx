import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from './button';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  compact = false,
}: EmptyStateProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className={cn(
        'relative flex flex-col items-center justify-center text-center rounded-3xl border border-white/20 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-xl shadow-xs overflow-hidden select-none',
        compact ? 'p-6 py-8' : 'p-8 py-14 my-4',
        className
      )}
    >
      {/* Subtle ambient backlight orb */}
      <div
        className="absolute w-36 h-36 rounded-full bg-primary/10 blur-3xl pointer-events-none -top-6"
        aria-hidden="true"
      />

      {/* Frosted Icon Badge */}
      <div className="relative mb-4">
        <motion.div
          animate={
            prefersReducedMotion
              ? {}
              : {
                  scale: [1, 1.04, 1],
                }
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={cn(
            'rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-inner flex items-center justify-center text-primary',
            compact ? 'w-12 h-12 p-2.5' : 'w-16 h-16 p-3.5'
          )}
        >
          {icon}
        </motion.div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {/* Primary Action Button */}
      {actionLabel && onAction && (
        <div className="mt-5">
          <motion.div whileTap={{ scale: 0.94 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
            <Button
              onClick={onAction}
              size={compact ? 'sm' : 'default'}
              className="rounded-full shadow-md shadow-primary/20 px-5 font-medium"
            >
              {actionLabel}
            </Button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

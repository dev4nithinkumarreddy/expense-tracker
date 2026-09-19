import React from 'react';
import { motion } from 'framer-motion';
import { cn, vibrate } from '../../lib/utils';
import { playTapSound } from '../../lib/sound';

export interface SegmentOption<T extends string> {
  id?: T;
  value?: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  layoutId?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  layoutId = 'segmented-pill'
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex p-1 bg-secondary/60 backdrop-blur-md rounded-2xl border border-border/50 select-none relative",
        className
      )}
    >
      {options.map((option) => {
        const key = (option.id ?? option.value) as T;
        const isActive = value === key;
        const Icon = option.icon;

        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (!isActive) {
                vibrate(10);
                playTapSound();
                onChange(key);
              }
            }}
            className={cn(
              "flex-1 relative flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-colors duration-200 z-10",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32
                }}
                className="absolute inset-0 bg-background rounded-xl shadow-xs border border-border/60 z-[-1]"
              />
            )}
            {Icon && (React.isValidElement(Icon) ? Icon : typeof Icon === 'function' ? <Icon className="w-4 h-4 shrink-0" /> : null)}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

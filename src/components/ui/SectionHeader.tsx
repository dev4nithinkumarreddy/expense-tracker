import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn, vibrate } from '../../lib/utils';

export type SectionTone =
  | 'primary'
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'indigo';

const TONE_STYLES: Record<SectionTone, { badge: string; pill: string }> = {
  primary: {
    badge: 'bg-primary/12 text-primary border-primary/25 shadow-[0_2px_8px_rgba(59,130,246,0.12)]',
    pill: 'bg-primary/10 text-primary border-primary/20',
  },
  blue: {
    badge: 'bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/25 shadow-[0_2px_8px_rgba(59,130,246,0.12)]',
    pill: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  },
  emerald: {
    badge: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-[0_2px_8px_rgba(16,185,129,0.12)]',
    pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  },
  violet: {
    badge: 'bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-500/25 shadow-[0_2px_8px_rgba(139,92,246,0.12)]',
    pill: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
  },
  amber: {
    badge: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-[0_2px_8px_rgba(245,158,11,0.12)]',
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  },
  rose: {
    badge: 'bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25 shadow-[0_2px_8px_rgba(244,63,94,0.12)]',
    pill: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  },
  cyan: {
    badge: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400 border-cyan-500/25 shadow-[0_2px_8px_rgba(6,182,212,0.12)]',
    pill: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  },
  indigo: {
    badge: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 border-indigo-500/25 shadow-[0_2px_8px_rgba(99,102,241,0.12)]',
    pill: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
  },
};

export interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string | number;
  tone?: SectionTone;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  icon,
  title,
  subtitle,
  badge,
  tone = 'primary',
  actionLabel,
  actionTo,
  onAction,
  rightSlot,
  className,
}: SectionHeaderProps) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.primary;

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            'w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-200',
            styles.badge
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] sm:text-sm font-bold tracking-tight text-foreground truncate">
              {title}
            </h3>
            {badge !== undefined && badge !== null && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold border leading-none shrink-0',
                  styles.pill
                )}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {rightSlot ? (
        <div className="shrink-0">{rightSlot}</div>
      ) : actionLabel && actionTo ? (
        <Link
          to={actionTo}
          onClick={() => vibrate(10)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 hover:bg-primary/15 active:scale-95 text-primary border border-primary/20 transition-all shrink-0 select-none"
        >
          <span>{actionLabel}</span>
          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
        </Link>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          onClick={() => {
            vibrate(10);
            onAction();
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 hover:bg-primary/15 active:scale-95 text-primary border border-primary/20 transition-all shrink-0 select-none cursor-pointer"
        >
          <span>{actionLabel}</span>
          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
        </button>
      ) : null}
    </div>
  );
}

import { cn } from '../../lib/utils';

export interface CategoryBadgeProps {
  category: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showEmoji?: boolean;
}

// Curated pastel tints with corresponding borders and text tones for light & dark modes
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  Food: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/25',
    emoji: '🍔',
  },
  Dining: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/25',
    emoji: '🍽️',
  },
  Groceries: {
    bg: 'bg-orange-500/10 dark:bg-orange-500/15',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-500/25',
    emoji: '🛒',
  },
  Grocery: {
    bg: 'bg-orange-500/10 dark:bg-orange-500/15',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-500/25',
    emoji: '🛒',
  },
  Transport: {
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-500/25',
    emoji: '🚗',
  },
  Travel: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    text: 'text-cyan-700 dark:text-cyan-400',
    border: 'border-cyan-500/25',
    emoji: '✈️',
  },
  Shopping: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-500/25',
    emoji: '🛍️',
  },
  Entertainment: {
    bg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15',
    text: 'text-fuchsia-700 dark:text-fuchsia-400',
    border: 'border-fuchsia-500/25',
    emoji: '🎬',
  },
  Bills: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-500/25',
    emoji: '💡',
  },
  Utilities: {
    bg: 'bg-yellow-500/10 dark:bg-yellow-500/15',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-500/25',
    emoji: '⚡',
  },
  Medical: {
    bg: 'bg-red-500/10 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-500/25',
    emoji: '💊',
  },
  Health: {
    bg: 'bg-teal-500/10 dark:bg-teal-500/15',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-500/25',
    emoji: '🏥',
  },
  Gym: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/25',
    emoji: '🏋️',
  },
  'Gym supplise': {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/25',
    emoji: '🏋️',
  },
  'Gym supplies': {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/25',
    emoji: '🏋️',
  },
  EMI: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-500/25',
    emoji: '💳',
  },
  Income: {
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400 font-semibold',
    border: 'border-emerald-500/30',
    emoji: '💰',
  },
  Salary: {
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400 font-semibold',
    border: 'border-emerald-500/30',
    emoji: '💵',
  },
  Investment: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500/25',
    emoji: '📈',
  },
  Personal: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-500/25',
    emoji: '👤',
  },
  Education: {
    bg: 'bg-blue-600/10 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500/25',
    emoji: '📚',
  },
  Transfer: {
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-400 font-semibold',
    border: 'border-sky-500/25',
    emoji: '⇄',
  },
  Other: {
    bg: 'bg-zinc-500/10 dark:bg-zinc-500/15',
    text: 'text-zinc-700 dark:text-zinc-400',
    border: 'border-zinc-500/25',
    emoji: '📦',
  },
};

const DEFAULT_STYLE = {
  bg: 'bg-primary/10 dark:bg-primary/15',
  text: 'text-primary dark:text-primary',
  border: 'border-primary/25',
  emoji: '🏷️',
};

export function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] || DEFAULT_STYLE;
}

export function CategoryBadge({
  category,
  size = 'sm',
  className = '',
  showEmoji = true,
}: CategoryBadgeProps) {
  const style = getCategoryStyle(category);

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10.5px] gap-1',
    sm: 'px-2.5 py-0.5 text-[11px] gap-1.5',
    md: 'px-3 py-1 text-xs gap-1.5',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold tracking-wide border backdrop-blur-xs select-none transition-colors duration-150 shadow-2xs',
        style.bg,
        style.text,
        style.border,
        sizeClasses,
        className
      )}
    >
      {showEmoji && <span className="shrink-0 leading-none">{style.emoji}</span>}
      <span className="truncate leading-none">{category}</span>
    </span>
  );
}

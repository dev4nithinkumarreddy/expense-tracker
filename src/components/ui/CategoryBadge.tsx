import { cn } from '../../lib/utils';
import { getCategoryStyle } from '../../lib/categoryStyles';

export interface CategoryBadgeProps {
  category: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showEmoji?: boolean;
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

import { cn } from '../../lib/utils';
import { getCategoryStyle } from '../../lib/categoryStyles';
import { CategoryIcon } from './CategoryIcon';

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

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium tracking-normal border select-none transition-colors duration-150 shadow-2xs',
        style.bg,
        style.text,
        style.border,
        sizeClasses,
        className
      )}
    >
      {showEmoji && <CategoryIcon category={category} className={cn('shrink-0', iconSizes)} />}
      <span className="truncate leading-none">{category}</span>
    </span>
  );
}

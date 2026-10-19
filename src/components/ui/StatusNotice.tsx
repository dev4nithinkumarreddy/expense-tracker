import React from 'react';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { cn } from '../../lib/utils';

export interface StatusNoticeProps {
  variant?: 'warning' | 'info' | 'success' | 'destructive';
  title?: string;
  message: React.ReactNode;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

export function StatusNotice({
  variant = 'info',
  title,
  message,
  icon,
  action,
  onDismiss,
  className = '',
}: StatusNoticeProps) {
  const defaultIcons = {
    warning: <WarningAmberOutlined className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fontSize="inherit" />,
    info: <InfoOutlined className="w-4 h-4 text-primary shrink-0" fontSize="inherit" />,
    success: <CheckCircleOutlined className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fontSize="inherit" />,
    destructive: <ErrorOutlined className="w-4 h-4 text-destructive shrink-0" fontSize="inherit" />,
  };

  const variantStyles = {
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200',
    info: 'bg-primary/10 border-primary/25 text-foreground',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200',
    destructive: 'bg-destructive/10 border-destructive/30 text-destructive-foreground dark:text-destructive',
  };

  const renderedIcon = icon ?? defaultIcons[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-xl border text-xs transition-colors shadow-2xs',
        variantStyles[variant],
        className
      )}
    >
      <div className="pt-0.5">{renderedIcon}</div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-xs tracking-tight mb-0.5">{title}</p>}
        <div className="text-xs leading-relaxed opacity-95">{message}</div>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 shrink-0 cursor-pointer"
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notice"
          className="p-1 -mr-1 -mt-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
        >
          <CloseOutlined className="w-3.5 h-3.5" fontSize="inherit" />
        </button>
      )}
    </div>
  );
}

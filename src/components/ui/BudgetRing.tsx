import { motion } from 'framer-motion';

interface BudgetRingProps {
  percentage?: number;
  value?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  isOverBudget?: boolean;
}

export function BudgetRing({
  percentage,
  value,
  size = 78,
  strokeWidth = 7.5,
  className = '',
  isOverBudget = false
}: BudgetRingProps) {
  const percent = percentage ?? value ?? 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  // Determine gradient colors based on budget health
  const isDanger = isOverBudget || percent >= 90;
  const isWarning = percent >= 75 && !isDanger;

  // Apple Watch Activity Ring palette: vibrant gradients, tinted track, and soft luminance glow
  const colors = isDanger
    ? {
        from: '#f43f5e',
        to: '#ef4444',
        track: 'rgba(239, 68, 68, 0.16)',
        glow: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.5))',
        text: 'text-destructive dark:text-rose-400'
      }
    : isWarning
    ? {
        from: '#fbbf24',
        to: '#f59e0b',
        track: 'rgba(245, 158, 11, 0.16)',
        glow: 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.5))',
        text: 'text-amber-600 dark:text-amber-400'
      }
    : {
        from: '#06b6d4',
        to: '#10b981',
        track: 'rgba(16, 185, 129, 0.16)',
        glow: 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.5))',
        text: 'text-foreground'
      };

  const gradientId = `budget-gradient-${isDanger ? 'danger' : isWarning ? 'warning' : 'healthy'}`;

  return (
    <div
      className={`relative flex items-center justify-center p-1 rounded-full bg-secondary/30 border border-border/30 shadow-2xs ${className}`}
      style={{ width: size + 8, height: size + 8 }}
    >
      <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
        </defs>

        {/* Tinted Apple Activity Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Glowing Apple Activity Progress Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            type: 'spring',
            stiffness: 75,
            damping: 18,
            mass: 0.6
          }}
          strokeLinecap="round"
          fill="none"
          style={{
            filter: colors.glow
          }}
        />
      </svg>

      {/* Center percentage label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className={`text-sm font-bold display-number leading-none tracking-tight ${colors.text}`}>
          {Math.round(percent)}%
        </span>
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 opacity-80">
          used
        </span>
      </div>
    </div>
  );
}

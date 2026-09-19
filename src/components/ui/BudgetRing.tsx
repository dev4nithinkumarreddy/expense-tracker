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
  size = 72,
  strokeWidth = 7,
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

  const gradientId = `budget-gradient-${isDanger ? 'danger' : isWarning ? 'warning' : 'healthy'}`;

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="budget-gradient-healthy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="budget-gradient-warning" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="budget-gradient-danger" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>

        {/* Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
          fill="none"
        />

        {/* Progress Ring */}
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
        />
      </svg>

      {/* Center percentage label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
        <span className={`text-xs font-bold display-number leading-none ${isDanger ? 'text-destructive' : isWarning ? 'text-amber-500' : 'text-foreground'}`}>
          {Math.round(percent)}%
        </span>
        <span className="text-[9px] text-muted-foreground font-medium mt-0.5">used</span>
      </div>
    </div>
  );
}

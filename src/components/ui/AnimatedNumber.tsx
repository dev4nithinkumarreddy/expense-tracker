import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { formatCurrency } from '../../lib/formatCurrency';

interface AnimatedNumberProps {
  value: number;
  currency?: string;
  privacyMode?: boolean;
  className?: string;
  prefix?: string;
  formatFn?: (val: number) => string;
}

export function AnimatedNumber({
  value,
  currency = '₹',
  privacyMode = false,
  className = '',
  prefix = '',
  formatFn
}: AnimatedNumberProps) {
  const spring = useSpring(value, {
    stiffness: 180,
    damping: 24,
    mass: 0.8
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (latest) => {
    if (privacyMode) return '••••••';
    const rounded = Math.round(latest);
    if (formatFn) return formatFn(rounded);
    return `${prefix}${formatCurrency(rounded, currency, false)}`;
  });

  if (privacyMode) {
    return (
      <span className={`display-number select-none ${className}`}>
        {prefix}••••••
      </span>
    );
  }

  return (
    <motion.span className={`display-number ${className}`}>
      {display}
    </motion.span>
  );
}

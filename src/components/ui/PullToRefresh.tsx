import React, { useState, useRef, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { vibrate } from '../../lib/utils';
import { playTapSound } from '../../lib/sound';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  const pullY = useSpring(0, {
    stiffness: 400,
    damping: 30
  });

  const rotate = useTransform(pullY, [0, 80], [0, 360]);
  const opacity = useTransform(pullY, [10, 40], [0, 1]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (refreshing) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop <= 2) {
      startY.current = clientY;
      isPulling.current = true;
      hasTriggeredHaptic.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isPulling.current || refreshing) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diff = clientY - startY.current;

    if (diff > 0) {
      // Apple rubberband resistance curve
      const damped = Math.pow(diff, 0.78) * 2;
      pullY.set(Math.min(damped, 85));

      if (damped > 55 && !hasTriggeredHaptic.current) {
        vibrate(15);
        hasTriggeredHaptic.current = true;
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || refreshing) return;
    isPulling.current = false;

    if (pullY.get() > 50) {
      setRefreshing(true);
      vibrate(20);
      playTapSound();
      pullY.set(45);

      try {
        await onRefresh();
      } catch {
        // silent fail
      } finally {
        setTimeout(() => {
          setRefreshing(false);
          pullY.set(0);
        }, 400);
      }
    } else {
      pullY.set(0);
    }
  };

  useEffect(() => {
    if (!refreshing) {
      pullY.set(0);
    }
  }, [refreshing, pullY]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative ${className}`}
    >
      {/* Pull Indicator */}
      <motion.div
        style={{ y: pullY, opacity }}
        className="absolute top-0 left-0 right-0 -mt-10 flex items-center justify-center z-20 pointer-events-none"
      >
        <div className="w-8 h-8 rounded-full glass-card flex items-center justify-center shadow-md border border-border/80 text-primary">
          <motion.div style={{ rotate }} className={refreshing ? 'animate-spin' : ''}>
            <RefreshCw className="w-4 h-4 text-primary" />
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div style={{ y: pullY }}>
        {children}
      </motion.div>
    </div>
  );
}

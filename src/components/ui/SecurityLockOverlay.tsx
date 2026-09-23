import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore } from '../../store/useExpenseStore';
import { verifyPin, authenticateWithBiometrics, isBiometricsAvailable } from '../../lib/biometrics';
import { Shield, Delete, Fingerprint } from 'lucide-react';
import { vibrate } from '../../lib/utils';
import { playTapSound, playSuccessSound } from '../../lib/sound';
import { toast } from 'sonner';

interface SecurityLockOverlayProps {
  onUnlock?: () => void;
}

export function SecurityLockOverlay({ onUnlock }: SecurityLockOverlayProps) {
  const { settings } = useExpenseStore();
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    isBiometricsAvailable().then(setIsBiometricSupported);
  }, []);

  // Attempt biometrics on mount if enabled
  useEffect(() => {
    if (settings.appLockEnabled && settings.appLockBiometrics && isBiometricSupported && !isUnlocked) {
      handleBiometricAuth();
    }
  }, [settings.appLockEnabled, settings.appLockBiometrics, isBiometricSupported, isUnlocked]);

  const handleBiometricAuth = async () => {
    vibrate(10);
    const success = await authenticateWithBiometrics();
    if (success) {
      triggerUnlock();
    }
  };

  const triggerUnlock = () => {
    vibrate(20);
    playSuccessSound();
    setIsUnlocked(true);
    onUnlock?.();
  };

  const handleKeyPress = async (digit: string) => {
    if (pin.length >= 4) return;
    vibrate(8);
    playTapSound();
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      if (!settings.appLockPin) {
        // If no PIN configured, unlock
        triggerUnlock();
        return;
      }
      const isValid = await verifyPin(newPin, settings.appLockPin);
      if (isValid) {
        triggerUnlock();
      } else {
        vibrate([30, 50, 30]);
        setIsShaking(true);
        toast.error('Incorrect PIN');
        setTimeout(() => {
          setPin('');
          setIsShaking(false);
        }, 500);
      }
    }
  };

  const handleDelete = () => {
    vibrate(8);
    playTapSound();
    setPin((prev) => prev.slice(0, -1));
  };

  if (!settings.appLockEnabled || isUnlocked) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[999] flex flex-col items-center justify-between p-6 py-12 bg-background/95 backdrop-blur-2xl text-foreground select-none"
      >
        {/* Header Branding */}
        <div className="flex flex-col items-center gap-3 pt-6">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight">App Locked</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your 4-digit PIN to continue
            </p>
          </div>

          {/* 4 PIN Dots */}
          <motion.div
            animate={isShaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4 mt-6"
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    isFilled
                      ? 'bg-primary border-primary scale-110 shadow-xs'
                      : 'border-muted-foreground/40 bg-transparent'
                  }`}
                />
              );
            })}
          </motion.div>
        </div>

        {/* Keypad */}
        <div className="w-full max-w-xs space-y-4 pb-6">
          <div className="grid grid-cols-3 gap-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-secondary/50 hover:bg-secondary active:scale-90 active:bg-primary/20 transition-all font-semibold text-xl flex items-center justify-center shadow-xs border border-border/40"
              >
                {digit}
              </button>
            ))}

            {/* Bottom Row */}
            {isBiometricSupported && settings.appLockBiometrics ? (
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-primary/10 hover:bg-primary/20 text-primary active:scale-90 transition-all flex items-center justify-center border border-primary/20 shadow-xs"
                aria-label="Use Biometrics"
              >
                <Fingerprint className="w-6 h-6" />
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-secondary/50 hover:bg-secondary active:scale-90 active:bg-primary/20 transition-all font-semibold text-xl flex items-center justify-center shadow-xs border border-border/40"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-secondary/30 hover:bg-secondary active:scale-90 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center border border-border/30"
              aria-label="Backspace"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * SecurityLockOverlay Component
 * 
 * Note: App Lock and Biometric (Face ID / Touch ID / PIN) feature is temporarily paused
 * for the web PWA version. It will be restored with hardware-level security bindings
 * when the application is converted into a full native app (Capacitor / React Native).
 */

interface SecurityLockOverlayProps {
  onUnlock?: () => void;
}

export function SecurityLockOverlay({ onUnlock: _onUnlock }: SecurityLockOverlayProps) {
  // Feature paused for web PWA — returning null ensures zero lockout or unwanted prompts.
  return null;
}

/*
 ============================================================================
  PRESERVED SCAFFOLDING FOR FULL NATIVE APP RESTORATION:
 ============================================================================
  When converting to a full native app with native biometric plugins:
  - Connect verifyPin & authenticateWithBiometrics from lib/biometrics
  - Restore the Framer Motion PIN & Face ID keypad overlay
 ============================================================================
*/

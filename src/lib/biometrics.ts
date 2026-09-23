/**
 * Biometric & PIN Security Module
 * Supports SHA-256 hashed PIN authentication and WebAuthn FaceID/TouchID/Windows Hello
 */

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`expense_lock_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  const hash = await hashPin(pin);
  return hash === storedHash;
}

export async function isBiometricsAvailable(): Promise<boolean> {
  try {
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return false;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Simple platform assertion challenge for local presence verification
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred',
      },
    });

    return !!credential;
  } catch {
    // If user cancelled or device not configured, return false gracefully
    return false;
  }
}

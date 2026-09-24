/**
 * Biometric & PIN Security Module
 * Supports SHA-256 hashed PIN authentication and WebAuthn FaceID/TouchID/Windows Hello
 */

export function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent) && !('MSStream' in (window as unknown as Record<string, unknown>));
}

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

const CREDENTIAL_STORAGE_KEY = 'expense_biometric_cred_id';

export function getStoredBiometricCredentialId(): string | null {
  try {
    return localStorage.getItem(CREDENTIAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredBiometrics(): void {
  try {
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Registers device Face ID / Touch ID platform passkey via WebAuthn
 */
export async function registerBiometrics(): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return { success: false, error: 'WebAuthn is not supported on this browser or connection.' };
    }

    const available = await isBiometricsAvailable();
    if (!available) {
      return { success: false, error: 'Face ID / Biometric authenticator not available on this device.' };
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Expense Tracker',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: 'user@expensetracker.app',
          displayName: 'Expense Tracker User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256 (Apple Secure Enclave native)
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    })) as (PublicKeyCredential & { rawId?: ArrayBuffer }) | null;

    if (!credential) {
      return { success: false, error: 'Biometric setup cancelled.' };
    }

    if (credential.rawId) {
      const b64 = bufferToBase64(credential.rawId);
      localStorage.setItem(CREDENTIAL_STORAGE_KEY, b64);
    } else {
      localStorage.setItem(CREDENTIAL_STORAGE_KEY, credential.id);
    }

    return { success: true };
  } catch (err: unknown) {
    const errorObj = err as { name?: string; message?: string };
    if (errorObj?.name === 'NotAllowedError') {
      return { success: false, error: 'Face ID setup was cancelled or timed out.' };
    }
    return { success: false, error: errorObj?.message || 'Biometric enrollment failed.' };
  }
}

/**
 * Authenticates user with Face ID / Touch ID platform passkey
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const storedId = getStoredBiometricCredentialId();
    let allowCredentials: PublicKeyCredentialDescriptor[] | undefined = undefined;

    if (storedId) {
      try {
        allowCredentials = [
          {
            id: base64ToBuffer(storedId),
            type: 'public-key',
            transports: ['internal'],
          },
        ];
      } catch {
        // Fallback to discoverable credential if parsing fails
      }
    }

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials,
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return !!credential;
  } catch (err) {
    console.warn('Biometric authentication failed or cancelled:', err);
    return false;
  }
}

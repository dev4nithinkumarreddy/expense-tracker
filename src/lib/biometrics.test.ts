import { describe, it, expect } from 'vitest';
import {
  hashPin,
  verifyPin,
  isBiometricsAvailable,
  bufferToBase64,
  base64ToBuffer,
  isAppleDevice,
  registerBiometrics,
  authenticateWithBiometrics,
} from './biometrics';

describe('biometrics and PIN security', () => {
  it('hashes a PIN deterministically with SHA-256', async () => {
    const hash1 = await hashPin('1234');
    const hash2 = await hashPin('1234');
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it('produces different hashes for different PINs', async () => {
    const hash1 = await hashPin('1234');
    const hash2 = await hashPin('4321');
    expect(hash1).not.toBe(hash2);
  });

  it('verifies correct PIN against stored hash', async () => {
    const storedHash = await hashPin('9876');
    const isValid = await verifyPin('9876', storedHash);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect PIN against stored hash', async () => {
    const storedHash = await hashPin('9876');
    const isValid = await verifyPin('1111', storedHash);
    expect(isValid).toBe(false);
  });

  it('handles biometrics availability check safely when unmocked or mocked', async () => {
    const result = await isBiometricsAvailable();
    expect(typeof result).toBe('boolean');
  });

  it('correctly converts between ArrayBuffer and base64 strings', () => {
    const original = new Uint8Array([1, 2, 3, 4, 15, 255]);
    const b64 = bufferToBase64(original.buffer);
    const restored = new Uint8Array(base64ToBuffer(b64));
    expect(Array.from(restored)).toEqual(Array.from(original));
  });

  it('handles isAppleDevice safely in test environment', () => {
    const result = isAppleDevice();
    expect(typeof result).toBe('boolean');
  });

  it('handles registerBiometrics safely when WebAuthn is unavailable', async () => {
    const res = await registerBiometrics();
    expect(res.success).toBe(false);
    expect(typeof res.error).toBe('string');
  });

  it('handles authenticateWithBiometrics safely when WebAuthn is unavailable', async () => {
    const res = await authenticateWithBiometrics();
    expect(res).toBe(false);
  });
});

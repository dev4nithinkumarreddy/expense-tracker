import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, isBiometricsAvailable } from './biometrics';

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
});

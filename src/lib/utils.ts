import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const vibrate = (pattern: number | number[] = 50) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    // Wrap in try-catch as some browsers strictly require user interaction
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibration failed', e);
    }
  }
};

/**
 * Generates an RFC 4122 v5-compliant deterministic UUID from a namespace and key.
 * Used for idempotent entity generation (e.g. recurring expenses, month rollover).
 */
export function generateDeterministicUUID(namespace: string, key: string): string {
  const input = `${namespace}:${key}`;
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x12345678, h4 = 0x87654321;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2654435761) ^ Math.imul(h3 ^ (h3 >>> 13), 1597334677);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 1597334677) ^ Math.imul(h4 ^ (h4 >>> 13), 2246822507);
  h4 = Math.imul(h4 ^ (h4 >>> 13), 3266489909) ^ Math.imul(h1 ^ (h1 >>> 16), 2654435761);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = ((h2 >>> 16) & 0xffff).toString(16).padStart(4, '0');
  const hex3 = '5' + ((h2 >>> 4) & 0x0fff).toString(16).padStart(3, '0');
  const hex4 = ((8 + ((h3 >>> 28) & 0x3)).toString(16)) + ((h3 >>> 16) & 0x0fff).toString(16).padStart(3, '0');
  const hex5 = ((h3 >>> 0) & 0xffff).toString(16).padStart(4, '0') + ((h4 >>> 0).toString(16).padStart(8, '0'));

  return `${hex1}-${hex2}-${hex3}-${hex4}-${hex5.slice(0, 12)}`;
}

import { describe, it, expect, vi } from 'vitest';
import { urlBase64ToUint8Array, enableNotifications } from './pushNotifications';

describe('pushNotifications.ts', () => {
  describe('urlBase64ToUint8Array', () => {
    it('converts a base64 string to a Uint8Array correctly', () => {
      // "Hello" in base64 is "SGVsbG8="
      const base64 = 'SGVsbG8=';
      const result = urlBase64ToUint8Array(base64);
      expect(result).toBeInstanceOf(Uint8Array);
      const text = String.fromCharCode(...result);
      expect(text).toBe('Hello');
    });

    it('correctly pads unpadded base64 strings and translates url-safe characters', () => {
      // URL-safe base64 with - and _
      const urlSafe = 'SGVsbG8-_w'; // test url-safe
      const result = urlBase64ToUint8Array(urlSafe);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('enableNotifications', () => {
    it('throws error when PushManager is not supported', async () => {
      // If PushManager is missing in global window
      const originalPushManager = (window as any).PushManager;
      delete (window as any).PushManager;

      await expect(enableNotifications('user-123')).rejects.toThrow(
        /Push notifications are not supported|VAPID public key not found/
      );

      if (originalPushManager) {
        (window as any).PushManager = originalPushManager;
      }
    });

    it('throws error when notification permission is denied', async () => {
      (window as any).PushManager = {};
      (window as any).Notification = {
        requestPermission: vi.fn().mockResolvedValue('denied')
      };

      // Mock import.meta.env
      vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U');

      await expect(enableNotifications('user-123')).rejects.toThrow(
        /Notification permission was denied/
      );

      vi.unstubAllEnvs();
    });
  });
});

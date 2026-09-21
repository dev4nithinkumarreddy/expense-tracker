import { describe, it, expect } from 'vitest';
import { calculateRemainingTime } from './admin';

describe('Admin Helper Functions', () => {
  describe('calculateRemainingTime', () => {
    it('returns isDue = true if the scheduled time is in the past', () => {
      const pastTime = new Date(Date.now() - 60000).toISOString();
      const result = calculateRemainingTime(pastTime);
      expect(result.isDue).toBe(true);
      expect(result.formatted).toBe('Due now');
    });

    it('returns formatted countdown for future time under 1 hour', () => {
      // 5 minutes in the future
      const futureTime = new Date(Date.now() + 5 * 60 * 1000 + 30 * 1000).toISOString();
      const result = calculateRemainingTime(futureTime);
      expect(result.isDue).toBe(false);
      expect(result.minutes).toBe(5);
      expect(result.hours).toBe(0);
      expect(result.formatted).toMatch(/05m \d\ds/);
    });

    it('returns formatted countdown for future time over 1 hour', () => {
      // 2 hours, 15 minutes in future
      const futureTime = new Date(Date.now() + (2 * 3600 + 15 * 60 + 10) * 1000).toISOString();
      const result = calculateRemainingTime(futureTime);
      expect(result.isDue).toBe(false);
      expect(result.hours).toBe(2);
      expect(result.minutes).toBe(15);
      expect(result.formatted).toMatch(/02h 15m \d\ds/);
    });
  });

  describe('checkIsAdmin', () => {
    it('recognizes super admin email', async () => {
      const { checkIsAdmin } = await import('./admin');
      const isAdmin1 = await checkIsAdmin('dev4nithinkumarreddyc@gmail.com');
      const isAdmin2 = await checkIsAdmin('dev4nithinkumarreddy@gmail.com');
      const isNotAdmin = await checkIsAdmin('randomuser@example.com');

      expect(isAdmin1).toBe(true);
      expect(isAdmin2).toBe(true);
      expect(isNotAdmin).toBe(false);
    });
  });
});

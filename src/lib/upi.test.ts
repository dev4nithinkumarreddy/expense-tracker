import { describe, it, expect } from 'vitest';
import {
  generateUpiUrl,
  isValidUpiId,
  generateWhatsAppShareText,
  generatePayWebUrl,
  calculateSplit,
} from './upi';

describe('UPI & Split Utilities', () => {
  describe('isValidUpiId', () => {
    it('validates standard bank handles', () => {
      expect(isValidUpiId('nithin@okaxis')).toBe(true);
      expect(isValidUpiId('9876543210@paytm')).toBe(true);
      expect(isValidUpiId('john.doe@okhdfcbank')).toBe(true);
      expect(isValidUpiId('shop-123@ybl')).toBe(true);
    });

    it('rejects invalid UPI addresses', () => {
      expect(isValidUpiId('')).toBe(false);
      expect(isValidUpiId('invalidupi')).toBe(false);
      expect(isValidUpiId('@paytm')).toBe(false);
      expect(isValidUpiId('user@')).toBe(false);
      expect(isValidUpiId('user name@okaxis')).toBe(false);
    });
  });

  describe('generateUpiUrl', () => {
    it('generates standard NPCI UPI payment deep link', () => {
      const url = generateUpiUrl({
        pa: 'nithin@okaxis',
        pn: 'Nithin Reddy',
        am: 450,
        tn: 'Dinner Split',
      });

      expect(url).toContain('upi://pay?');
      expect(url).toContain('pa=nithin%40okaxis');
      expect(url).toContain('pn=Nithin+Reddy');
      expect(url).toContain('am=450.00');
      expect(url).toContain('cu=INR');
      expect(url).toContain('tn=Dinner+Split');
    });
  });

  describe('generatePayWebUrl', () => {
    it('generates clickable https pay portal URL with query parameters', () => {
      const url = generatePayWebUrl({
        origin: 'https://expense-tracker-captain12.vercel.app',
        pa: 'nithin@okaxis',
        pn: 'Nithin',
        am: 250,
        tn: 'Dinner Split',
        cu: 'INR',
      });

      expect(url).toBe('https://expense-tracker-captain12.vercel.app/pay?pa=nithin%40okaxis&pn=Nithin&am=250.00&tn=Dinner+Split&cu=INR');
    });
  });

  describe('generateWhatsAppShareText', () => {
    it('formats friendly split message with amount, UPI ID, and clickable web portal link', () => {
      const text = generateWhatsAppShareText({
        payeeName: 'Rahul',
        payerName: 'Nithin',
        amount: 350,
        currency: '₹',
        description: 'Dominos Pizza',
        upiId: 'nithin@okaxis',
        payWebUrl: 'https://expense-tracker-captain12.vercel.app/pay?pa=nithin@okaxis&am=350.00',
      });

      expect(text).toContain('Hey Rahul!');
      expect(text).toContain('Dominos Pizza');
      expect(text).toContain('₹350');
      expect(text).toContain('nithin@okaxis');
      expect(text).toContain('https://expense-tracker-captain12.vercel.app/pay?');
    });
  });

  describe('calculateSplit', () => {
    it('divides evenly with exact penny distribution', () => {
      const participants = [
        { id: '1', name: 'You', isSelf: true },
        { id: '2', name: 'Rahul', isSelf: false },
        { id: '3', name: 'Priya', isSelf: false },
      ];

      // ₹100 split 3 ways: 33.34 + 33.33 + 33.33 = 100.00
      const result = calculateSplit(100, participants, 'equal');
      expect(result.isBalanced).toBe(true);
      expect(result.shares.length).toBe(3);
      expect(result.shares[0].amount).toBe(33.34);
      expect(result.shares[1].amount).toBe(33.33);
      expect(result.shares[2].amount).toBe(33.33);

      const totalSum = result.shares.reduce((a, b) => a + b.amount, 0);
      expect(Number(totalSum.toFixed(2))).toBe(100);
    });

    it('handles exact split mode and detects imbalances', () => {
      const participants = [
        { id: '1', name: 'You', isSelf: true, amount: 500 },
        { id: '2', name: 'Rahul', isSelf: false, amount: 400 },
      ];

      const balanced = calculateSplit(900, participants, 'exact');
      expect(balanced.isBalanced).toBe(true);
      expect(balanced.difference).toBe(0);

      const imbalanced = calculateSplit(1000, participants, 'exact');
      expect(imbalanced.isBalanced).toBe(false);
      expect(imbalanced.difference).toBe(100); // 100 remaining to be allocated
    });

    it('handles percentage split mode', () => {
      const participants = [
        { id: '1', name: 'You', isSelf: true, percentage: 50 },
        { id: '2', name: 'Rahul', isSelf: false, percentage: 50 },
      ];

      const result = calculateSplit(500, participants, 'percentage');
      expect(result.isBalanced).toBe(true);
      expect(result.shares[0].amount).toBe(250);
      expect(result.shares[1].amount).toBe(250);
    });
  });
});

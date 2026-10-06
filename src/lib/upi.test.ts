import { describe, it, expect } from 'vitest';
import {
  generateUpiUrl,
  isValidUpiId,
  generateWhatsAppShareText,
  generatePayWebUrl,
  calculateSplit,
  getUpiAppIntentUrl,
  autoBalanceToSelf,
  distributeRemainingEqually,
  convertSharesOnModeChange,
  type SplitCalculationParticipant,
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

  describe('getUpiAppIntentUrl', () => {
    const params = {
      pa: 'nithin@okaxis',
      pn: 'Nithin Reddy',
      am: 500,
      tn: 'Trip Split',
    };

    const androidUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';
    const iosUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

    it('generates explicit Android package intent for Google Pay', () => {
      const url = getUpiAppIntentUrl(params, 'gpay', androidUA);
      expect(url).toContain('intent://pay?');
      expect(url).toContain('package=com.google.android.apps.nbu.paisa.user');
      expect(url).toContain('scheme=upi');
      expect(url).toContain('pa=nithin%40okaxis');
    });

    it('generates explicit Android package intent for PhonePe', () => {
      const url = getUpiAppIntentUrl(params, 'phonepe', androidUA);
      expect(url).toContain('intent://pay?');
      expect(url).toContain('package=com.phonepe.app');
      expect(url).toContain('scheme=upi');
    });

    it('generates explicit Android package intent for Paytm', () => {
      const url = getUpiAppIntentUrl(params, 'paytm', androidUA);
      expect(url).toContain('intent://pay?');
      expect(url).toContain('package=net.one97.paytm');
      expect(url).toContain('scheme=upi');
    });

    it('generates iOS deep links for supported apps', () => {
      expect(getUpiAppIntentUrl(params, 'gpay', iosUA)).toContain('gpay://upi/pay?');
      expect(getUpiAppIntentUrl(params, 'phonepe', iosUA)).toContain('phonepe://pay?');
      expect(getUpiAppIntentUrl(params, 'paytm', iosUA)).toContain('paytmmp://pay?');
    });

    it('falls back to standard upi:// scheme for generic or desktop requests', () => {
      expect(getUpiAppIntentUrl(params, 'generic', androidUA)).toContain('upi://pay?');
      expect(getUpiAppIntentUrl(params, 'gpay', desktopUA)).toContain('upi://pay?');
    });
  });

  describe('autoBalanceToSelf', () => {
    it('sets user share to exact remaining amount in exact mode', () => {
      const participants = [
        { id: 'self', name: 'You', isSelf: true, amount: 0 },
        { id: 'p2', name: 'Rahul', isSelf: false, amount: 450 },
        { id: 'p3', name: 'Priya', isSelf: false, amount: 200 },
      ];
      // Total 1000 - (450 + 200) = 350
      const balanced = autoBalanceToSelf(1000, participants, 'exact');
      expect(balanced.find(p => p.isSelf)?.amount).toBe(350);
      expect(balanced.find(p => p.id === 'p2')?.amount).toBe(450);
    });

    it('sets user share to exact remaining percentage in percentage mode', () => {
      const participants = [
        { id: 'self', name: 'You', isSelf: true, percentage: 0 },
        { id: 'p2', name: 'Rahul', isSelf: false, percentage: 40 },
        { id: 'p3', name: 'Priya', isSelf: false, percentage: 25 },
      ];
      // 100 - (40 + 25) = 35%
      const balanced = autoBalanceToSelf(1000, participants, 'percentage');
      expect(balanced.find(p => p.isSelf)?.percentage).toBe(35);
    });
  });

  describe('distributeRemainingEqually', () => {
    it('distributes remaining exact difference equally across friends', () => {
      const participants = [
        { id: 'self', name: 'You', isSelf: true, amount: 400 },
        { id: 'p2', name: 'Rahul', isSelf: false, amount: 200 },
        { id: 'p3', name: 'Priya', isSelf: false, amount: 200 },
      ];
      // Total 1000. Sum so far = 800. Difference = 200. Split between 2 friends: +100 each.
      const result = distributeRemainingEqually(1000, participants, 'exact');
      expect(result.find(p => p.id === 'p2')?.amount).toBe(300);
      expect(result.find(p => p.id === 'p3')?.amount).toBe(300);
      expect(result.find(p => p.isSelf)?.amount).toBe(400);
    });
  });

  describe('convertSharesOnModeChange', () => {
    it('preserves calculated amounts when switching from equal to exact', () => {
      const participants: SplitCalculationParticipant[] = [
        { id: 'self', name: 'You', isSelf: true },
        { id: 'p2', name: 'Rahul', isSelf: false },
      ];
      // Total 500 split 2 ways: 250 each
      const converted = convertSharesOnModeChange(500, participants, 'equal', 'exact');
      expect(converted[0].amount).toBe(250);
      expect(converted[1].amount).toBe(250);
    });

    it('preserves calculated percentages when switching from equal to percentage', () => {
      const participants: SplitCalculationParticipant[] = [
        { id: 'self', name: 'You', isSelf: true },
        { id: 'p2', name: 'Rahul', isSelf: false },
      ];
      const converted = convertSharesOnModeChange(500, participants, 'equal', 'percentage');
      expect(converted[0].percentage).toBe(50);
      expect(converted[1].percentage).toBe(50);
    });
  });
});



import { describe, it, expect } from 'vitest';
import { parseBankSMS } from './smsParser';

describe('parseBankSMS', () => {
  it('parses typical Indian bank debit SMS', () => {
    const sms = 'Sent Rs.450.00 from HDFC Bank to SWIGGY on 22-SEP-26 via UPI ref 42938104.';
    const res = parseBankSMS(sms);
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(450);
    expect(res?.merchant.toUpperCase()).toContain('SWIGGY');
    expect(res?.category).toBe('Food');
    expect(res?.type).toBe('debit');
    expect(res?.accountName).toContain('HDFC Bank');
  });

  it('parses international credit card alert SMS', () => {
    const sms = 'Chase: You made a $42.50 purchase at WHOLE FOODS on Sep 22.';
    const res = parseBankSMS(sms);
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(42.5);
    expect(res?.merchant.toUpperCase()).toContain('WHOLE FOODS');
    expect(res?.type).toBe('debit');
    expect(res?.accountName).toBe('Chase');
  });

  it('identifies credited / income transactions', () => {
    const sms = 'Your A/C ending 9876 is credited with INR 50,000.00 on 01-Oct-26 by Salary deposit.';
    const res = parseBankSMS(sms);
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(50000);
    expect(res?.type).toBe('credit');
    expect(res?.category).toBe('Income');
  });

  it('returns null for non-transaction SMS', () => {
    const sms = 'Your OTP for logging into netbanking is 849201. Do not share it with anyone.';
    const res = parseBankSMS(sms);
    expect(res).toBeNull();
  });
});

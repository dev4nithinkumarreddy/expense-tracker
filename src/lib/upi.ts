/**
 * UPI & Bill Splitting Utilities
 * Complies with NPCI UPI Deep Link Specification
 */

export interface UpiPaymentParams {
  pa: string; // Payee VPA (e.g. name@okaxis)
  pn?: string; // Payee Name
  am: number; // Amount in INR
  tn?: string; // Transaction Note
  cu?: string; // Currency (defaults to INR)
}

export interface SplitCalculationParticipant {
  id: string;
  name: string;
  isSelf: boolean;
  amount?: number;
  percentage?: number;
}

export type SplitMode = 'equal' | 'exact' | 'percentage';

/**
 * Validates whether a given string is a valid UPI Virtual Payment Address (VPA).
 */
export function isValidUpiId(upiId: string): boolean {
  if (!upiId || typeof upiId !== 'string') return false;
  const trimmed = upiId.trim();
  // Standard UPI VPA format: identifier@bankhandle
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(trimmed);
}

export type UpiAppTarget = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'generic';

/**
 * Generates an NPCI-compliant UPI deep link string.
 * Opens Google Pay, PhonePe, Paytm, BHIM, Cred on mobile.
 */
export function generateUpiUrl(params: UpiPaymentParams): string {
  const { pa, pn = 'Expense Payee', am, tn = 'Expense Split', cu = 'INR' } = params;
  const cleanPa = pa.trim();
  const formattedAmount = Number(am).toFixed(2);
  const searchParams = new URLSearchParams();
  searchParams.append('pa', cleanPa);
  searchParams.append('pn', pn.trim());
  searchParams.append('am', formattedAmount);
  searchParams.append('cu', cu);
  searchParams.append('tn', tn.trim());

  return `upi://pay?${searchParams.toString()}`;
}

/**
 * Returns an app-specific deep link URL.
 * On Android, uses explicit package intents to bypass default app hijack (such as WhatsApp Payments).
 * On iOS, uses vendor-specific custom schemes.
 */
export function getUpiAppIntentUrl(
  params: UpiPaymentParams,
  app: UpiAppTarget,
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''
): string {
  const { pa, pn = 'Expense Payee', am, tn = 'Expense Split', cu = 'INR' } = params;
  const cleanPa = pa.trim();
  const formattedAmount = Number(am).toFixed(2);
  const searchParams = new URLSearchParams();
  searchParams.set('pa', cleanPa);
  searchParams.set('pn', pn.trim());
  searchParams.set('am', formattedAmount);
  searchParams.set('cu', cu);
  searchParams.set('tn', tn.trim());
  const query = searchParams.toString();

  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);

  switch (app) {
    case 'gpay':
      if (isAndroid) {
        return `intent://pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      }
      if (isIOS) {
        return `gpay://upi/pay?${query}`;
      }
      return `upi://pay?${query}`;

    case 'phonepe':
      if (isAndroid) {
        return `intent://pay?${query}#Intent;scheme=upi;package=com.phonepe.app;end`;
      }
      if (isIOS) {
        return `phonepe://pay?${query}`;
      }
      return `upi://pay?${query}`;

    case 'paytm':
      if (isAndroid) {
        return `intent://pay?${query}#Intent;scheme=upi;package=net.one97.paytm;end`;
      }
      if (isIOS) {
        return `paytmmp://pay?${query}`;
      }
      return `upi://pay?${query}`;

    case 'bhim':
      if (isAndroid) {
        return `intent://pay?${query}#Intent;scheme=upi;package=in.org.npci.upiapp;end`;
      }
      if (isIOS) {
        return `bhim://pay?${query}`;
      }
      return `upi://pay?${query}`;

    case 'generic':
    default:
      return `upi://pay?${query}`;
  }
}

/**
 * Generates an https:// link to the web payment portal so recipients on WhatsApp
 * can click it directly to pay via GPay/PhonePe or scan/download the QR code.
 * Ensures the link always has a public https domain so WhatsApp renders it as a clickable link.
 */
export function generatePayWebUrl(params: {
  origin?: string;
  pa: string;
  pn?: string;
  am: number;
  tn?: string;
  cu?: string;
}): string {
  let base = params.origin;
  if (!base && typeof window !== 'undefined' && window.location?.origin) {
    base = window.location.origin;
  }
  // WhatsApp ignores localhost and 127.0.0.1; always use public live URL so links are clickable on phones
  if (!base || base.includes('localhost') || base.includes('127.0.0.1')) {
    base = 'https://expense-tracker-captain12.vercel.app';
  }

  const cleanDesc = (params.tn || 'Group Expense')
    .replace(/^Split:\s*/i, '')
    .replace(/^"|"$/g, '')
    .trim();

  const search = new URLSearchParams();
  search.set('pa', params.pa.trim());
  if (params.pn) search.set('pn', params.pn.trim());
  search.set('am', Number(params.am).toFixed(2));
  search.set('tn', cleanDesc);
  search.set('cu', params.cu || 'INR');
  return `${base}/pay?${search.toString()}`;
}

/**
 * Formats a clean, professional WhatsApp split payment request text.
 * Completely emoji-free to prevent any character corruption or diamond symbols.
 */
export function generateWhatsAppShareText(options: {
  payeeName: string;
  payerName: string;
  amount: number;
  currency: string;
  description: string;
  upiUrl?: string;
  upiId?: string;
  payWebUrl?: string;
}): string {
  const { payeeName, payerName, amount, currency, description, upiId, payWebUrl } = options;
  const greeting = payeeName?.trim() ? `Hey ${payeeName.trim()}!` : 'Hey!';
  const formattedAmount = `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const cleanDesc = description
    ?.replace(/^Split:\s*/i, '')
    ?.replace(/^"|"$/g, '')
    ?.trim() || 'Group Expense';

  const lines: string[] = [
    greeting,
    '',
    `*Bill Split Request*`,
    `• Split for: ${cleanDesc}`,
    `• Amount to Pay: *${formattedAmount}*`,
  ];

  if (upiId?.trim()) {
    lines.push(
      '',
      `*Pay to ${payerName?.trim() || 'me'} via UPI:*`,
      `• UPI ID: *${upiId.trim()}*`,
      `• Amount: *${formattedAmount}*`,
      `_(Copy this UPI ID to pay in Google Pay, PhonePe, or Paytm)_`
    );
  }

  if (payWebUrl?.trim()) {
    lines.push(
      '',
      `*Click here to pay or view QR code:*`,
      payWebUrl.trim()
    );
  }

  lines.push(
    '',
    `_Sent via Expense Tracker_`
  );

  return lines.join('\n');
}

/**
 * Generates WhatsApp web / app redirect URL.
 * Uses api.whatsapp.com directly to bypass wa.me redirect glitches.
 */
export function generateWhatsAppUrl(text: string, phoneNumber?: string): string {
  const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Accurately calculates individual participant shares based on the selected mode.
 * Guarantees that the sum of all participant amounts equals totalAmount exactly down to 2 decimals.
 */
export function calculateSplit(
  totalAmount: number,
  participants: SplitCalculationParticipant[],
  mode: SplitMode
): {
  shares: { id: string; amount: number; percentage: number }[];
  difference: number;
  isBalanced: boolean;
} {
  const count = participants.length;
  if (count === 0 || totalAmount <= 0) {
    return { shares: [], difference: 0, isBalanced: true };
  }

  if (mode === 'equal') {
    // 1-cent exact distribution algorithm
    const totalCents = Math.round(totalAmount * 100);
    const baseCents = Math.floor(totalCents / count);
    let remainderCents = totalCents - baseCents * count;

    const shares = participants.map((p) => {
      let participantCents = baseCents;
      if (remainderCents > 0) {
        participantCents += 1;
        remainderCents -= 1;
      }
      const amount = participantCents / 100;
      const percentage = totalAmount > 0 ? Number(((amount / totalAmount) * 100).toFixed(1)) : 0;
      return { id: p.id, amount, percentage };
    });

    return { shares, difference: 0, isBalanced: true };
  }

  if (mode === 'percentage') {
    let allocatedAmount = 0;
    const shares = participants.map((p) => {
      const pct = p.percentage || 0;
      const amount = Number(((pct / 100) * totalAmount).toFixed(2));
      allocatedAmount += amount;
      return { id: p.id, amount, percentage: pct };
    });

    const diff = Number((totalAmount - allocatedAmount).toFixed(2));
    const isBalanced = Math.abs(diff) < 0.01;

    return { shares, difference: diff, isBalanced };
  }

  // Exact amount mode
  let sumExact = 0;
  const shares = participants.map((p) => {
    const amount = Number((p.amount || 0).toFixed(2));
    sumExact += amount;
    const percentage = totalAmount > 0 ? Number(((amount / totalAmount) * 100).toFixed(1)) : 0;
    return { id: p.id, amount, percentage };
  });

  const diff = Number((totalAmount - sumExact).toFixed(2));
  const isBalanced = Math.abs(diff) < 0.01;

  return { shares, difference: diff, isBalanced };
}

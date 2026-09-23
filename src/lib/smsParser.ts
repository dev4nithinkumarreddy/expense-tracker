import { format } from 'date-fns';
import { parseNLPExpense } from './nlpExpenseParser';

export interface ParsedSMS {
  amount: number | null;
  merchant: string;
  category: string;
  type: 'debit' | 'credit';
  accountName: string | null;
  date: string; // yyyy-MM-dd
  rawText: string;
}

/**
 * Parses transactional SMS notifications from banks, UPI, and credit cards
 */
export function parseBankSMS(smsText: string, customCategories?: string[]): ParsedSMS | null {
  if (!smsText || typeof smsText !== 'string' || smsText.trim().length < 10) {
    return null;
  }

  const text = smsText.trim();

  // Determine if it is a transaction notification
  const isDebit = /\b(debited|spent|paid|withdrawn|charged|purchase|sent)\b/i.test(text);
  const isCredit = /\b(credited|received|refunded|deposited|salary)\b/i.test(text);

  if (!isDebit && !isCredit) {
    return null;
  }

  // 1. Extract Amount
  // Matches: "INR 1,250.00", "Rs. 450", "Rs 500", "$42.50", "debited by 1200"
  let amount: number | null = null;
  const amountMatch = text.match(/(?:inr|rs\.?|usd|\$|eur|gbp)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
    || text.match(/(?:debited by|spent|charged|amounting to)\s*(?:inr|rs\.?|\$)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // 2. Extract Merchant / Beneficiary
  let merchant = '';
  // Patterns like: "to SWIGGY", "at AMAZON", "VPA swiggy@icici", "to VPA abc", "at STARBUCKS"
  const merchantMatch = text.match(/\b(?:to|at|info\/|towards)\s+([A-Za-z0-9\s&'.-]{2,30}?)(?:\s+(?:on|via|ref|using|dated|balance|avail|avl|\.|\n|$))/i)
    || text.match(/\b(?:vpa|upi\/)\s*([A-Za-z0-9._-]+)/i);

  if (merchantMatch) {
    merchant = merchantMatch[1]
      .replace(/^(vpa|upi)\s*/i, '')
      .replace(/[.\s]+$/, '')
      .trim();
  }

  if (!merchant) {
    // Look for words in quotes or capitalized merchant names
    const quotedMatch = text.match(/["']([^"']{2,25})["']/);
    if (quotedMatch) {
      merchant = quotedMatch[1].trim();
    }
  }

  // 3. Extract Account Name
  let accountName: string | null = null;
  const accountMatch = text.match(/\b([A-Za-z]+\s*Bank|Chase|Citi|Amex|Paytm|Google Pay|PhonePe|Card ending \d{4}|A\/C \w+)/i);
  if (accountMatch) {
    accountName = accountMatch[0].trim();
  }

  // 4. Infer Category
  let category = 'Other';
  if (isCredit) {
    category = 'Income';
  } else {
    const nlpResult = parseNLPExpense(`${merchant || ''} ${text}`, customCategories);
    category = nlpResult.category || 'Other';
  }

  return {
    amount: amount && !isNaN(amount) && amount > 0 ? amount : null,
    merchant: merchant || (isCredit ? 'Credit / Income' : 'Bank Transaction'),
    category,
    type: isCredit ? 'credit' : 'debit',
    accountName,
    date: format(new Date(), 'yyyy-MM-dd'),
    rawText: text,
  };
}

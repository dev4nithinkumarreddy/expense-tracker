import { format, subDays } from 'date-fns';

export interface ParsedNLPExpense {
  amount: number | null;
  description: string;
  category: string | null;
  date: string | null; // yyyy-MM-dd
  tags: string[];
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ['food', 'lunch', 'dinner', 'breakfast', 'brunch', 'snack', 'coffee', 'tea', 'cafe', 'restaurant', 'burger', 'pizza', 'swiggy', 'zomato', 'starbucks', 'subway', 'mcdonalds', 'kfc', 'biryani', 'bakery'],
  Grocery: ['grocery', 'groceries', 'supermarket', 'mart', 'blinkit', 'instamart', 'zepto', 'milk', 'veggies', 'vegetables', 'fruits', 'eggs', 'bread'],
  Fuel: ['fuel', 'petrol', 'diesel', 'gas', 'cng', 'shell', 'hpcl', 'bpcl', 'ioc'],
  Travel: ['travel', 'uber', 'ola', 'rapido', 'taxi', 'cab', 'flight', 'airline', 'train', 'metro', 'bus', 'fare', 'toll', 'parking'],
  Shopping: ['shopping', 'amazon', 'flipkart', 'myntra', 'zara', 'clothes', 'shoes', 'dress', 'shirt', 'electronics', 'gadget'],
  Entertainment: ['movie', 'movies', 'cinema', 'theatre', 'netflix', 'spotify', 'prime', 'game', 'gaming', 'concert', 'club', 'party', 'show'],
  Medical: ['medical', 'medicine', 'medicines', 'pharmacy', 'doctor', 'hospital', 'clinic', 'dentist', 'health', 'tablets', 'apollo'],
  Bills: ['bill', 'bills', 'electricity', 'water', 'wifi', 'internet', 'broadband', 'recharge', 'mobile', 'airtel', 'jio', 'rent', 'maintenance'],
  EMI: ['emi', 'loan', 'installment', 'credit card payment'],
  Income: ['salary', 'bonus', 'dividend', 'refund', 'interest', 'cashback', 'freelance', 'stipend'],
};

/**
 * Natural Language Expense Parser
 * Parses natural language input like:
 * "Dinner with Alex 450 #fun" -> amount 450, category Food, description "Dinner with Alex", tags ["#fun"]
 */
export function parseNLPExpense(input: string, customCategories?: string[]): ParsedNLPExpense {
  if (!input || !input.trim()) {
    return { amount: null, description: '', category: null, date: null, tags: [] };
  }

  let text = input.trim();

  // 1. Extract hashtags
  const tags: string[] = [];
  text = text.replace(/#([\w-]+)/g, (match) => {
    tags.push(match.toLowerCase());
    return '';
  });

  // 2. Extract Date (today, yesterday, day of week)
  let extractedDate: string | null = null;
  const today = new Date();
  
  if (/\byesterday\b/i.test(text)) {
    extractedDate = format(subDays(today, 1), 'yyyy-MM-dd');
    text = text.replace(/\byesterday\b/gi, '');
  } else if (/\btoday\b/i.test(text)) {
    extractedDate = format(today, 'yyyy-MM-dd');
    text = text.replace(/\btoday\b/gi, '');
  }

  // 3. Extract Amount
  // Matches ₹500, $45.50, Rs. 120, Rs 120, INR 800, 450.00, or standalone numbers
  let amount: number | null = null;
  
  // Find match with currency or numbers with decimals first
  const currencyMatch = text.match(/(?:₹|\$|€|£|rs\.?|inr)\s*(\d+(?:\.\d{1,2})?)/i);
  if (currencyMatch) {
    amount = parseFloat(currencyMatch[1]);
    text = text.replace(currencyMatch[0], '');
  } else {
    // Find numeric token
    const words = text.split(/\s+/);
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i].replace(/[^\d.]/g, '');
      const parsed = parseFloat(w);
      if (!isNaN(parsed) && parsed > 0 && /^\d+(\.\d{1,2})?$/.test(w)) {
        amount = parsed;
        words.splice(i, 1);
        text = words.join(' ');
        break;
      }
    }
  }

  // 4. Infer Category
  let inferredCategory: string | null = null;
  const lowerText = text.toLowerCase();

  // Check custom categories first
  if (customCategories && customCategories.length > 0) {
    for (const cat of customCategories) {
      if (lowerText.includes(cat.toLowerCase())) {
        inferredCategory = cat;
        break;
      }
    }
  }

  // Check keyword dictionary
  if (!inferredCategory) {
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(lowerText))) {
        inferredCategory = cat;
        break;
      }
    }
  }

  // 5. Clean up remaining description
  const cleanDescription = text
    .replace(/\s+/g, ' ')
    .replace(/^[-–—:,.\s]+|[-–—:,.\s]+$/g, '')
    .trim();

  return {
    amount,
    description: cleanDescription || (inferredCategory ? `${inferredCategory} Expense` : 'Expense'),
    category: inferredCategory,
    date: extractedDate || format(today, 'yyyy-MM-dd'),
    tags,
  };
}

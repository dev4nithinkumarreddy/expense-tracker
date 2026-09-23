import { describe, it, expect } from 'vitest';
import { parseNLPExpense } from './nlpExpenseParser';

describe('parseNLPExpense', () => {
  it('parses amount, category, and description from simple text', () => {
    const res = parseNLPExpense('Lunch at subway 250');
    expect(res.amount).toBe(250);
    expect(res.category).toBe('Food');
    expect(res.description.toLowerCase()).toContain('subway');
  });

  it('extracts hashtags as tags', () => {
    const res = parseNLPExpense('Uber ride 340 #travel #work');
    expect(res.amount).toBe(340);
    expect(res.category).toBe('Travel');
    expect(res.tags).toEqual(['#travel', '#work']);
  });

  it('handles currency symbols and decimals', () => {
    const res = parseNLPExpense('Starbucks coffee ₹180.50');
    expect(res.amount).toBe(180.5);
    expect(res.category).toBe('Food');
  });

  it('extracts yesterday date keyword', () => {
    const res = parseNLPExpense('Groceries 1200 yesterday');
    expect(res.amount).toBe(1200);
    expect(res.category).toBe('Grocery');
    expect(res.date).not.toBeNull();
  });

  it('recognizes salary/income keywords', () => {
    const res = parseNLPExpense('Freelance payment salary 45000');
    expect(res.amount).toBe(45000);
    expect(res.category).toBe('Income');
  });
});

export function formatCurrency(amount: number, currencySymbol: string, privacyMode: boolean = false): string {
  if (privacyMode) return `${currencySymbol}****`;
  return `${currencySymbol}${amount.toLocaleString()}`;
}

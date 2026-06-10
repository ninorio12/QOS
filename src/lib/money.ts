// Devise par défaut du SaaS = CHF. fmtMoney accepte une devise pour les cas (ex. contrat) où elle est choisie.
export const DEFAULT_CURRENCY = 'CHF'
const SYMBOLS: Record<string, string> = { CHF: 'CHF', EUR: 'CHF', USD: '$', GBP: '£' }
export function currencySymbol(c: string = DEFAULT_CURRENCY): string { return SYMBOLS[c] ?? c }
export function fmtMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return `${Math.round(amount || 0).toLocaleString('fr-CH')} ${currencySymbol(currency)}`
}

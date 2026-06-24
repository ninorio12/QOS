// Devise par défaut du SaaS = CHF. fmtMoney accepte une devise pour les cas (ex. contrat) où elle est choisie.
export const DEFAULT_CURRENCY = 'CHF'
// Mono-devise CHF : toute devise retombe sur 'CHF'.
const SYMBOLS: Record<string, string> = { CHF: 'CHF' }
export function currencySymbol(_c: string = DEFAULT_CURRENCY): string { return SYMBOLS.CHF }
export function fmtMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return `${Math.round(amount || 0).toLocaleString('fr-CH')} ${currencySymbol(currency)}`
}

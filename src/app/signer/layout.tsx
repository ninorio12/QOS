import type { Viewport } from 'next'

// Page publique de signature : toujours en clair. `color-scheme: light` empêche
// l'assombrissement automatique des navigateurs (Chrome Auto Dark Theme, etc.).
export const viewport: Viewport = {
  colorScheme: 'light',
}

export default function SignerLayout({ children }: { children: React.ReactNode }) {
  return children
}

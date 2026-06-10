import {
  LayoutDashboard, GitMerge, Users, PhoneCall, TrendingUp, Rocket, CreditCard,
  CalendarDays, Library, BotMessageSquare, CheckSquare, ScrollText, Database,
  Wallet, Plug, Settings, type LucideIcon,
} from 'lucide-react'

export type ModuleDef = { href: string; label: string; icon: LucideIcon; group: string }

// Registre unique des modules mobile — reflète la sidebar web (aucun module inventé).
// Utilisé par la bottom-nav (favoris), la page « Tout » et la personnalisation.
export const MODULES: ModuleDef[] = [
  { href: '/dashboard',          label: 'Tableau de bord',      icon: LayoutDashboard,  group: 'Acquisition' },
  { href: '/pipeline',           label: 'Pipeline',             icon: GitMerge,         group: 'Acquisition' },
  { href: '/contacts',           label: 'Contacts',             icon: Users,            group: 'Acquisition' },
  { href: '/prospection',        label: 'Prospection',          icon: PhoneCall,        group: 'Acquisition' },
  { href: '/performance',        label: 'Performance',          icon: TrendingUp,       group: 'Acquisition' },
  { href: '/onboarding',         label: 'Onboarding',           icon: Rocket,           group: 'Acquisition' },
  { href: '/paiement',           label: 'Paiement',             icon: CreditCard,       group: 'Acquisition' },
  { href: '/calendrier',         label: 'Calendrier',           icon: CalendarDays,     group: 'Acquisition' },
  { href: '/bibliotheque/data',  label: 'Bibliothèque',         icon: Library,          group: 'Acquisition' },
  { href: '/equipe',             label: 'Équipe IA',            icon: BotMessageSquare, group: 'Agentique' },
  { href: '/taches',             label: 'Tâches',               icon: CheckSquare,      group: 'Agentique' },
  { href: '/logs',               label: 'Activités',            icon: ScrollText,       group: 'Agentique' },
  { href: '/knowledge',          label: 'Base de connaissance', icon: Database,         group: 'Agentique' },
  { href: '/budget',             label: 'Budget',               icon: Wallet,           group: 'Configuration' },
  { href: '/integrations',       label: 'Intégrations',         icon: Plug,             group: 'Configuration' },
  { href: '/parametres',         label: 'Paramètres',           icon: Settings,         group: 'Configuration' },
]

export const GROUP_ORDER = ['Acquisition', 'Agentique', 'Configuration'] as const

export const DEFAULT_FAVORITES = ['/dashboard', '/pipeline', '/contacts', '/prospection']
export const FAV_KEY = 'dataos:navFavorites'
export const FAV_EVENT = 'dataos:navFavorites:changed'

export function readFavorites(): string[] {
  if (typeof window === 'undefined') return DEFAULT_FAVORITES
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (!raw) return DEFAULT_FAVORITES
    const arr = JSON.parse(raw) as string[]
    const valid = arr.filter(h => MODULES.some(m => m.href === h)).slice(0, 4)
    return valid.length === 4 ? valid : DEFAULT_FAVORITES
  } catch { return DEFAULT_FAVORITES }
}

export function writeFavorites(hrefs: string[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(hrefs.slice(0, 4)))
    window.dispatchEvent(new Event(FAV_EVENT))
  } catch { /* noop */ }
}

export const moduleByHref = (href: string) => MODULES.find(m => m.href === href)

// Permission par module — miroir du `canSee` de la sidebar web (comptes restreints).
// Paramètres reste toujours accessible ; Bibliothèque visible si une sous-route l'est.
export function canSeeModule(href: string, isAdmin: boolean, allowedModules?: string[]): boolean {
  if (isAdmin) return true
  if (href === '/parametres') return true
  const allowed = allowedModules ?? []
  if (href.startsWith('/bibliotheque')) return allowed.some(a => a.startsWith('/bibliotheque'))
  return allowed.includes(href)
}

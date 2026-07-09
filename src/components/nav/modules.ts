import {
  LayoutDashboard, GitMerge, Users, Building2, PhoneCall, TrendingUp, Gauge, Rocket, CreditCard,
  CalendarDays, CalendarClock, HardDrive, FolderOpen, ListChecks, BotMessageSquare, CheckSquare,
  ScrollText, Database, Wallet, Plug, Settings, Megaphone, type LucideIcon,
} from 'lucide-react'

export type ModuleDef = { href: string; label: string; icon: LucideIcon; group: string }

// Registre unique des modules mobile — reflète la sidebar web (aucun module inventé).
// Utilisé par la bottom-nav (favoris), la page « Tout » et la personnalisation.
export const MODULES: ModuleDef[] = [
  { href: '/dashboard',          label: 'Tableau de bord',      icon: LayoutDashboard,  group: 'Acquisition' },
  { href: '/pipeline',           label: 'Pipeline Leads',       icon: GitMerge,         group: 'Acquisition' },
  { href: '/pipeline/clients',   label: 'Pipeline Clients',     icon: Building2,        group: 'Acquisition' },
  { href: '/contacts',           label: 'Contacts',             icon: Users,            group: 'Acquisition' },
  { href: '/prospection',        label: 'Prospection',          icon: PhoneCall,        group: 'Acquisition' },
  { href: '/closing',            label: 'Closing',              icon: CheckSquare,      group: 'Acquisition' },
  { href: '/performance',        label: 'Suivi Setting',         icon: Gauge,            group: 'Pilotage' },
  { href: '/cockpit',            label: 'Performance',          icon: TrendingUp,       group: 'Pilotage' },
  { href: '/media-buyer',        label: 'Meta Ads',             icon: Megaphone,        group: 'Pilotage' },
  { href: '/onboarding',         label: 'Onboarding',           icon: Rocket,           group: 'Pilotage' },
  { href: '/paiement',           label: 'Paiement',             icon: CreditCard,       group: 'Pilotage' },
  { href: '/calendrier',         label: 'Calendrier',           icon: CalendarDays,     group: 'Pilotage' },
  { href: '/reservations',       label: 'Réservations',         icon: CalendarClock,    group: 'Pilotage' },
  { href: '/bibliotheque/data',    label: 'Data',               icon: HardDrive,        group: 'Bibliothèque' },
  { href: '/bibliotheque/records', label: 'Records',            icon: FolderOpen,       group: 'Bibliothèque' },
  { href: '/bibliotheque/process', label: 'Process',            icon: ListChecks,       group: 'Bibliothèque' },
  { href: '/equipe',             label: 'Équipe IA',            icon: BotMessageSquare, group: 'Agentique' },
  { href: '/taches',             label: 'Tâches',               icon: CheckSquare,      group: 'Agentique' },
  { href: '/logs',               label: 'Activités',            icon: ScrollText,       group: 'Agentique' },
  { href: '/knowledge',          label: 'Base de connaissance', icon: Database,         group: 'Agentique' },
  { href: '/budget',             label: 'Budget',               icon: Wallet,           group: 'Configuration' },
  { href: '/integrations',       label: 'Intégrations',         icon: Plug,             group: 'Configuration' },
  { href: '/parametres',         label: 'Paramètres',           icon: Settings,         group: 'Configuration' },
]

export const GROUP_ORDER = ['Acquisition', 'Pilotage', 'Bibliothèque', 'Agentique', 'Configuration'] as const

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

// Permission par module — miroir EXACT du `canSee` de la sidebar web et de ModuleGuard.
// Chaque sous-module Bibliothèque (Data/Records/Process) est gardé individuellement :
// un compte n'ayant que /bibliotheque/process ne voit QUE Process (et son lien y mène,
// pas vers /bibliotheque/data qui le ferait rebondir). Paramètres toujours accessible.
export function canSeeModule(href: string, isAdmin: boolean, allowedModules?: string[]): boolean {
  if (isAdmin) return true
  if (href === '/parametres') return true
  return (allowedModules ?? []).includes(href)
}

// Première route accessible pour un compte — cible d'atterrissage (post-login, logo,
// redirection du garde). Admin OU compte non-restreint (allowedModules ABSENT/non-tableau
// = ligne héritée sans restriction, cf. ModuleGuard) → accès complet → /dashboard.
// IMPORTANT : la cible doit être *exactement* présente dans allowedModules (le garde
// fait un includes exact) — sinon /bibliotheque/data renverrait vers lui-même en boucle
// pour un compte n'ayant que /bibliotheque/records. On ne passe donc PAS par canSeeModule
// (qui élargit via startsWith). Repli /parametres (toujours accessible).
export function firstAllowedRoute(isAdmin: boolean, allowedModules?: string[]): string {
  if (isAdmin || !Array.isArray(allowedModules)) return '/dashboard'
  const ordered = MODULES.find(m => allowedModules.includes(m.href))
  if (ordered) return ordered.href
  const biblio = allowedModules.find(h => h.startsWith('/bibliotheque'))
  if (biblio) return biblio
  return '/parametres'
}

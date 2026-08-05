'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { useSafeClerk } from '@/lib/clerkSafe'
import {
  LayoutDashboard, GitMerge, Users, MessageSquare, CalendarDays,
  TrendingUp, Gauge, BotMessageSquare, CheckSquare,
  ScrollText, Database, Wallet, Settings, LogOut, GitBranch, FileText,
  Radio, ChevronDown, ChevronLeft, ChevronRight, Library, FolderOpen, HardDrive, ListChecks, Users2, CreditCard, Rocket, Plug, PhoneCall,
  Megaphone, Building2,
} from 'lucide-react'
import Image from 'next/image'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { firstAllowedRoute } from '@/components/nav/modules'

type NavItem = { href: string; icon: React.ElementType; label: string; also?: string[]; exclude?: string[] }

const PREFETCH_MAP: Record<string, string> = {
  '/dashboard':     '/api/dashboard',
  '/calendrier':    '/api/calendrier',
}

const prefetchFetcher = async (url: string) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`API ${url} failed:`, response.status)
      return null
    }
    const text = await response.text()
    if (!text) {
      console.warn(`API ${url} returned empty response`)
      return null
    }
    return JSON.parse(text)
  } catch (error) {
    console.warn(`API ${url} error:`, error)
    return null
  }
}

const ACQUISITION_PRE: NavItem[] = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Tableau de bord' },
]

const ACQUISITION_POST: NavItem[] = [
  { href: '/contacts',      icon: Users,           label: 'Contacts' },
  { href: '/prospection',   icon: PhoneCall,       label: 'Prospection' },
  { href: '/closing',       icon: CheckSquare,     label: 'Closing' },
]

// Pilotage — suivi & delivery (sorti d'Acquisition).
const PILOTAGE: NavItem[] = [
  { href: '/performance',   icon: Gauge,           label: 'Suivi Setting' },
  { href: '/cockpit',       icon: TrendingUp,      label: 'Performance' },
  { href: '/media-buyer',   icon: Megaphone,       label: 'Meta Ads' },
  { href: '/onboarding',    icon: Rocket,          label: 'Onboarding' },
  { href: '/paiement',      icon: CreditCard,      label: 'Paiement' },
  { href: '/calendrier',    icon: CalendarDays,    label: 'Calendrier' },
]

const BIBLIOTHEQUES: NavItem[] = [
  { href: '/bibliotheque/data',       icon: HardDrive,   label: 'Data'       },
  { href: '/bibliotheque/records',    icon: FolderOpen,  label: 'Records'    },
  { href: '/bibliotheque/process',    icon: ListChecks,  label: 'Process'    },
]

const AGENTIQUE: NavItem[] = [
{ href: '/equipe',        icon: BotMessageSquare, label: 'Équipe IA' },
  { href: '/taches',        icon: CheckSquare,      label: 'Tâches' },
  { href: '/logs',          icon: ScrollText,       label: 'Activités' },
  { href: '/knowledge',     icon: Database,         label: 'Base de connaissance' },
]

const CONFIGURATION: NavItem[] = [
  { href: '/budget',    icon: Wallet,    label: 'Budget' },
  { href: '/integrations', icon: Plug,   label: 'Intégrations' },
]

function SectionLabel({ label, collapsed = false }: { label: string; collapsed?: boolean }) {
  // Titre de groupe BIEN VISIBLE (pas de clip). Marge au-dessus = séparation claire des groupes.
  // Même hauteur dans les 2 états (texte OU trait) → les icônes en dessous ne bougent pas.
  // Replié : PAS de trait, juste l'espace (la boîte garde sa hauteur) → les groupes restent séparés.
  return (
    <div className="mt-1.5 mb-0.5 px-3 h-[12px] flex items-end">
      {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 whitespace-nowrap leading-none">{label}</p>}
    </div>
  )
}

function NavLink({ item, pathname, collapsed = false }: { item: NavItem; pathname: string; collapsed?: boolean }) {
  const { href, icon: Icon, label, also = [], exclude = [] } = item
  const { mutate, cache } = useSWRConfig()
  const router = useRouter()
  const active =
    !exclude.some(e => pathname.startsWith(e)) && (
      pathname === href ||
      (href !== '/dashboard' && pathname.startsWith(href)) ||
      also.some(a => pathname.startsWith(a))
    )

  function handleMouseEnter() {
    const endpoint = PREFETCH_MAP[href]
    if (!endpoint) return
    if ((cache as Map<string, unknown>).get(endpoint)) return
    void mutate(endpoint, prefetchFetcher(endpoint))
  }

  function handleClick(e: React.MouseEvent) {
    if (active) {
      e.preventDefault()
      router.refresh()
    }
  }

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      title={collapsed ? label : undefined}
      className={`
        group relative flex items-center h-9 rounded-[10px] transition-[padding,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${collapsed ? 'justify-center px-0' : 'px-3'}
        ${active ? 'text-white' : 'text-white/60 hover:text-white'}
      `}
    >
      {/* Fond du sélecteur (découplé de la ligne). Actif = orange ; survol = gris léger.
          MÊME forme dans les 2 cas : carré arrondi en replié, fine barre en déplié. Régler ici (w/h). */}
      {active ? (
        <span aria-hidden className={`absolute z-0 bg-[#FF4D00] shadow-sm top-1/2 -translate-y-1/2 ${collapsed ? 'left-1/2 -translate-x-1/2 w-[26px] h-[26px] rounded-[9px]' : 'inset-x-1 h-[26px] rounded-[8px]'}`} />
      ) : (
        <span aria-hidden className={`absolute z-0 bg-white/[0.07] opacity-0 group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2 ${collapsed ? 'left-1/2 -translate-x-1/2 w-[26px] h-[26px] rounded-[9px]' : 'inset-x-1 h-[26px] rounded-[8px]'}`} />
      )}
      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className="relative z-10 flex-shrink-0" />
      <span className={`relative z-10 text-[12.5px] font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[160px] opacity-100 ml-2.5'}`}>{label}</span>
    </Link>
  )
}

function BibliothequeNav({ pathname }: { pathname: string }) {
  const onBiblio = pathname.startsWith('/bibliotheque')
  const dataActive    = pathname.startsWith('/bibliotheque/data') || (onBiblio && !pathname.startsWith('/bibliotheque/records') && !pathname.startsWith('/bibliotheque/process'))
  const recordsActive = pathname.startsWith('/bibliotheque/records')
  const processActive  = pathname.startsWith('/bibliotheque/process')

  const SUBS = [
    { href: '/bibliotheque/data',       label: 'Data',       active: dataActive    },
    { href: '/bibliotheque/records',    label: 'Records',    active: recordsActive },
    { href: '/bibliotheque/process',    label: 'Process',    active: processActive },
  ]

  return (
    <>
      <Link
        href="/bibliotheque/data"
        className={`
          flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150
          ${onBiblio
            ? 'bg-[#FF4D00] text-white shadow-sm'
            : 'text-white/50 hover:text-white/90 hover:bg-soren-card/8'
          }
        `}
      >
        <Library size={13} strokeWidth={onBiblio ? 2.5 : 1.8} className="flex-shrink-0" />
        <span className="text-[12px] truncate flex-1 font-medium">Bibliothèque</span>
        {onBiblio && <ChevronDown size={10} className="flex-shrink-0 text-white/60" />}
      </Link>

      {onBiblio && (
        <div className="ml-4 flex flex-col gap-0.5 mt-0.5">
          {SUBS.map(({ href, label, active }) => (
            <Link key={href} href={href} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition-all duration-150 ${
              active ? 'bg-white/10 text-white font-medium' : 'text-white/40 font-medium hover:text-white/70 hover:bg-white/5'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${active ? 'bg-[#FF4D00]' : 'bg-white/20'}`} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function PipelineNav({ pathname }: { pathname: string }) {
  const router = useRouter()
  const onPipeline = pathname.startsWith('/pipeline')
  // Un seul module : Leads et Clients ne sont plus deux entrées, c'est le MÊME
  // parcours. Les colonnes vont du premier contact au consulting, sans rupture.
  return (
    <button
      onClick={() => router.push('/pipeline')}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-150 ${
        onPipeline
          ? 'bg-[#FF4D00] text-white shadow-sm'
          : 'text-white/50 hover:text-white/90 hover:bg-soren-card/8'
      }`}
    >
      <GitMerge size={13} strokeWidth={onPipeline ? 2.5 : 1.8} className="flex-shrink-0" />
      <span className="text-[12px] truncate flex-1 text-left font-medium">Pipeline</span>
    </button>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const { me, isAdmin, isLoaded } = useCurrentUser()
  const { signOut } = useSafeClerk()

  const displayName = me?.name || 'Utilisateur'
  const avatarUrl = me?.avatarUrl
  const canSee = (href: string) => isAdmin || (me?.allowedModules ?? []).includes(href)
  const visible = (items: NavItem[]) => items.filter(i => canSee(i.href))
  // Logo → 1ʳᵉ page accessible (jamais /dashboard si le compte ne l'a pas).
  const homeHref = firstAllowedRoute(isAdmin, me?.allowedModules)

  // Sidebar repliée (icônes seules) — persistée + reflétée sur <html data-sidebar> pour décaler
  // le contenu (main) et le header via CSS (cf. globals.css).
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const c = typeof window !== 'undefined' && localStorage.getItem('vf-sidebar-collapsed') === '1'
    setCollapsed(c)
    document.documentElement.dataset.sidebar = c ? 'collapsed' : 'expanded'
  }, [])
  const toggleCollapsed = () => setCollapsed(c => {
    const n = !c
    try { localStorage.setItem('vf-sidebar-collapsed', n ? '1' : '0') } catch { /* noop */ }
    document.documentElement.dataset.sidebar = n ? 'collapsed' : 'expanded'
    return n
  })

  const acquisitionPre = visible(ACQUISITION_PRE)
  const acquisitionPost = visible(ACQUISITION_POST)
  const pilotage = visible(PILOTAGE)
  const bibliotheques = visible(BIBLIOTHEQUES)
  const agentique = visible(AGENTIQUE)
  const configuration = visible(CONFIGURATION)
  const showAcquisition = acquisitionPre.length > 0 || acquisitionPost.length > 0 || canSee('/pipeline')

  // Pendant le chargement (Clerk pas prêt OU profil Convex en attente) : squelette
  // sobre — logo immédiat + lignes shimmer — au lieu d'un fond noir vide qui fait
  // "pas chargé". La transition vers les vrais liens est alors invisible.
  if (!isLoaded || me === undefined) return (
    <aside className="fixed left-3 top-3 bottom-3 w-52 bg-soren-sidebar rounded-2xl flex flex-col z-50 overflow-hidden shadow-xl">
      <Link href={homeHref} className="flex items-center gap-2.5 px-4 pt-4 pb-2.5 flex-shrink-0">
        <Image src="/vividflow-logo.png" alt="VividFlow" width={32} height={32} priority className="object-contain rounded-xl flex-shrink-0 shadow-md" />
        <span className="text-white font-sans font-bold text-[16px] tracking-[-0.01em]">VividFlow</span>
      </Link>
      <div className="mx-3 h-px bg-soren-card/8 flex-shrink-0" />
      <div className="flex flex-col gap-1.5 px-3 pt-3 animate-pulse">
        {[14, 9, 10, 8, 12, 9, 7, 11, 8].map((w, i) => (
          <div key={i} className={`h-7 rounded-xl bg-white/5 ${w === 7 ? 'mt-3' : ''}`} style={{ width: `${Math.min(w * 6 + 20, 92)}%` }} />
        ))}
      </div>
    </aside>
  )

  return (
    <aside className={`fixed left-3 top-3 bottom-3 ${collapsed ? 'w-20' : 'w-52'} bg-soren-sidebar rounded-2xl flex flex-col z-50 overflow-hidden shadow-xl transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}>
      {/* En-tête, hauteur FIXE h-[72px] dans les 2 états → nav alignée. Le toggle « ‹ / › » est TOUJOURS
          à droite. Replié : logo CENTRÉ (le toggle, en absolu à droite, ne le décale pas). */}
      <div className="relative flex items-center h-[56px] px-3.5 flex-shrink-0">
        <Link href={homeHref} className={`flex items-center gap-2 min-w-0 ${collapsed ? 'mx-auto' : ''}`}>
          <Image src="/vividflow-logo.png" alt="VividFlow" width={24} height={24} priority className="object-contain rounded-lg flex-shrink-0 shadow-md" />
          {!collapsed && <span className="text-white font-sans font-semibold text-[14px] tracking-[-0.01em] whitespace-nowrap">VividFlow</span>}
        </Link>
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
          title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
          className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/10 transition-colors ${collapsed ? 'right-1 w-5 h-6' : 'right-3 w-7 h-7'}`}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="mx-3 h-px bg-soren-card/8 flex-shrink-0" />

      {/* Nav */}
      <div className="relative flex-1 min-h-0 flex flex-col">
      <nav ref={navRef} className="flex flex-col flex-1 gap-2 px-2 pt-1 pb-8 overflow-y-auto sidebar-nav">
        {showAcquisition && <SectionLabel label="Acquisition" collapsed={collapsed} />}
        {acquisitionPre.map(item => <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />)}
        {/* Une seule entrée : Leads et Clients sont deux rangées du même écran. */}
        {canSee('/pipeline') && <NavLink item={{ href: '/pipeline', icon: GitMerge, label: 'Pipeline' }} pathname={pathname} collapsed={collapsed} />}
        {acquisitionPost.map(item => <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />)}

        {pilotage.length > 0 && <>
          <SectionLabel label="Pilotage" collapsed={collapsed} />
          {pilotage.map(item => <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />)}
        </>}

        {bibliotheques.length > 0 && <>
          <SectionLabel label="Bibliothèques" collapsed={collapsed} />
          {bibliotheques.map(item => <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />)}
        </>}

        {isAdmin && agentique.length > 0 && (
          <>
            <SectionLabel label="Agentique" collapsed={collapsed} />
            {agentique.map(item => <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />)}
          </>
        )}

        {!isAdmin && canSee('/taches') && (
          <>
            <SectionLabel label="Agents" collapsed={collapsed} />
            <NavLink item={{ href: '/taches', icon: CheckSquare, label: 'Tâches' }} pathname={pathname} collapsed={collapsed} />
          </>
        )}

        {isAdmin && configuration.length > 0 && (
          <>
            <SectionLabel label="Configuration" collapsed={collapsed} />
            {configuration.map(item => <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />)}
          </>
        )}
      </nav>
      {/* Bottom fade — couleur exacte de la sidebar, ancré au bas de la zone scrollable (pas de décalage) */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-sidebar))' }}
      />
      </div>

      {/* Avatar + Logout */}
      <div className="mx-3 h-px bg-soren-card/8 flex-shrink-0" />
      <div className={`flex-shrink-0 ${collapsed ? 'px-2 py-2.5 flex flex-col items-center gap-1.5' : 'px-3 py-2.5'}`}>
        {collapsed ? (
          <>
            {/* Replié : déconnexion AU-DESSUS de l'avatar */}
            <button
              onClick={() => { void signOut().finally(() => { window.location.href = '/login' }) }}
              aria-label="Se déconnecter" title="Se déconnecter"
              className="w-7 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-soren-card/8 transition-colors"
            >
              <LogOut size={13} />
            </button>
            <Link href="/parametres" title={displayName} className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-[#FF4D00]">
              {avatarUrl
                ? <img src={avatarUrl} alt="profil" className="w-full h-full object-cover" />
                : <span className="text-[12px] font-bold text-[#111111]">{displayName[0]?.toUpperCase() ?? 'U'}</span>}
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link href="/parametres" className="flex items-center gap-2.5 min-w-0 flex-1 group">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#FF4D00]">
                {avatarUrl
                  ? <img src={avatarUrl} alt="profil" className="w-full h-full object-cover" />
                  : <span className="text-[11px] font-bold text-[#111111]">{displayName[0]?.toUpperCase() ?? 'U'}</span>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-[12px] font-semibold truncate group-hover:text-white/90 transition-colors">{displayName}</p>
                <p className="text-white/40 text-[10px] capitalize truncate">{me?.role ?? '—'}</p>
              </div>
            </Link>
            <button
              onClick={() => { void signOut().finally(() => { window.location.href = '/login' }) }}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-soren-card/8 transition-colors flex-shrink-0"
            >
              <LogOut size={12} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

# Soren Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer une version mobile-first de Soren accessible à `/m/*` dans le projet existant, avec bottom navigation, design adapté mobile, et connexion aux APIs existantes.

**Architecture:** Nouveau route group `src/app/m/` dans le projet Next.js existant (`C:\Users\thoma\qos`). Même auth Supabase, mêmes API routes, nouveau layout mobile avec bottom navigation. Zéro duplication de logique backend — tout passe par les API routes existantes via `fetch` côté client (SWR).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, SWR, Lucide React — aucune nouvelle dépendance requise.

---

## File Structure

```
src/app/m/
  layout.tsx                    # Mobile root layout (MobileShell)
  page.tsx                      # Redirect → /m/home
  home/page.tsx                 # Dashboard KPIs + activité récente
  conversations/
    page.tsx                    # Liste conversations
    [id]/page.tsx               # Thread + composer
  contacts/
    page.tsx                    # Liste contacts + search
    [id]/page.tsx               # Détail contact
  pipeline/page.tsx             # Liste opportunités
  calendrier/page.tsx           # RDV à venir
  agents/page.tsx               # Équipe IA (Soren/Kai/Mia)
  devis/page.tsx                # Liste devis
  parametres/page.tsx           # Paramètres + profil

src/components/mobile/
  shell/
    MobileShell.tsx             # Wrapper: TopBar + {children} + BottomNav
    TopBar.tsx                  # Header contextuel par page
    BottomNav.tsx               # Bottom nav 5 tabs
  home/
    KpiCard.tsx                 # Carte métrique (valeur + label + icône)
    AgentStatusRow.tsx          # Ligne statut agent (nom + actif/inactif)
    QuickActions.tsx            # Actions rapides (3 boutons)
    RecentActivity.tsx          # Liste 5 dernières conversations
  conversations/
    ConvRow.tsx                 # Ligne conversation (avatar + nom + last msg + badge)
    ThreadView.tsx              # Affichage thread messages
    Composer.tsx                # Barre de saisie message
  contacts/
    ContactRow.tsx              # Ligne contact (avatar + nom + tel + source)
    ContactDetail.tsx           # Carte détail contact
  pipeline/
    OppRow.tsx                  # Ligne opportunité (nom + stage + valeur + statut)
  calendrier/
    EventRow.tsx                # Ligne RDV (heure + titre + contact)
  agents/
    AgentCard.tsx               # Carte agent (couleur + nom + statut + stats)
  devis/
    DevisRow.tsx                # Ligne devis (contact + montant + statut + date)
  shared/
    Avatar.tsx                  # Avatar initiales coloré
    Badge.tsx                   # Badge statut coloré
    EmptyState.tsx              # État vide avec icône + message
    Spinner.tsx                 # Loader
    SearchBar.tsx               # Barre de recherche mobile
```

---

## Task 1: Mobile Shell — Layout + Bottom Navigation

**Files:**
- Create: `src/components/mobile/shell/BottomNav.tsx`
- Create: `src/components/mobile/shell/TopBar.tsx`
- Create: `src/components/mobile/shell/MobileShell.tsx`
- Create: `src/app/m/layout.tsx`
- Create: `src/app/m/page.tsx`

- [ ] **Step 1: Créer BottomNav.tsx**

```tsx
// src/components/mobile/shell/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageSquare, Users, Bot, MoreHorizontal } from 'lucide-react'

const TABS = [
  { href: '/m/home',          icon: Home,           label: 'Accueil' },
  { href: '/m/conversations', icon: MessageSquare,  label: 'Messages' },
  { href: '/m/contacts',      icon: Users,          label: 'Contacts' },
  { href: '/m/agents',        icon: Bot,            label: 'Agents' },
  { href: '/m/parametres',    icon: MoreHorizontal, label: 'Plus' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
                  className="flex flex-col items-center gap-0.5 flex-1 py-2">
              <span className={`p-1.5 rounded-xl transition-colors ${
                active ? 'bg-[#3462EE]/10' : ''
              }`}>
                <Icon size={22} className={active ? 'text-[#3462EE]' : 'text-gray-400'} />
              </span>
              <span className={`text-[10px] font-medium ${
                active ? 'text-[#3462EE]' : 'text-gray-400'
              }`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Créer TopBar.tsx**

```tsx
// src/components/mobile/shell/TopBar.tsx
'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell } from 'lucide-react'

interface TopBarProps {
  title: string
  showBack?: boolean
  right?: React.ReactNode
}

export default function TopBar({ title, showBack, right }: TopBarProps) {
  const router = useRouter()
  return (
    <header className="fixed top-0 left-0 right-0 bg-[#EEF0EB] z-40"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center h-14 px-4 gap-3">
        {showBack && (
          <button onClick={() => router.back()}
                  className="p-2 -ml-2 rounded-xl hover:bg-black/5">
            <ArrowLeft size={20} className="text-[#111111]" />
          </button>
        )}
        <h1 className="flex-1 text-[17px] font-semibold text-[#111111] tracking-[-0.3px]">
          {title}
        </h1>
        {right ?? (
          <button className="p-2 rounded-xl hover:bg-black/5 relative">
            <Bell size={20} className="text-[#111111]" />
          </button>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Créer MobileShell.tsx**

```tsx
// src/components/mobile/shell/MobileShell.tsx
import BottomNav from './BottomNav'

interface MobileShellProps {
  children: React.ReactNode
}

export default function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="min-h-screen bg-[#EEF0EB]">
      {/* Content zone: top padding 56px (TopBar) + bottom padding 64px (BottomNav) */}
      <main className="pt-14 pb-20 min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Créer layout.tsx mobile**

```tsx
// src/app/m/layout.tsx
import MobileShell from '@/components/mobile/shell/MobileShell'

export const metadata = {
  title: 'Soren',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>
}
```

- [ ] **Step 5: Créer page.tsx (redirect)**

```tsx
// src/app/m/page.tsx
import { redirect } from 'next/navigation'
export default function MobilePage() {
  redirect('/m/home')
}
```

- [ ] **Step 6: Commit**

```bash
rtk git add src/app/m/ src/components/mobile/shell/
rtk git commit -m "feat(mobile): scaffold mobile shell with bottom nav + topbar"
```

---

## Task 2: Shared Mobile Components

**Files:**
- Create: `src/components/mobile/shared/Avatar.tsx`
- Create: `src/components/mobile/shared/Badge.tsx`
- Create: `src/components/mobile/shared/EmptyState.tsx`
- Create: `src/components/mobile/shared/Spinner.tsx`
- Create: `src/components/mobile/shared/SearchBar.tsx`

- [ ] **Step 1: Avatar.tsx**

```tsx
// src/components/mobile/shared/Avatar.tsx
interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

const COLORS = ['#4A91A8','#3462EE','#1A5C38','#E8836A','#9C59B6','#E67E22']

function colorFromName(name: string): string {
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

const SIZE = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' }

export default function Avatar({ name, size = 'md', color }: AvatarProps) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const bg = color ?? colorFromName(name)
  return (
    <div className={`${SIZE[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
         style={{ backgroundColor: bg }}>
      {initials}
    </div>
  )
}
```

- [ ] **Step 2: Badge.tsx**

```tsx
// src/components/mobile/shared/Badge.tsx
interface BadgeProps {
  label: string
  variant?: 'lime' | 'blue' | 'red' | 'gray' | 'green' | 'orange'
}

const VARIANTS = {
  lime:   'bg-[#E2FF8D] text-[#1A5C38]',
  blue:   'bg-[#3462EE]/10 text-[#3462EE]',
  red:    'bg-red-100 text-red-700',
  gray:   'bg-gray-100 text-gray-600',
  green:  'bg-emerald-100 text-emerald-700',
  orange: 'bg-orange-100 text-orange-700',
}

export default function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${VARIANTS[variant]}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 3: EmptyState.tsx**

```tsx
// src/components/mobile/shared/EmptyState.tsx
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
}

export default function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm">
        <Icon size={28} className="text-gray-300" />
      </div>
      <p className="text-[15px] font-semibold text-[#111111]">{title}</p>
      {subtitle && <p className="text-[13px] text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Spinner.tsx**

```tsx
// src/components/mobile/shared/Spinner.tsx
export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="w-8 h-8 border-2 border-[#3462EE]/20 border-t-[#3462EE] rounded-full animate-spin" />
    </div>
  )
}
```

- [ ] **Step 5: SearchBar.tsx**

```tsx
// src/components/mobile/shared/SearchBar.tsx
'use client'
import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Rechercher...' }: SearchBarProps) {
  return (
    <div className="relative mx-4 mb-3">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-4 bg-white rounded-2xl text-[14px] text-[#111111]
                   placeholder:text-gray-400 outline-none border border-transparent
                   focus:border-[#3462EE]/30 shadow-sm"
      />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/mobile/shared/
rtk git commit -m "feat(mobile): shared components — Avatar, Badge, EmptyState, Spinner, SearchBar"
```

---

## Task 3: Home — Dashboard Mobile

**Files:**
- Create: `src/components/mobile/home/KpiCard.tsx`
- Create: `src/components/mobile/home/AgentStatusRow.tsx`
- Create: `src/components/mobile/home/QuickActions.tsx`
- Create: `src/components/mobile/home/RecentActivity.tsx`
- Create: `src/app/m/home/page.tsx`

- [ ] **Step 1: KpiCard.tsx**

```tsx
// src/components/mobile/home/KpiCard.tsx
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor: string
  iconBg: string
  sub?: string
}

export default function KpiCard({ label, value, icon: Icon, iconColor, iconBg, sub }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex-1 min-w-0">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-medium text-gray-400 leading-tight">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p className="text-[22px] font-bold text-[#111111] tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 2: AgentStatusRow.tsx**

```tsx
// src/components/mobile/home/AgentStatusRow.tsx
interface AgentStatusRowProps {
  name: string
  role: string
  color: string
  active: boolean
}

export default function AgentStatusRow({ name, role, color, active }: AgentStatusRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[13px] font-bold shrink-0"
           style={{ backgroundColor: color }}>
        {name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#111111]">{name}</p>
        <p className="text-[12px] text-gray-400">{role}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
        <span className={`text-[12px] font-medium ${active ? 'text-emerald-600' : 'text-gray-400'}`}>
          {active ? 'Actif' : 'En veille'}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: QuickActions.tsx**

```tsx
// src/components/mobile/home/QuickActions.tsx
'use client'
import Link from 'next/link'
import { UserPlus, MessageSquarePlus, FileText } from 'lucide-react'

const ACTIONS = [
  { href: '/contacts',      icon: UserPlus,        label: 'Contact',    bg: 'bg-[#3462EE]/10', color: 'text-[#3462EE]' },
  { href: '/conversations', icon: MessageSquarePlus, label: 'Message',  bg: 'bg-[#4A91A8]/10', color: 'text-[#4A91A8]' },
  { href: '/devis',         icon: FileText,         label: 'Devis',     bg: 'bg-[#E8836A]/10', color: 'text-[#E8836A]' },
]

export default function QuickActions() {
  return (
    <div className="flex gap-3">
      {ACTIONS.map(({ href, icon: Icon, label, bg, color }) => (
        <Link key={href} href={href}
              className="flex-1 flex flex-col items-center gap-2 bg-white rounded-2xl py-4 shadow-sm">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
            <Icon size={20} className={color} />
          </div>
          <span className="text-[12px] font-semibold text-[#111111]">{label}</span>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: RecentActivity.tsx**

```tsx
// src/components/mobile/home/RecentActivity.tsx
'use client'
import Link from 'next/link'
import Avatar from '../shared/Avatar'
import Badge from '../shared/Badge'

interface Conv {
  id: string
  contact_name: string
  last_message?: string
  unread: number
  channel: string
}

const CHANNEL_LABEL: Record<string, string> = {
  sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email', phone: 'Appel'
}

export default function RecentActivity({ convs }: { convs: Conv[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
      {convs.slice(0, 5).map(conv => (
        <Link key={conv.id} href={`/m/conversations/${conv.id}`}
              className="flex items-center gap-3 p-4">
          <Avatar name={conv.contact_name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[#111111] truncate">{conv.contact_name}</p>
            <p className="text-[12px] text-gray-400 truncate">{conv.last_message ?? '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {conv.unread > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#3462EE] text-white text-[10px] font-bold flex items-center justify-center">
                {conv.unread}
              </span>
            )}
            <Badge label={CHANNEL_LABEL[conv.channel] ?? conv.channel} variant="gray" />
          </div>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Home page.tsx**

```tsx
// src/app/m/home/page.tsx
'use client'
import useSWR from 'swr'
import { TrendingUp, MessageSquare, CalendarDays, Users } from 'lucide-react'
import TopBar from '@/components/mobile/shell/TopBar'
import KpiCard from '@/components/mobile/home/KpiCard'
import AgentStatusRow from '@/components/mobile/home/AgentStatusRow'
import QuickActions from '@/components/mobile/home/QuickActions'
import RecentActivity from '@/components/mobile/home/RecentActivity'
import Spinner from '@/components/mobile/shared/Spinner'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const AGENTS = [
  { name: 'Soren', role: 'Orchestrateur', color: '#4A91A8', active: true },
  { name: 'Kai',   role: 'Réponses clients', color: '#1A5C38', active: true },
  { name: 'Mia',   role: 'Données & devis', color: '#E8836A', active: false },
]

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k€`
  return `${n}€`
}

export default function MobileHomePage() {
  const { data: dash, isLoading: dashLoading } = useSWR('/api/dashboard', fetcher, { revalidateOnFocus: false })
  const { data: convData } = useSWR('/api/conversations/list', fetcher, { revalidateOnFocus: false })

  const metrics = dash?.metrics ?? {}
  const convs = convData?.conversations ?? []
  const unread = convs.filter((c: { unread: number }) => c.unread > 0).length

  return (
    <>
      <TopBar title="Soren" />
      <div className="px-4 pt-2 pb-4 space-y-5">

        {/* Greeting */}
        <div>
          <p className="text-[13px] text-gray-400">Bonjour,</p>
          <h2 className="text-[22px] font-bold text-[#111111] tracking-tight">Tableau de bord</h2>
        </div>

        {/* KPIs */}
        {dashLoading ? <Spinner /> : (
          <>
            <div className="flex gap-3">
              <KpiCard
                label="Pipeline"
                value={fmt(metrics.pipelineValue ?? 0)}
                icon={TrendingUp}
                iconBg="bg-[#E2FF8D]"
                iconColor="text-[#1A5C38]"
                sub={`${metrics.activeDeals ?? 0} deals actifs`}
              />
              <KpiCard
                label="Messages"
                value={unread}
                icon={MessageSquare}
                iconBg="bg-[#3462EE]/10"
                iconColor="text-[#3462EE]"
                sub="non lus"
              />
            </div>
            <div className="flex gap-3">
              <KpiCard
                label="Contacts"
                value={metrics.totalContacts ?? 0}
                icon={Users}
                iconBg="bg-[#4A91A8]/10"
                iconColor="text-[#4A91A8]"
              />
              <KpiCard
                label="Deals gagnés"
                value={metrics.wonDeals ?? 0}
                icon={CalendarDays}
                iconBg="bg-[#E8836A]/10"
                iconColor="text-[#E8836A]"
                sub={`/ ${metrics.totalDeals ?? 0} total`}
              />
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div>
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Actions rapides
          </p>
          <QuickActions />
        </div>

        {/* Agents */}
        <div className="bg-white rounded-2xl shadow-sm px-4">
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider pt-4 mb-1">
            Équipe IA
          </p>
          {AGENTS.map(a => <AgentStatusRow key={a.name} {...a} />)}
        </div>

        {/* Recent Conversations */}
        {convs.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Activité récente
            </p>
            <RecentActivity convs={convs} />
          </div>
        )}

      </div>
    </>
  )
}
```

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/mobile/home/ src/app/m/home/
rtk git commit -m "feat(mobile): home dashboard — KPIs, agents status, quick actions, recent activity"
```

---

## Task 4: Conversations — Liste + Thread

**Files:**
- Create: `src/components/mobile/conversations/ConvRow.tsx`
- Create: `src/components/mobile/conversations/ThreadView.tsx`
- Create: `src/components/mobile/conversations/Composer.tsx`
- Create: `src/app/m/conversations/page.tsx`
- Create: `src/app/m/conversations/[id]/page.tsx`

- [ ] **Step 1: ConvRow.tsx**

```tsx
// src/components/mobile/conversations/ConvRow.tsx
'use client'
import Link from 'next/link'
import Avatar from '../shared/Avatar'

interface Conv {
  id: string
  contact_name: string
  last_message?: string
  last_message_at: string
  unread: number
  channel: string
}

const CHANNEL_ICON: Record<string, string> = {
  whatsapp: '🟢', sms: '💬', email: '✉️', phone: '📞'
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function ConvRow({ conv }: { conv: Conv }) {
  return (
    <Link href={`/m/conversations/${conv.id}`}
          className="flex items-center gap-3 px-4 py-3.5 bg-white active:bg-gray-50">
      <div className="relative">
        <Avatar name={conv.contact_name} size="md" />
        <span className="absolute -bottom-0.5 -right-0.5 text-[11px]">
          {CHANNEL_ICON[conv.channel] ?? '💬'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-[15px] truncate ${conv.unread > 0 ? 'font-bold text-[#111111]' : 'font-medium text-[#111111]'}`}>
            {conv.contact_name}
          </p>
          <span className="text-[12px] text-gray-400 shrink-0 ml-2">{relativeTime(conv.last_message_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-gray-400 truncate flex-1">{conv.last_message ?? '—'}</p>
          {conv.unread > 0 && (
            <span className="ml-2 w-5 h-5 rounded-full bg-[#3462EE] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {conv.unread > 9 ? '9+' : conv.unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Composer.tsx**

```tsx
// src/components/mobile/conversations/Composer.tsx
'use client'
import { useState } from 'react'
import { Send } from 'lucide-react'

interface ComposerProps {
  convId: string
  onSent?: () => void
}

export default function Composer({ convId, onSent }: ComposerProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      setText('')
      onSent?.()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-3 py-2.5"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Écrire un message..."
          rows={1}
          className="flex-1 resize-none bg-[#EEF0EB] rounded-2xl px-4 py-2.5 text-[14px]
                     text-[#111111] placeholder:text-gray-400 outline-none max-h-32"
          style={{ lineHeight: '1.4' }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full bg-[#3462EE] flex items-center justify-center shrink-0
                     disabled:opacity-40 active:scale-95 transition-transform">
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ThreadView.tsx**

```tsx
// src/components/mobile/conversations/ThreadView.tsx
'use client'
import useSWR from 'swr'
import Spinner from '../shared/Spinner'
import EmptyState from '../shared/EmptyState'
import { MessageSquare } from 'lucide-react'

interface Message {
  id: string
  body: string
  direction: 'inbound' | 'outbound'
  dateAdded: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ThreadView({ convId }: { convId: string }) {
  const { data, isLoading } = useSWR(
    `/api/conversations/${convId}/messages`,
    fetcher,
    { refreshInterval: 5000 }
  )

  if (isLoading) return <Spinner />

  const messages: Message[] = data?.messages ?? []

  if (!messages.length) {
    return <EmptyState icon={MessageSquare} title="Aucun message" subtitle="Commencez la conversation" />
  }

  return (
    <div className="px-4 py-3 space-y-2 pb-32">
      {messages.map(msg => {
        const out = msg.direction === 'outbound'
        return (
          <div key={msg.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
              out
                ? 'bg-[#3462EE] text-white rounded-br-md'
                : 'bg-white text-[#111111] rounded-bl-md shadow-sm'
            }`}>
              <p className="text-[14px] leading-relaxed">{msg.body}</p>
              <p className={`text-[11px] mt-1 ${out ? 'text-white/60' : 'text-gray-400'}`}>
                {formatTime(msg.dateAdded)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Conversations list page**

```tsx
// src/app/m/conversations/page.tsx
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/mobile/shell/TopBar'
import SearchBar from '@/components/mobile/shared/SearchBar'
import ConvRow from '@/components/mobile/conversations/ConvRow'
import EmptyState from '@/components/mobile/shared/EmptyState'
import Spinner from '@/components/mobile/shared/Spinner'
import { MessageSquare } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function MobileConversationsPage() {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const { data, isLoading } = useSWR('/api/conversations/list', fetcher, { refreshInterval: 15000 })

  const all: { id: string; contact_name: string; last_message?: string; last_message_at: string; unread: number; channel: string }[] = data?.conversations ?? []

  const filtered = all
    .filter(c => tab === 'all' ? true : c.unread > 0)
    .filter(c => !search || c.contact_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <TopBar title="Messages" />
      <div className="pt-2">
        {/* Tabs */}
        <div className="flex gap-1 mx-4 mb-3 bg-white rounded-2xl p-1 shadow-sm">
          {(['all', 'unread'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                      tab === t ? 'bg-[#3462EE] text-white' : 'text-gray-400'
                    }`}>
              {t === 'all' ? 'Tous' : 'Non lus'}
              {t === 'unread' && all.filter(c => c.unread > 0).length > 0 && (
                <span className="ml-1.5 text-[11px]">({all.filter(c => c.unread > 0).length})</span>
              )}
            </button>
          ))}
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher une conversation..." />

        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Aucune conversation" subtitle="Vos échanges apparaîtront ici" />
        ) : (
          <div className="bg-white rounded-2xl mx-4 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {filtered.map(conv => <ConvRow key={conv.id} conv={conv} />)}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 5: Conversation detail page**

```tsx
// src/app/m/conversations/[id]/page.tsx
'use client'
import { use } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/mobile/shell/TopBar'
import ThreadView from '@/components/mobile/conversations/ThreadView'
import Composer from '@/components/mobile/conversations/Composer'
import Spinner from '@/components/mobile/shared/Spinner'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data } = useSWR(`/api/conversations/list`, fetcher)
  const conv = data?.conversations?.find((c: { id: string }) => c.id === id)

  return (
    <>
      <TopBar title={conv?.contact_name ?? 'Conversation'} showBack />
      <div className="pt-0">
        <ThreadView convId={id} />
        <Composer convId={id} />
      </div>
    </>
  )
}
```

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/mobile/conversations/ src/app/m/conversations/
rtk git commit -m "feat(mobile): conversations — list with tabs/search + thread view + composer"
```

---

## Task 5: Contacts — Liste + Détail

**Files:**
- Create: `src/components/mobile/contacts/ContactRow.tsx`
- Create: `src/components/mobile/contacts/ContactDetail.tsx`
- Create: `src/app/m/contacts/page.tsx`
- Create: `src/app/m/contacts/[id]/page.tsx`

- [ ] **Step 1: ContactRow.tsx**

```tsx
// src/components/mobile/contacts/ContactRow.tsx
import Link from 'next/link'
import { Phone, Mail } from 'lucide-react'
import Avatar from '../shared/Avatar'

interface Contact {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags?: string[]
}

export default function ContactRow({ contact }: { contact: Contact }) {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Sans nom'
  return (
    <Link href={`/m/contacts/${contact.id}`}
          className="flex items-center gap-3 px-4 py-3.5 bg-white active:bg-gray-50">
      <Avatar name={name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#111111] truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {contact.phone && (
            <span className="flex items-center gap-1 text-[12px] text-gray-400">
              <Phone size={11} /> {contact.phone}
            </span>
          )}
          {contact.email && !contact.phone && (
            <span className="flex items-center gap-1 text-[12px] text-gray-400">
              <Mail size={11} /> {contact.email}
            </span>
          )}
        </div>
      </div>
      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
```

- [ ] **Step 2: ContactDetail.tsx**

```tsx
// src/components/mobile/contacts/ContactDetail.tsx
import { Phone, Mail, MapPin, Tag, ExternalLink } from 'lucide-react'
import Badge from '../shared/Badge'
import Avatar from '../shared/Avatar'

interface ContactDetailProps {
  contact: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address1?: string
    city?: string
    tags?: string[]
    source?: string
    dateAdded?: string
  }
}

export default function ContactDetail({ contact }: ContactDetailProps) {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Sans nom'

  const rows = [
    contact.phone   && { icon: Phone,   label: 'Téléphone', value: contact.phone,              action: `tel:${contact.phone}` },
    contact.email   && { icon: Mail,    label: 'Email',     value: contact.email,               action: `mailto:${contact.email}` },
    contact.address1 && { icon: MapPin,  label: 'Adresse',  value: `${contact.address1}${contact.city ? ', ' + contact.city : ''}`, action: null },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; action: string | null }[]

  return (
    <div className="px-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 flex flex-col items-center text-center shadow-sm">
        <Avatar name={name} size="lg" />
        <h2 className="text-[20px] font-bold text-[#111111] mt-3">{name}</h2>
        {contact.source && (
          <Badge label={contact.source} variant="blue" />
        )}
      </div>

      {/* Contact info */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {rows.map(({ icon: Icon, label, value, action }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#EEF0EB] flex items-center justify-center shrink-0">
                <Icon size={15} className="text-[#3462EE]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400">{label}</p>
                <p className="text-[14px] font-medium text-[#111111]">{value}</p>
              </div>
              {action && (
                <a href={action} className="text-[#3462EE]">
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={14} className="text-gray-400" />
            <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">Tags</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {contact.tags.map(tag => <Badge key={tag} label={tag} variant="lime" />)}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Contacts list page**

```tsx
// src/app/m/contacts/page.tsx
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/mobile/shell/TopBar'
import SearchBar from '@/components/mobile/shared/SearchBar'
import ContactRow from '@/components/mobile/contacts/ContactRow'
import EmptyState from '@/components/mobile/shared/EmptyState'
import Spinner from '@/components/mobile/shared/Spinner'
import { Users } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Contact {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags?: string[]
}

export default function MobileContactsPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useSWR('/api/contact?limit=100', fetcher, { revalidateOnFocus: false })
  const contacts: Contact[] = data?.contacts ?? []

  const filtered = contacts.filter(c => {
    if (!search) return true
    const name = [c.firstName, c.lastName, c.email].join(' ').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <>
      <TopBar title="Contacts" />
      <div className="pt-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un contact..." />
        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Aucun contact" subtitle="Vos contacts GHL apparaîtront ici" />
        ) : (
          <div className="bg-white rounded-2xl mx-4 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {filtered.map(c => <ContactRow key={c.id} contact={c} />)}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Contact detail page**

```tsx
// src/app/m/contacts/[id]/page.tsx
'use client'
import { use } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/mobile/shell/TopBar'
import ContactDetail from '@/components/mobile/contacts/ContactDetail'
import Spinner from '@/components/mobile/shared/Spinner'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useSWR(`/api/contact/${id}`, fetcher)

  if (isLoading) return <><TopBar title="Contact" showBack /><Spinner /></>

  const contact = data?.contact ?? data

  return (
    <>
      <TopBar title={[contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || 'Contact'} showBack />
      <div className="pt-4">
        {contact && <ContactDetail contact={contact} />}
      </div>
    </>
  )
}
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/mobile/contacts/ src/app/m/contacts/
rtk git commit -m "feat(mobile): contacts — list with search + contact detail view"
```

---

## Task 6: Pipeline — Opportunités

**Files:**
- Create: `src/components/mobile/pipeline/OppRow.tsx`
- Create: `src/app/m/pipeline/page.tsx`

- [ ] **Step 1: OppRow.tsx**

```tsx
// src/components/mobile/pipeline/OppRow.tsx
import Badge from '../shared/Badge'
import Avatar from '../shared/Avatar'

interface Opp {
  id: string
  name: string
  contactName?: string
  monetaryValue?: number
  status: string
  stageName?: string
  pipelineName?: string
}

const STATUS_BADGE: Record<string, 'green' | 'red' | 'gray' | 'blue'> = {
  open: 'blue', won: 'green', lost: 'red', abandoned: 'gray'
}

const STATUS_LABEL: Record<string, string> = {
  open: 'En cours', won: 'Gagné', lost: 'Perdu', abandoned: 'Abandonné'
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function OppRow({ opp }: { opp: Opp }) {
  const name = opp.contactName || opp.name
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Avatar name={name} size="md" color="#3462EE" />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#111111] truncate">{opp.name}</p>
        <p className="text-[12px] text-gray-400 truncate">{opp.stageName ?? opp.pipelineName ?? '—'}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {opp.monetaryValue ? (
          <p className="text-[14px] font-bold text-[#111111]">{fmt(opp.monetaryValue)}</p>
        ) : null}
        <Badge label={STATUS_LABEL[opp.status] ?? opp.status} variant={STATUS_BADGE[opp.status] ?? 'gray'} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Pipeline page**

```tsx
// src/app/m/pipeline/page.tsx
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/mobile/shell/TopBar'
import OppRow from '@/components/mobile/pipeline/OppRow'
import EmptyState from '@/components/mobile/shared/EmptyState'
import Spinner from '@/components/mobile/shared/Spinner'
import { TrendingUp } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Opp {
  id: string
  name: string
  contactName?: string
  monetaryValue?: number
  status: string
  stageName?: string
  pipelineName?: string
}

const STATUSES = ['open', 'won', 'lost', 'abandoned']
const STATUS_LABELS: Record<string, string> = { open: 'En cours', won: 'Gagné', lost: 'Perdu', abandoned: 'Abandonné' }

export default function MobilePipelinePage() {
  const [filter, setFilter] = useState('open')
  const { data, isLoading } = useSWR('/api/pipeline-opps', fetcher, { revalidateOnFocus: false })
  const opps: Opp[] = data?.opportunities ?? data?.opps ?? []
  const filtered = opps.filter(o => o.status === filter)

  const totalOpen = opps.filter(o => o.status === 'open').reduce((s, o) => s + (o.monetaryValue ?? 0), 0)
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return (
    <>
      <TopBar title="Pipeline" />
      <div className="pt-2">
        {/* Pipeline value banner */}
        <div className="mx-4 mb-4 bg-[#3462EE] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[12px] text-white/70 font-medium">Valeur totale</p>
            <p className="text-[24px] font-bold text-white">{fmt(totalOpen)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <TrendingUp size={22} className="text-white" />
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-none">
          {STATUSES.map(s => {
            const count = opps.filter(o => o.status === s).length
            return (
              <button key={s} onClick={() => setFilter(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        filter === s ? 'bg-[#3462EE] text-white' : 'bg-white text-gray-500 shadow-sm'
                      }`}>
                {STATUS_LABELS[s]}
                <span className={`text-[11px] ${filter === s ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Aucune opportunité" subtitle={`Pas d'opportunité "${STATUS_LABELS[filter]}"`} />
        ) : (
          <div className="bg-white rounded-2xl mx-4 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {filtered.map(opp => <OppRow key={opp.id} opp={opp} />)}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/mobile/pipeline/ src/app/m/pipeline/
rtk git commit -m "feat(mobile): pipeline — opportunities list with status filter + total value banner"
```

---

## Task 7: Agents IA — Équipe

**Files:**
- Create: `src/components/mobile/agents/AgentCard.tsx`
- Create: `src/app/m/agents/page.tsx`

- [ ] **Step 1: AgentCard.tsx**

```tsx
// src/components/mobile/agents/AgentCard.tsx
import Link from 'next/link'
import { Cpu, Users, Database, ChevronRight } from 'lucide-react'

interface AgentCardProps {
  id: string
  name: string
  role: string
  color: string
  model: string
  active: boolean
  iconType: 'cpu' | 'users' | 'database'
}

const ICONS = { cpu: Cpu, users: Users, database: Database }

export default function AgentCard({ id, name, role, color, model, active, iconType }: AgentCardProps) {
  const Icon = ICONS[iconType]
  return (
    <Link href={`/equipe`}
          className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 active:bg-gray-50">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
           style={{ backgroundColor: `${color}20` }}>
        <Icon size={26} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[16px] font-bold text-[#111111]">{name}</p>
          <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
        </div>
        <p className="text-[13px] text-gray-400 truncate">{role}</p>
        <p className="text-[11px] text-gray-300 mt-1 font-mono">{model}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </Link>
  )
}
```

- [ ] **Step 2: Agents page**

```tsx
// src/app/m/agents/page.tsx
'use client'
import TopBar from '@/components/mobile/shell/TopBar'
import AgentCard from '@/components/mobile/agents/AgentCard'
import Link from 'next/link'
import { BookOpen, GitBranch, Activity } from 'lucide-react'

const AGENTS = [
  { id: 'soren', name: 'Soren', role: 'Orchestrateur & chef de meute', color: '#4A91A8', model: 'claude-haiku-4-5', active: true,  iconType: 'cpu'      as const },
  { id: 'kai',   name: 'Kai',   role: 'Réponses clients & qualifications', color: '#1A5C38', model: 'claude-haiku-4-5', active: true,  iconType: 'users'    as const },
  { id: 'mia',   name: 'Mia',   role: 'Données, devis & mémoire', color: '#E8836A', model: 'gemini-2.5-flash', active: false, iconType: 'database' as const },
]

const QUICK_LINKS = [
  { href: '/knowledge', icon: BookOpen, label: 'Base de connaissance', sub: 'Documents & données' },
  { href: '/workflows', icon: GitBranch, label: 'Workflows', sub: 'Automatisations' },
  { href: '/logs',      icon: Activity,  label: 'Logs d\'activité', sub: 'Historique des actions' },
]

export default function MobileAgentsPage() {
  return (
    <>
      <TopBar title="Équipe IA" />
      <div className="px-4 pt-2 space-y-4">

        <div>
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Agents
          </p>
          <div className="space-y-3">
            {AGENTS.map(a => <AgentCard key={a.id} {...a} />)}
          </div>
        </div>

        <div>
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Outils
          </p>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50 overflow-hidden">
            {QUICK_LINKS.map(({ href, icon: Icon, label, sub }) => (
              <Link key={href} href={href}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50">
                <div className="w-9 h-9 rounded-xl bg-[#EEF0EB] flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-[#3462EE]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#111111]">{label}</p>
                  <p className="text-[12px] text-gray-400">{sub}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/mobile/agents/ src/app/m/agents/
rtk git commit -m "feat(mobile): agents — team cards (Soren/Kai/Mia) + quick links to tools"
```

---

## Task 8: Paramètres — Settings

**Files:**
- Create: `src/app/m/parametres/page.tsx`

- [ ] **Step 1: Paramètres page**

```tsx
// src/app/m/parametres/page.tsx
'use client'
import useSWR from 'swr'
import Link from 'next/link'
import TopBar from '@/components/mobile/shell/TopBar'
import Avatar from '@/components/mobile/shared/Avatar'
import {
  Building2, FileText, Calendar, BarChart2, Settings, LogOut,
  ChevronRight, Smartphone
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SECTIONS = [
  {
    title: 'Gestion',
    items: [
      { href: '/devis',      icon: FileText,   label: 'Devis',           sub: 'Gérer les devis et factures' },
      { href: '/calendrier', icon: Calendar,   label: 'Calendrier',      sub: 'Rendez-vous et planning' },
      { href: '/analyse',    icon: BarChart2,  label: 'Analytiques',     sub: 'Rapports et performances' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { href: '/parametres', icon: Building2, label: 'Entreprise',       sub: 'Infos et paramètres' },
      { href: '/workflows',  icon: Settings,  label: 'Automations',      sub: 'Workflows et triggers' },
    ],
  },
]

export default function MobileParametresPage() {
  const { data } = useSWR('/api/settings/company', fetcher)
  const company = data?.settings ?? data
  const companyName = company?.name ?? 'Mon entreprise'

  return (
    <>
      <TopBar title="Paramètres" />
      <div className="px-4 pt-2 space-y-5">

        {/* Company Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <Avatar name={companyName} size="lg" color="#3462EE" />
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-bold text-[#111111] truncate">{companyName}</p>
            {company?.website && (
              <p className="text-[13px] text-gray-400 truncate">{company.website}</p>
            )}
          </div>
        </div>

        {/* Version App */}
        <div className="bg-[#E2FF8D] rounded-2xl p-4 flex items-center gap-3">
          <Smartphone size={20} className="text-[#1A5C38]" />
          <div>
            <p className="text-[14px] font-bold text-[#1A5C38]">Soren Mobile</p>
            <p className="text-[12px] text-[#1A5C38]/70">Version 1.0.0 — App mobile</p>
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map(section => (
          <div key={section.title}>
            <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {section.title}
            </p>
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50 overflow-hidden">
              {section.items.map(({ href, icon: Icon, label, sub }) => (
                <Link key={href} href={href}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50">
                  <div className="w-9 h-9 rounded-xl bg-[#EEF0EB] flex items-center justify-center shrink-0">
                    <Icon size={17} className="text-[#3462EE]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-[#111111]">{label}</p>
                    <p className="text-[12px] text-gray-400">{sub}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Open Desktop */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <a href="/" className="flex items-center gap-3 px-4 py-4 active:bg-gray-50">
            <div className="w-9 h-9 rounded-xl bg-[#3462EE]/10 flex items-center justify-center shrink-0">
              <LogOut size={17} className="text-[#3462EE]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[#111111]">Version bureau</p>
              <p className="text-[12px] text-gray-400">Accéder à l'interface complète</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </a>
        </div>

      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/app/m/parametres/
rtk git commit -m "feat(mobile): settings page — company info + navigation links + version banner"
```

---

## Task 9: Devis — Liste mobile

**Files:**
- Create: `src/components/mobile/devis/DevisRow.tsx`
- Create: `src/app/m/devis/page.tsx`

- [ ] **Step 1: DevisRow.tsx**

```tsx
// src/components/mobile/devis/DevisRow.tsx
import Badge from '../shared/Badge'

interface Devis {
  id: string
  contact_name?: string
  total?: number
  status: string
  created_at: string
  numero?: string
}

const STATUS_MAP: Record<string, { label: string; variant: 'gray' | 'lime' | 'blue' | 'orange' | 'red' }> = {
  draft:   { label: 'Brouillon',   variant: 'gray' },
  sent:    { label: 'Envoyé',      variant: 'blue' },
  signed:  { label: 'Signé',       variant: 'lime' },
  expired: { label: 'Expiré',      variant: 'orange' },
  rejected:{ label: 'Refusé',      variant: 'red' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function DevisRow({ devis }: { devis: Devis }) {
  const status = STATUS_MAP[devis.status] ?? { label: devis.status, variant: 'gray' as const }
  const date = new Date(devis.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {devis.numero && <span className="text-[11px] font-mono text-gray-400">#{devis.numero}</span>}
          <p className="text-[14px] font-semibold text-[#111111] truncate">{devis.contact_name ?? 'Client'}</p>
        </div>
        <p className="text-[12px] text-gray-400">{date}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {devis.total != null && <p className="text-[15px] font-bold text-[#111111]">{fmt(devis.total)}</p>}
        <Badge label={status.label} variant={status.variant} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Devis page**

```tsx
// src/app/m/devis/page.tsx
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import TopBar from '@/components/mobile/shell/TopBar'
import DevisRow from '@/components/mobile/devis/DevisRow'
import EmptyState from '@/components/mobile/shared/EmptyState'
import Spinner from '@/components/mobile/shared/Spinner'
import { FileText } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Devis {
  id: string
  contact_name?: string
  total?: number
  status: string
  created_at: string
  numero?: string
}

const STATUSES = [
  { key: 'all',     label: 'Tous' },
  { key: 'draft',   label: 'Brouillons' },
  { key: 'sent',    label: 'Envoyés' },
  { key: 'signed',  label: 'Signés' },
]

export default function MobileDevisPage() {
  const [tab, setTab] = useState('all')
  const { data, isLoading } = useSWR('/api/devis/list', fetcher, { revalidateOnFocus: false })
  const all: Devis[] = data?.devis ?? data ?? []
  const filtered = tab === 'all' ? all : all.filter(d => d.status === tab)

  const totalSigned = all.filter(d => d.status === 'signed').reduce((s, d) => s + (d.total ?? 0), 0)
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

  return (
    <>
      <TopBar title="Devis" />
      <div className="pt-2">
        {/* Stats banner */}
        <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
          <div className="bg-[#E2FF8D] rounded-2xl p-3.5">
            <p className="text-[11px] font-semibold text-[#1A5C38]/70">CA signé</p>
            <p className="text-[18px] font-bold text-[#1A5C38]">{fmt(totalSigned)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3.5 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-400">Total devis</p>
            <p className="text-[18px] font-bold text-[#111111]">{all.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-none">
          {STATUSES.map(s => (
            <button key={s.key} onClick={() => setTab(s.key)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      tab === s.key ? 'bg-[#3462EE] text-white' : 'bg-white text-gray-500 shadow-sm'
                    }`}>
              {s.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun devis" subtitle="Créez votre premier devis depuis le bureau" />
        ) : (
          <div className="bg-white rounded-2xl mx-4 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {filtered.map(d => <DevisRow key={d.id} devis={d} />)}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/mobile/devis/ src/app/m/devis/
rtk git commit -m "feat(mobile): devis — list with tabs + CA signé stats banner"
```

---

## Task 10: Calendrier — RDV mobile

**Files:**
- Create: `src/components/mobile/calendrier/EventRow.tsx`
- Create: `src/app/m/calendrier/page.tsx`

- [ ] **Step 1: EventRow.tsx**

```tsx
// src/components/mobile/calendrier/EventRow.tsx
import { Clock, MapPin } from 'lucide-react'

interface CalEvent {
  id: string
  title: string
  startTime: string
  endTime?: string
  contactName?: string
  location?: string
  type?: string
}

export default function EventRow({ event }: { event: CalEvent }) {
  const start = new Date(event.startTime)
  const time = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date = start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="flex gap-3 px-4 py-4">
      {/* Date column */}
      <div className="flex flex-col items-center w-12 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-[#3462EE]/10 flex items-center justify-center">
          <span className="text-[14px] font-bold text-[#3462EE]">{start.getDate()}</span>
        </div>
        <span className="text-[10px] text-gray-400 mt-1 capitalize">{date.split(' ')[0]}</span>
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0 border-l border-gray-100 pl-3">
        <p className="text-[14px] font-semibold text-[#111111] truncate">{event.title}</p>
        {event.contactName && (
          <p className="text-[12px] text-gray-400 truncate">{event.contactName}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[12px] text-gray-400">
            <Clock size={11} /> {time}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 text-[12px] text-gray-400 truncate">
              <MapPin size={11} /> {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Calendrier page**

```tsx
// src/app/m/calendrier/page.tsx
'use client'
import useSWR from 'swr'
import TopBar from '@/components/mobile/shell/TopBar'
import EventRow from '@/components/mobile/calendrier/EventRow'
import EmptyState from '@/components/mobile/shared/EmptyState'
import Spinner from '@/components/mobile/shared/Spinner'
import { CalendarDays } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CalEvent {
  id: string
  title: string
  startTime: string
  endTime?: string
  contactName?: string
  location?: string
}

export default function MobileCalendrierPage() {
  const now = new Date().toISOString()
  const { data, isLoading } = useSWR(
    `/api/calendrier?from=${now}&limit=20`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const events: CalEvent[] = (data?.events ?? data ?? [])
    .filter((e: CalEvent) => new Date(e.startTime) >= new Date())
    .sort((a: CalEvent, b: CalEvent) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const today = events.filter(e => {
    const d = new Date(e.startTime)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })

  const upcoming = events.filter(e => {
    const d = new Date(e.startTime)
    const now = new Date()
    return d.toDateString() !== now.toDateString()
  })

  return (
    <>
      <TopBar title="Calendrier" />
      <div className="pt-2">

        {/* Today banner */}
        <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[12px] text-gray-400">Aujourd'hui</p>
            <p className="text-[20px] font-bold text-[#111111]">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#3462EE] flex items-center justify-center">
            <span className="text-[18px] font-bold text-white">{today.length}</span>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : events.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Aucun rendez-vous" subtitle="Votre agenda est libre" />
        ) : (
          <>
            {today.length > 0 && (
              <div>
                <p className="px-4 text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Aujourd'hui
                </p>
                <div className="bg-white rounded-2xl mx-4 shadow-sm divide-y divide-gray-50 overflow-hidden mb-4">
                  {today.map(e => <EventRow key={e.id} event={e} />)}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <p className="px-4 text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  À venir
                </p>
                <div className="bg-white rounded-2xl mx-4 shadow-sm divide-y divide-gray-50 overflow-hidden">
                  {upcoming.map(e => <EventRow key={e.id} event={e} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/mobile/calendrier/ src/app/m/calendrier/
rtk git commit -m "feat(mobile): calendrier — today/upcoming events with timeline layout"
```

---

## Task 11: PWA Manifest + Mobile Meta Tags

**Files:**
- Modify: `src/app/layout.tsx` (ajouter viewport et PWA)
- Create: `public/manifest.json`

- [ ] **Step 1: Manifest PWA**

```json
// public/manifest.json
{
  "name": "Soren",
  "short_name": "Soren",
  "description": "Plateforme agentique BTP",
  "start_url": "/m/home",
  "display": "standalone",
  "background_color": "#EEF0EB",
  "theme_color": "#3462EE",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Mobile layout meta — modifier `src/app/m/layout.tsx`**

Remplacer le metadata existant dans `src/app/m/layout.tsx` :

```tsx
// src/app/m/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import MobileShell from '@/components/mobile/shell/MobileShell'
import '../globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Soren',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Soren' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#3462EE',
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body className="font-jakarta">
        <MobileShell>{children}</MobileShell>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add public/manifest.json src/app/m/layout.tsx
rtk git commit -m "feat(mobile): PWA manifest + mobile meta tags for installable app"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Home dashboard (KPIs, agents, activité récente)
- ✅ Conversations (liste, tabs, thread, composer)
- ✅ Contacts (liste, search, détail)
- ✅ Pipeline (liste, filter, total value)
- ✅ Calendrier (today/upcoming)
- ✅ Agents IA (Soren/Kai/Mia cards, outils)
- ✅ Devis (liste, tabs, stats CA)
- ✅ Paramètres (company info, liens bureau)
- ✅ Shell (BottomNav, TopBar, MobileShell)
- ✅ Shared components (Avatar, Badge, EmptyState, Spinner, SearchBar)
- ✅ PWA manifest + meta tags

**Placeholder scan:** Aucun TBD/TODO dans le plan — toutes les étapes ont du code complet.

**Type consistency:**
- `Conv` utilisé consistant dans ConvRow + RecentActivity
- `Contact` consistant dans ContactRow + ContactDetail
- `Opp` consistant dans OppRow + Pipeline page
- `CalEvent` consistant dans EventRow + Calendrier page
- `Devis` consistant dans DevisRow + Devis page

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-20-soren-mobile-app.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — subagent frais par tâche, review entre chaque, itération rapide

**2. Inline Execution** — exécution dans cette session avec superpowers:executing-plans, checkpoints par tâche

**Lequel choisis-tu ?**

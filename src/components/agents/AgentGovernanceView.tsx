'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Users, ShieldCheck, Clock, Lock } from 'lucide-react'
import AgentAccountsView from '@/components/equipe/AgentAccountsView'
import PermissionMatrix from './PermissionMatrix'
import ApprovalsQueue from './ApprovalsQueue'

// ───────────────────────────────────────────────────────────────────────────
// Gouvernance IA — cockpit humain des agents Data OS (réservé admin).
//   • Comptes      → identités machine, runs, tokens, drawer détaillé.
//   • Permissions  → matrice agents × modules (qui peut quoi).
//   • Approbations → file d'attente des actions sensibles à valider.
// ───────────────────────────────────────────────────────────────────────────

type TabId = 'comptes' | 'permissions' | 'approbations'

export default function AgentGovernanceView() {
  const { isLoaded, isAdmin } = useCurrentUser()
  const [tab, setTab] = useState<TabId>('comptes')
  const approvals = useQuery(api.agents.pendingApprovals, {})
  const pendingCount = approvals?.length ?? 0

  if (isLoaded && !isAdmin) return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-2">
      <div className="w-12 h-12 rounded-2xl bg-soren-elevated text-soren-subtle flex items-center justify-center"><Lock size={22} /></div>
      <p className="text-[13px] font-medium text-soren-text">Réservé aux administrateurs</p>
      <p className="text-[11.5px] text-soren-subtle">La gouvernance des agents IA n’est accessible qu’aux comptes admin.</p>
    </div>
  )

  const TABS: { id: TabId; label: string; icon: typeof Users; badge?: number }[] = [
    { id: 'comptes',      label: 'Comptes',      icon: Users },
    { id: 'permissions',  label: 'Permissions',  icon: ShieldCheck },
    { id: 'approbations', label: 'Approbations', icon: Clock, badge: pendingCount },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-[18px] font-medium text-soren-text tracking-[-0.02em]">Gouvernance IA</h1>
        <p className="text-[11px] text-soren-subtle">Comptes machine, permissions par rôle & approbations humaines</p>

        <div className="flex items-center gap-1 mt-3 bg-soren-elevated rounded-xl p-1 w-fit">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${active ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-subtle hover:text-soren-text'}`}>
                <Icon size={13} /> {t.label}
                {t.badge ? <span className="ml-0.5 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] leading-none">{t.badge}</span> : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'comptes' && <AgentAccountsView />}
        {tab === 'permissions' && <div className="px-6 pb-6"><PermissionMatrix /></div>}
        {tab === 'approbations' && <div className="px-6 pb-6 max-w-2xl"><ApprovalsQueue /></div>}
      </div>
    </div>
  )
}

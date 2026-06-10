'use client'

import { useState } from 'react'
import { UserCircle, Palette, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProfilTab from '@/components/settings/ProfilTab'
import ApparenceTab from '@/components/settings/ApparenceTab'
import EquipeTab from '@/components/settings/EquipeTab'

type TabId = 'profil' | 'apparence' | 'equipe'

type Tab = { id: TabId; label: string; description: string; icon: LucideIcon; adminOnly?: boolean }

const TABS: Tab[] = [
  { id: 'profil',       label: 'Profil',       description: 'Vos informations de compte', icon: UserCircle },
  { id: 'apparence',    label: 'Apparence',    description: 'Thème de l’interface',        icon: Palette },
  { id: 'equipe',       label: 'Équipe',       description: 'Membres, rôles et accès',                icon: Users, adminOnly: true },
]

export default function SettingsShell() {
  const { isAdmin } = useCurrentUser()
  const [active, setActive] = useState<TabId>('profil')

  const tabs = TABS.filter(t => !t.adminOnly || isAdmin)
  const current = tabs.find(t => t.id === active) ?? tabs[0]

  return (
    <div className="h-full flex flex-col md:flex-row bg-soren-app">
      {/* Tab rail */}
      <nav className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-soren-border flex flex-col gap-1 p-4 overflow-y-auto">
        <div className="px-2 pt-2 pb-4">
          <h1 className="text-[17px] font-semibold text-soren-text">Paramètres</h1>
          <p className="text-xs text-soren-subtle mt-0.5">Gérez votre espace VividFlow</p>
        </div>
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                isActive
                  ? 'bg-soren-card text-soren-text shadow-sm'
                  : 'text-soren-subtle hover:bg-soren-card/60 hover:text-soren-muted'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-[#FF4D00]" />
              )}
              <Icon size={16} className={isActive ? 'text-[#FF4D00]' : 'text-soren-subtle group-hover:text-soren-muted'} />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Content panel */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 pt-6 pb-24">
          <div className="mb-5">
            <h2 className="text-[18px] font-semibold text-soren-text tracking-tight">{current.label}</h2>
            <p className="text-xs text-soren-subtle mt-1">{current.description}</p>
          </div>

          {/* key force le remount → fade subtil au changement d'onglet */}
          <div key={active} className="settings-fade">
            {active === 'profil' && <ProfilTab />}
            {active === 'apparence' && <ApparenceTab />}
            {active === 'equipe' && isAdmin && <EquipeTab />}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .settings-fade {
          animation: settingsFadeIn 220ms ease-out both;
        }
        @keyframes settingsFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

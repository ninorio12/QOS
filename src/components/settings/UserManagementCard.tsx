'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { inputCls } from './_shared'
import Select from '@/components/ui/Select'

// Modules (href -> label) pour le sélecteur de droits d'accès.
const MODULES: { href: string; label: string }[] = [
  { href: '/dashboard',           label: 'Tableau de bord' },
  { href: '/pipeline',            label: 'Pipeline' },
  { href: '/contacts',            label: 'Contacts' },
  { href: '/prospection',         label: 'Prospection' },
  { href: '/closing',             label: 'Closing' },
  { href: '/cockpit',             label: 'Performance' },
  { href: '/performance',         label: 'Suivi Setting' },
  { href: '/media-buyer',         label: 'Media Buyer' },
  { href: '/onboarding',          label: 'Onboarding' },
  { href: '/paiement',            label: 'Paiement' },
  { href: '/calendrier',          label: 'Calendrier' },
  { href: '/bibliotheque/data',   label: 'Data' },
  { href: '/bibliotheque/records',label: 'Records' },
  { href: '/bibliotheque/process',label: 'Process' },
  { href: '/equipe',              label: 'Équipe IA' },
  { href: '/taches',              label: 'Tâches' },
  { href: '/logs',                label: 'Activités' },
  { href: '/knowledge',           label: 'Base de connaissance' },
  { href: '/budget',              label: 'Budget' },
  { href: '/integrations',        label: 'Intégrations' },
]
const ROLES = ['admin', 'setter'] as const

function ModulePopover({
  selected, onToggle, disabled, label,
}: { selected: string[]; onToggle: (href: string) => void; disabled?: boolean; label?: string }) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      // Pas la place pour ~256px de menu en dessous → ouvre vers le haut.
      setUp(window.innerHeight - r.bottom < 280)
    }
    setOpen(o => !o)
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className="flex items-center gap-1 bg-soren-elevated rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-soren-text disabled:opacity-40 disabled:cursor-not-allowed hover:ring-2 hover:ring-soren-border transition-all"
      >
        {label ?? `Modules (${selected.length})`}
        <ChevronDown size={11} />
      </button>
      {open && !disabled && (
        <div className={`absolute right-0 w-52 max-h-64 overflow-y-auto bg-soren-card border border-soren-border rounded-xl shadow-xl z-50 p-1.5 ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {MODULES.map(m => {
            const on = selected.includes(m.href)
            return (
              <label key={m.href} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-soren-elevated cursor-pointer text-[11px] text-soren-text">
                <input type="checkbox" checked={on} onChange={() => onToggle(m.href)} className="accent-[#FF4D00]" />
                {m.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function UserManagementCard() {
  const users = useQuery(api.users.listAll) ?? []
  const setRole = useMutation(api.users.setRole)
  const setStatus = useMutation(api.users.setStatus)
  const setAllowedModules = useMutation(api.users.setAllowedModules)
  const adminRemove = useMutation(api.users.adminRemove)

  const [invEmail, setInvEmail] = useState('')
  const [invPrenom, setInvPrenom] = useState('')
  const [invNom, setInvNom] = useState('')
  const [invRole, setInvRole] = useState<string>('setter')
  // Aucun module pré-coché : l'admin accorde explicitement les accès (le Tableau de bord
  // n'est plus offert par défaut — ses KPI sont sensibles).
  const [invModules, setInvModules] = useState<string[]>([])
  const [invMessage, setInvMessage] = useState('')
  const [invSending, setInvSending] = useState(false)
  const [invNote, setInvNote] = useState<{ ok: boolean; msg: string } | null>(null)

  function toggleInvModule(href: string) {
    setInvModules(prev => prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href])
  }

  function toggleUserModule(u: { id: string; allowedModules?: string[] }, href: string) {
    const cur = u.allowedModules ?? []
    const next = cur.includes(href) ? cur.filter(h => h !== href) : [...cur, href]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAllowedModules({ id: u.id as any, allowedModules: next })
  }

  async function invite() {
    if (!invEmail.trim()) return
    setInvSending(true)
    setInvNote(null)
    try {
      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invEmail.trim(),
          firstName: invPrenom.trim() || undefined,
          lastName: invNom.trim() || undefined,
          role: invRole,
          allowedModules: invRole === 'admin' ? MODULES.map(m => m.href) : invModules,
          message: invMessage.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      setInvNote({ ok: true, msg: 'Invitation envoyée' })
      setInvEmail(''); setInvPrenom(''); setInvNom(''); setInvRole('setter'); setInvModules([]); setInvMessage('')
    } catch {
      setInvNote({ ok: false, msg: 'Erreur lors de l’invitation' })
    } finally {
      setInvSending(false)
    }
  }


  return (
    <div className="bg-soren-card rounded-2xl border border-soren-border p-6 flex flex-col gap-4">
      <div>
        <p className="text-[15px] font-semibold text-soren-text">Membres de l&apos;équipe</p>
        <p className="text-xs text-soren-subtle mt-0.5">Gérez les rôles, statuts et accès aux modules.</p>
      </div>

      <div className="flex flex-col divide-y divide-soren-border">
        {users.map(u => {
          const isAdminRow = u.role === 'admin'
          const active = (u.status ?? 'active') === 'active'
          return (
            <div key={u.id} className="flex items-center gap-2.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-soren-text truncate">{u.name || u.email}</p>
                <p className="text-[11px] text-soren-subtle truncate">{u.email}</p>
              </div>

              <Select
                value={u.role}
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                onChange={v => setRole({ id: u.id as any, role: v })}
                options={ROLES.map(r => ({ value: r, label: r }))}
                className="w-32"
              />

              <button
                type="button"
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                onClick={() => setStatus({ id: u.id as any, status: active ? 'inactive' : 'active' })}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                  active ? 'bg-green-500/15 text-green-600' : 'bg-soren-elevated text-soren-subtle'
                }`}
              >
                {active ? 'Actif' : 'Inactif'}
              </button>

              <ModulePopover
                selected={isAdminRow ? MODULES.map(m => m.href) : (u.allowedModules ?? [])}
                onToggle={href => toggleUserModule(u, href)}
                disabled={isAdminRow}
                label={isAdminRow ? 'Tous' : undefined}
              />

              <button
                type="button"
                onClick={() => {
                  if (confirm(`Supprimer ${u.name || u.email} ?\nLe compte (Clerk + invitations) sera entièrement révoqué.`)) {
                    // Suppression complète : Clerk + invitations + Convex (la liste se rafraîchit via Convex).
                    void fetch('/api/admin/remove-user', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ convexId: u.id, email: u.email }),
                    }).catch(() => {})
                  }
                }}
                className="text-soren-subtle hover:text-red-500 transition-colors p-1"
                aria-label="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
        {users.length === 0 && <p className="text-xs text-soren-subtle py-3">Aucun utilisateur.</p>}
      </div>

      <div className="border-t border-soren-border pt-4 flex flex-col gap-2.5">
        <p className="text-xs font-semibold text-soren-text">Inviter un utilisateur</p>
        <div className="flex flex-wrap items-center gap-2">
          <input value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="email@exemple.com"
            className={`${inputCls} flex-1 min-w-[180px]`} />
          <input value={invPrenom} onChange={e => setInvPrenom(e.target.value)} placeholder="Prénom"
            className={`${inputCls} w-32`} />
          <input value={invNom} onChange={e => setInvNom(e.target.value)} placeholder="Nom"
            className={`${inputCls} w-32`} />
          <Select value={invRole} onChange={setInvRole} options={ROLES.map(r => ({ value: r, label: r }))} className="w-32" />
          <ModulePopover
            selected={invRole === 'admin' ? MODULES.map(m => m.href) : invModules}
            onToggle={toggleInvModule}
            disabled={invRole === 'admin'}
            label={invRole === 'admin' ? 'Tous' : undefined}
          />
          <button
            type="button"
            onClick={invite}
            disabled={invSending || !invEmail.trim()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FF4D00] text-white hover:bg-[#E64500] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {invSending ? 'Envoi…' : 'Inviter'}
          </button>
        </div>
        <textarea
          value={invMessage}
          onChange={e => setInvMessage(e.target.value)}
          placeholder="Message personnalisé (optionnel) — ajouté à l'email d'invitation. Ex : « Hâte de t'avoir dans l'équipe ! »"
          rows={2}
          className={`${inputCls} w-full resize-none`}
        />
        {invNote && (
          <p className={`text-xs ${invNote.ok ? 'text-green-600' : 'text-red-500'}`}>{invNote.msg}</p>
        )}
      </div>
    </div>
  )
}

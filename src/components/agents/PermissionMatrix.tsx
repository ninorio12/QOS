'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ShieldCheck, KeyRound, CircleDot } from 'lucide-react'

// ───────────────────────────────────────────────────────────────────────────
// Dashboard permissions — matrice agents × modules.
// Lecture seule (api.agentPermissions.getPermissionMatrix) : qui peut quoi, où,
// et où une approbation humaine est requise. Source de vérité = ROLE_TEMPLATES.
// ───────────────────────────────────────────────────────────────────────────

// Niveau (verbe) → style de chip. Lecture neutre, écriture bleue, actions
// sensibles ambre/rouge. Cohérent avec le langage iOS sobre du SaaS.
const LEVEL_META: Record<string, { color: string; bg: string }> = {
  read:      { color: '#475569', bg: '#F1F5F9' },
  write:     { color: '#1D4ED8', bg: '#DBEAFE' },
  move:      { color: '#1D4ED8', bg: '#DBEAFE' },
  action:    { color: '#7C3AED', bg: '#EDE9FE' },
  assign:    { color: '#7C3AED', bg: '#EDE9FE' },
  review:    { color: '#7C3AED', bg: '#EDE9FE' },
  create:    { color: '#1D4ED8', bg: '#DBEAFE' },
  accept:    { color: '#7C3AED', bg: '#EDE9FE' },
  route:     { color: '#7C3AED', bg: '#EDE9FE' },
  heartbeat: { color: '#475569', bg: '#F1F5F9' },
  approve:   { color: '#B45309', bg: '#FEF3C7' },
  convert:   { color: '#B45309', bg: '#FEF3C7' },
  value:     { color: '#B45309', bg: '#FEF3C7' },
  send:      { color: '#B45309', bg: '#FEF3C7' },
  archive:   { color: '#DC2626', bg: '#FEE2E2' },
}
const levelMeta = (lvl: string) => LEVEL_META[lvl] ?? { color: '#475569', bg: '#F1F5F9' }

const ROLE_LABEL: Record<string, string> = {
  coo: 'COO', kb: 'KB / GBrain', csm: 'Support client', ops: 'Opérations', analyst: 'Analyse',
}

type Perm = { scope: string; level: string; requiresApproval: boolean }
type Row = {
  slug: string; displayName: string; role: string; status: string
  permissions: Perm[]; activeTokens: number
}

export default function PermissionMatrix() {
  const matrix = useQuery(api.agentPermissions.getPermissionMatrix, {}) as Row[] | undefined

  if (matrix === undefined) return <p className="text-[12px] text-soren-subtle px-1">Chargement de la matrice…</p>
  if (matrix.length === 0) return (
    <p className="text-[12px] text-soren-subtle px-1">
      Aucune permission seedée. Lance <code className="font-mono">convex run agentPermissions:seedAgentPermissions</code>.
    </p>
  )

  // Modules (lignes) = union de tous les scopes accordés, triés alpha.
  const modules = Array.from(new Set(matrix.flatMap(a => a.permissions.map(p => p.scope)))).sort()

  // Lookup (agent, module) → permissions sur ce module.
  const cell = (agent: Row, mod: string) => agent.permissions.filter(p => p.scope === mod)

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête + légende */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-[11.5px] text-soren-subtle max-w-lg">
          Qui peut quoi, sur quel module. <span className="font-medium text-soren-text">Deny-by-default</span> :
          sans scope, l’action est refusée. Un point ambre = approbation humaine requise.
        </p>
        <div className="flex items-center gap-3 text-[10px] text-soren-muted flex-wrap">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: LEVEL_META.read.bg }} /> lecture</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: LEVEL_META.write.bg }} /> écriture</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: LEVEL_META.action.bg }} /> action</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: LEVEL_META.archive.bg }} /> sensible</span>
          <span className="inline-flex items-center gap-1"><CircleDot size={10} className="text-[#B45309]" /> approbation</span>
        </div>
      </div>

      {/* Matrice */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-soren-app text-[10px] font-semibold uppercase tracking-wide text-soren-subtle px-3 py-2 align-bottom">Module</th>
              {matrix.map(a => (
                <th key={a.slug} className="px-3 py-2 align-bottom min-w-[150px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-medium text-soren-text leading-tight">{a.displayName}</span>
                    <span className="text-[10px] text-soren-muted">{ROLE_LABEL[a.role] ?? a.role}</span>
                    <span className="inline-flex items-center gap-2 mt-0.5 text-[9.5px] text-soren-subtle">
                      <span className="inline-flex items-center gap-0.5"><ShieldCheck size={10} />{a.permissions.length}</span>
                      <span className="inline-flex items-center gap-0.5"><KeyRound size={10} />{a.activeTokens}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'active' ? 'bg-[#16A34A]' : 'bg-[#9CA3AF]'}`} />
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((mod, i) => (
              <tr key={mod} className={i % 2 ? 'bg-soren-elevated/40' : ''}>
                <td className="sticky left-0 z-10 bg-soren-app px-3 py-2 text-[11.5px] font-mono text-soren-text border-t border-soren-border/50 align-top">{mod}</td>
                {matrix.map(a => {
                  const perms = cell(a, mod)
                  return (
                    <td key={a.slug} className="px-3 py-2 border-t border-soren-border/50 align-top">
                      {perms.length === 0 ? (
                        <span className="text-[11px] text-soren-muted/50">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {perms.map(p => {
                            const m = levelMeta(p.level)
                            return (
                              <span key={p.level} className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: m.bg, color: m.color }}>
                                {p.level}
                                {p.requiresApproval && <CircleDot size={8} className="text-[#B45309]" />}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

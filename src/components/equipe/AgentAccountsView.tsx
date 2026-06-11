'use client'

import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Bot, Activity, ShieldCheck, KeyRound, AlertTriangle, X, Power, HeartPulse,
  CircleDot, BookOpen, ChevronRight, CheckCircle2, XCircle, Clock,
} from 'lucide-react'
import OrgChart, { type OrgNode } from '@/components/agentic/OrgChart'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:       { label: 'Actif',        color: '#16A34A', bg: '#DCFCE7' },
  inactive:     { label: 'Inactif',      color: '#6B7280', bg: '#F3F4F6' },
  disabled:     { label: 'Désactivé',    color: '#DC2626', bg: '#FEE2E2' },
  maintenance:  { label: 'Maintenance',  color: '#D97706', bg: '#FEF3C7' },
  qr_required:  { label: 'QR requis',    color: '#7C3AED', bg: '#EDE9FE' },
  paused:       { label: 'En pause',     color: '#D97706', bg: '#FEF3C7' },
}
const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const StatusChip = ({ s }: { s: string }) => {
  const m = STATUS_META[s] ?? STATUS_META.inactive
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: m.bg, color: m.color }}><CircleDot size={9} />{m.label}</span>
}

export default function AgentAccountsView() {
  const agents = useQuery(api.agents.list, {})
  const approvals = useQuery(api.agents.pendingApprovals, {})
  const [openId, setOpenId] = useState<Id<'os_agents'> | null>(null)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-4 pb-3 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-soren-text tracking-[-0.02em]">Agents</h1>
          <p className="text-[11px] text-soren-subtle">Comptes machine Hermes — identités, permissions, runs & approbations</p>
        </div>
        {approvals && approvals.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
            <Clock size={13} /> {approvals.length} approbation{approvals.length > 1 ? 's' : ''} en attente
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {agents === undefined ? (
          <p className="text-[12px] text-soren-subtle">Chargement…</p>
        ) : agents.length === 0 ? (
          <p className="text-[12px] text-soren-subtle">Aucun agent. Lance le seed (<code>convex run agents:seedAgents</code>).</p>
        ) : (
          <>
            {(() => {
              // Organigramme agentique — coordinateur en haut, exécutants en dessous.
              // Photos des agents (public/agents), mappées par slug ; repli icône sinon.
              const AVATARS: Record<string, string> = {
                coordinator: '/agents/coo.png',
                cmo:         '/agents/analyse.png',
                csm:         '/agents/support.png',
                ops:         '/agents/operations.png',
                'kb-gbrain': '/agents/kb.png',
              }
              const toNode = (a: typeof agents[number]): OrgNode => ({ id: a.id, name: a.displayName ?? a.name, role: a.role, active: a.status === 'active', avatar: a.slug ? AVATARS[a.slug] : undefined })
              const coordinator = agents.find(a => a.slug === 'coordinator') ?? agents.find(a => a.hermesProfile === 'chief_of_staff') ?? agents[0]
              const reports = agents.filter(a => a.id !== coordinator.id)
              return (
                <div className="mb-5">
                  <OrgChart coordinator={toNode(coordinator)} reports={reports.map(toNode)} onSelect={(id) => setOpenId(id as Id<'os_agents'>)} />
                </div>
              )
            })()}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {agents.map(a => (
              <button key={a.id} onClick={() => setOpenId(a.id)}
                className="text-left bg-soren-card border border-soren-border rounded-2xl p-4 hover:border-[#C8CBD0] hover:shadow-sm transition-all flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center flex-shrink-0"><Bot size={16} /></div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-soren-text truncate">{a.displayName ?? a.name}</p>
                      <p className="text-[11px] text-soren-subtle truncate">{a.role}</p>
                    </div>
                  </div>
                  <StatusChip s={a.status} />
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-soren-muted">
                  {a.hermesProfile && <span className="px-1.5 py-0.5 rounded bg-soren-elevated font-mono">{a.hermesProfile}</span>}
                  {a.pendingApprovals > 0 && <span className="px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">{a.pendingApprovals} appro.</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] text-soren-subtle">
                  <span className="inline-flex items-center gap-1"><HeartPulse size={11} /> {fmt(a.lastHeartbeatAt)}</span>
                  <span className="inline-flex items-center gap-1"><ShieldCheck size={11} /> {a.permissionCount} perms</span>
                  <span className="inline-flex items-center gap-1"><BookOpen size={11} /> {(a.requiredKnowledgeCores?.length ?? 0)} cores</span>
                  {a.lastError ? <span className="inline-flex items-center gap-1 text-red-500"><AlertTriangle size={11} /> erreur</span> : <span className="inline-flex items-center gap-1"><Activity size={11} /> ok</span>}
                </div>
                {a.runtimeService && <p className="text-[9.5px] font-mono text-soren-subtle truncate">{a.runtimeService}</p>}
                <span className="text-[11px] text-[#FF4D00] font-medium inline-flex items-center gap-1 mt-auto">Détails <ChevronRight size={12} /></span>
              </button>
            ))}
            </div>
          </>
        )}
      </div>

      {openId && <AgentDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function AgentDrawer({ id, onClose }: { id: Id<'os_agents'>; onClose: () => void }) {
  const d = useQuery(api.agents.getDetail, { id })
  const setStatus = useMutation(api.agents.setStatus)
  const requestHeartbeat = useMutation(api.agents.requestHeartbeat)
  const reviewApproval = useMutation(api.agents.reviewApproval)
  const generateToken = useAction(api.agents.generateToken)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t border-soren-border pt-3 mt-3 first:border-0 first:mt-0 first:pt-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-soren-subtle mb-2">{title}</p>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-xl bg-soren-card h-full overflow-y-auto shadow-2xl border-l border-soren-border" onClick={e => e.stopPropagation()}>
        {d === undefined ? <p className="p-6 text-[12px] text-soren-subtle">Chargement…</p> : d === null ? <p className="p-6 text-[12px]">Introuvable.</p> : (
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center"><Bot size={18} /></div>
                <div className="min-w-0">
                  <p className="text-[16px] font-medium text-soren-text truncate">{d.displayName ?? d.name}</p>
                  <p className="text-[11px] text-soren-subtle">{d.role}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB]"><X size={15} /></button>
            </div>

            {/* Actions admin */}
            <div className="flex flex-wrap gap-2 mb-1">
              <StatusChip s={d.status} />
              {d.status === 'disabled'
                ? <button disabled={busy} onClick={async () => { setBusy(true); await setStatus({ id, status: 'active' }); setBusy(false) }} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#DCFCE7] text-[#16A34A] inline-flex items-center gap-1"><Power size={12} /> Réactiver</button>
                : <button disabled={busy} onClick={async () => { setBusy(true); await setStatus({ id, status: 'disabled' }); setBusy(false) }} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#FEE2E2] text-[#DC2626] inline-flex items-center gap-1"><Power size={12} /> Désactiver</button>}
              <button disabled={busy} onClick={() => requestHeartbeat({ id })} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-soren-elevated text-soren-text inline-flex items-center gap-1"><HeartPulse size={12} /> Demander heartbeat</button>
              <button disabled={busy} onClick={async () => { setBusy(true); const r = await generateToken({ agentId: id }); setNewToken(r.token); setBusy(false) }} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#0A0A0A] text-white inline-flex items-center gap-1"><KeyRound size={12} /> Régénérer token</button>
            </div>
            {newToken && (
              <div className="mt-2 p-2.5 rounded-lg bg-[#FEF9C3] border border-[#FDE68A] text-[11px]">
                <p className="font-semibold text-[#92400E] mb-1">Nouveau token (affiché une seule fois) :</p>
                <code className="block break-all font-mono text-[10.5px] text-[#111]">{newToken}</code>
              </div>
            )}

            <Section title="Identité">
              <div className="grid grid-cols-2 gap-y-1 text-[11.5px]">
                <span className="text-soren-subtle">Slug</span><span className="font-mono">{d.slug ?? '—'}</span>
                <span className="text-soren-subtle">Profil Hermes</span><span className="font-mono">{d.hermesProfile ?? '—'}</span>
                <span className="text-soren-subtle">Runtime</span><span className="font-mono text-[10.5px] break-all">{d.runtimeService ?? '—'}</span>
                <span className="text-soren-subtle">Dernier heartbeat</span><span>{fmt(d.lastHeartbeatAt)}</span>
                <span className="text-soren-subtle">Dernière activité</span><span>{fmt(d.lastSeenAt)}</span>
                {d.lastError && <><span className="text-red-500">Dernière erreur</span><span className="text-red-500 text-[10.5px]">{d.lastError}</span></>}
              </div>
              {d.description && <p className="text-[11.5px] text-soren-muted mt-2">{d.description}</p>}
            </Section>

            <Section title={`Permissions (${d.permissions.length})`}>
              <div className="flex flex-col gap-1">
                {d.permissions.map(p => (
                  <div key={p._id} className="flex items-center justify-between text-[11px] bg-soren-elevated rounded-lg px-2.5 py-1.5">
                    <span className="font-mono">{p.scope}{p.resource ? `/${p.resource}` : ''}</span>
                    <span className="flex items-center gap-2"><span className="text-soren-muted">{p.level}</span>{p.requiresApproval && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">approbation</span>}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Actions interdites">
              <ul className="text-[11px] text-soren-muted list-disc pl-4 space-y-0.5">
                {(d.forbiddenActions ?? []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </Section>

            <Section title="Cores de connaissance requis (GBrain)">
              <div className="flex flex-wrap gap-1.5">
                {(d.requiredKnowledgeCores ?? []).map((c, i) => <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-soren-elevated text-soren-muted">{c}</span>)}
              </div>
            </Section>

            <Section title={`Tokens (${d.tokens.length})`}>
              {d.tokens.length === 0 ? <p className="text-[11px] text-soren-subtle">Aucun token. Régénère pour en créer un.</p> : d.tokens.map(t => (
                <div key={t.id} className="flex items-center justify-between text-[11px] py-1">
                  <span className="font-mono">{t.label} · {t.mask}</span>
                  <span className="text-soren-subtle">{t.revokedAt ? 'révoqué' : t.scopes.length + ' scopes'}</span>
                </div>
              ))}
            </Section>

            {d.approvals.length > 0 && (
              <Section title="Approbations">
                {d.approvals.map(r => (
                  <div key={r._id} className="text-[11px] bg-soren-elevated rounded-lg px-2.5 py-2 mb-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.requestedAction}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: r.status === 'pending' ? '#FEF3C7' : r.status === 'approved' ? '#DCFCE7' : '#FEE2E2' }}>{r.status}</span>
                    </div>
                    {r.reason && <p className="text-soren-subtle mt-0.5">{r.reason}</p>}
                    {r.status === 'pending' && (
                      <div className="flex gap-2 mt-1.5">
                        <button onClick={() => reviewApproval({ id: r._id, decision: 'approve' })} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#16A34A] inline-flex items-center gap-1"><CheckCircle2 size={11} /> Approuver</button>
                        <button onClick={() => reviewApproval({ id: r._id, decision: 'reject' })} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FEE2E2] text-[#DC2626] inline-flex items-center gap-1"><XCircle size={11} /> Refuser</button>
                      </div>
                    )}
                  </div>
                ))}
              </Section>
            )}

            <Section title={`Runs récents (${d.runs.length})`}>
              {d.runs.length === 0 ? <p className="text-[11px] text-soren-subtle">Aucun run.</p> : d.runs.map(r => (
                <div key={r._id} className="flex items-center justify-between text-[11px] py-1 border-b border-soren-border/50 last:border-0">
                  <span className="truncate">{r.inputSummary ?? r.taskId ?? 'run'}</span>
                  <span className="text-soren-subtle flex items-center gap-2"><span>{r.status}</span><span>{fmt(r.finishedAt ?? r.startedAt ?? r.createdAt)}</span></span>
                </div>
              ))}
            </Section>

            <Section title={`Activité / events (${d.events.length})`}>
              {d.events.slice(0, 12).map(e => (
                <div key={e._id} className="flex items-center justify-between text-[11px] py-0.5">
                  <span className="font-mono text-soren-muted">{e.eventType}</span>
                  <span className="text-soren-subtle">{fmt(e.createdAt)}</span>
                </div>
              ))}
            </Section>

            {d.runbookUrl && <a href={d.runbookUrl} className="block mt-3 text-[11px] text-[#FF4D00] font-medium">Runbook / Control Room →</a>}
          </div>
        )}
      </div>
    </div>
  )
}

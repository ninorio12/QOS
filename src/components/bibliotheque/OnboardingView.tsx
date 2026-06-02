'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Rocket, CheckCircle2, Circle, ChevronRight, ChevronDown, Eye, Download,
  Upload, CalendarPlus, FileSignature, ClipboardList, Check, FileCheck2, CreditCard,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type ClientLite = { id: string; ghl_contact_id?: string; name: string; company: string; value: number }
type FullContact = { id: string; firstName?: string; lastName?: string; companyName?: string; address1?: string; phone?: string; email?: string }
type SignedContract = { fileName: string; storageId?: string; dataUrl?: string; uploadedAt: string }
type OnboardingDoc = {
  contactId: string
  tasks?: Record<string, boolean>
  payment?: { installments: number; amounts: number[] }
  paidStatus?: boolean[]
  paidDates?: string[]
  refunds?: { amount: number; date: string; note?: string }[]
  signedContract?: SignedContract
  form?: Record<string, { value?: string; status?: string }>
}

type FormStatus = 'prêt' | 'manquant' | 'bloqué' | 'à voir en appel'
const STATUS_OPTS: FormStatus[] = ['prêt', 'manquant', 'bloqué', 'à voir en appel']
const STATUS_COLOR: Record<FormStatus, { bg: string; color: string }> = {
  'prêt':           { bg: '#DCFCE7', color: '#16A34A' },
  'manquant':       { bg: '#FEF2F2', color: '#DC2626' },
  'bloqué':         { bg: '#FEF9C3', color: '#CA8A04' },
  'à voir en appel':{ bg: '#EFF6FF', color: '#2563EB' },
}

const FORM_FIELDS: { key: string; label: string; desc: string; type: 'key' | 'toggle' }[] = [
  { key: 'browserUse',   label: 'Browser Use',          desc: "Permet à votre agent IA d'utiliser un navigateur quand nécessaire", type: 'key' },
  { key: 'gemini',       label: 'Gemini (Google AI Studio)', desc: 'Text-to-speech — transformer du texte en voix naturelle', type: 'key' },
  { key: 'falAi',        label: 'Fal AI',               desc: 'Génère images et vidéos', type: 'key' },
  { key: 'firecrawl',    label: 'Firecrawl',            desc: 'Lit proprement des pages web et récupère du contenu', type: 'key' },
  { key: 'vercel',       label: 'Vercel',               desc: 'Déploie votre Data OS et vos applications web', type: 'key' },
  { key: 'convex',       label: 'Convex',               desc: 'Base de données temps réel du Data OS', type: 'key' },
  { key: 'gmailApi',     label: 'API Gmail',            desc: 'Connexion à la boîte Gmail du client', type: 'key' },
  { key: 'microsoftApi', label: 'API Microsoft',        desc: 'Connexion Outlook / Microsoft 365', type: 'key' },
  { key: 'yahooApi',     label: 'API Yahoo',            desc: 'Connexion à la boîte Yahoo', type: 'key' },
  { key: 'serverIp',     label: 'IP du serveur',        desc: 'Adresse IP du serveur du client', type: 'key' },
  { key: 'serverPassword', label: 'Password serveur',   desc: 'Mot de passe du serveur', type: 'key' },
  { key: 'codexSubscription', label: 'Abonnement Codex', desc: 'Abonnement Codex actif ?', type: 'toggle' },
]

function fmt(n: number) { return `${Math.round(n).toLocaleString('fr-FR')} €` }

// ─── Main ─────────────────────────────────────────────────────
export default function OnboardingView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetContact = searchParams?.get('contact') ?? null
  const liveClients = useQuery(api.pipeline_clients.list)
  const [clients, setClients] = useState<ClientLite[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!liveClients) return
    const cs = (liveClients as (ClientLite & { _id: string })[]).map(c => ({ id: c._id, ghl_contact_id: c.ghl_contact_id, name: c.name, company: c.company, value: c.value }))
    setClients(cs)
    setSelected(prev => {
      // Prefer the ?contact target if it matches a client
      if (targetContact && cs.some(c => (c.ghl_contact_id ?? c.id) === targetContact)) return targetContact
      return prev ?? (cs.length ? (cs[0].ghl_contact_id ?? cs[0].id) : null)
    })
  }, [liveClients, targetContact])

  const current = clients.find(c => (c.ghl_contact_id ?? c.id) === selected) ?? null

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      <div className="md:w-72 flex-shrink-0 border-r border-soren-border flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide">
            <Rocket size={14} className="text-[#FF4D00]" />
            <span className="text-soren-subtle">VIVIDFLOW</span>
            <ChevronRight size={11} className="text-soren-subtle" />
            <span className="text-soren-text">ONBOARDING</span>
          </div>
          <p className="text-[11px] text-soren-subtle mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} en cours</p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-1">
          {clients.length === 0 && (
            <p className="text-[12px] text-soren-subtle px-3 py-4 text-center">Aucun client — convertis un lead en client pour démarrer son onboarding.</p>
          )}
          {clients.map(c => {
            const cid = c.ghl_contact_id ?? c.id
            const active = selected === cid
            return (
              <button key={c.id} onClick={() => setSelected(cid)}
                className={`text-left px-3 py-2.5 rounded-xl transition-colors ${active ? 'bg-[#FF4D00] text-white' : 'hover:bg-soren-elevated text-soren-text'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold truncate">{c.name}</span>
                  <ChevronRight size={13} className={active ? 'text-white/80' : 'text-soren-subtle'} />
                </div>
                <span className={`text-[10px] ${active ? 'text-white/70' : 'text-soren-subtle'}`}>{c.company || 'Client'} · {fmt(c.value)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {current ? (
          <ClientOnboarding key={selected} client={current} contactId={selected!} router={router} />
        ) : (
          <div className="h-full flex items-center justify-center text-[13px] text-soren-subtle">Sélectionne un client</div>
        )}
      </div>
    </div>
  )
}

// ─── Per-client onboarding ────────────────────────────────────
function ClientOnboarding({ client, contactId, router }: { client: ClientLite; contactId: string; router: ReturnType<typeof useRouter> }) {
  const live = useQuery(api.onboarding.getByContact, { contactId })
  const [doc, setDoc] = useState<OnboardingDoc | null>(null)
  const [full, setFull] = useState<FullContact | null>(null)

  useEffect(() => { if (live !== undefined) setDoc((live as OnboardingDoc) ?? { contactId }) }, [live, contactId])
  useEffect(() => {
    fetch(`/api/contact/${contactId}`).then(r => r.json()).then((d: { contact?: FullContact }) => setFull(d.contact ?? null)).catch(() => {})
  }, [contactId])

  const save = useCallback((patch: Partial<OnboardingDoc>) => {
    setDoc(prev => ({ ...(prev ?? { contactId }), ...patch }))
    fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId, ...patch }) }).catch(() => {})
  }, [contactId])

  const tasks = doc?.tasks ?? {}
  const setTask = (k: string, v: boolean) => save({ tasks: { ...tasks, [k]: v } })

  const steps = ['contractSent', 'formSent', 'kickoffPlanned']
  const doneCount = steps.filter(s => tasks[s]).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-soren-text">{client.name}</h2>
        <p className="text-[12px] text-soren-muted">{client.company || 'Client'} · Deal {fmt(client.value)}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-soren-elevated overflow-hidden">
            <div className="h-full bg-[#FF4D00] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-bold text-soren-text">{pct}%</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF4D00]">Semaine 1 — Lancement</span>
        <div className="flex-1 h-px bg-soren-border" />
      </div>

      <ContractStep
        done={!!tasks.contractSent}
        onToggle={v => setTask('contractSent', v)}
        client={client} full={full}
        payment={doc?.payment}
        signed={doc?.signedContract}
        onPayment={p => save({ payment: p })}
        onSigned={s => save({ signedContract: s })}
        onGenerated={() => save({ contractGenerated: true })}
      />

      <OnboardingForm
        done={!!tasks.formSent}
        onToggle={v => setTask('formSent', v)}
        form={doc?.form ?? {}}
        onForm={f => save({ form: f })}
      />

      <StepCard icon={<CalendarPlus size={16} />} title="Kickoff call — planifier" done={!!tasks.kickoffPlanned} onToggle={v => setTask('kickoffPlanned', v)}>
        <button
          onClick={() => router.push(`/calendrier?new=1&contact=${contactId}&name=${encodeURIComponent(client.name)}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-soren-sidebar text-white text-[12px] font-semibold hover:bg-[#2a2a2a] transition-colors"
        >
          <CalendarPlus size={14} /> Générer un rendez-vous
        </button>
      </StepCard>

      <PaymentPhase
        amounts={doc?.payment?.amounts ?? [client.value]}
        paidStatus={doc?.paidStatus ?? []}
        paidDates={doc?.paidDates ?? []}
        onPay={(paidStatus, paidDates) => save({ paidStatus, paidDates })}
      />
    </div>
  )
}

// ─── Payment phase (per client) — dashboard style ─────────────
function PaymentPhase({ amounts, paidStatus, paidDates, onPay }: {
  amounts: number[]; paidStatus: boolean[]; paidDates: string[]
  onPay: (paidStatus: boolean[], paidDates: string[]) => void
}) {
  const total    = amounts.reduce((s, a) => s + a, 0)
  const encaisse = amounts.reduce((s, a, i) => s + (paidStatus[i] ? a : 0), 0)
  const attente  = total - encaisse
  const allPaid  = amounts.length > 0 && amounts.every((_, i) => paidStatus[i])

  function togglePaid(i: number) {
    const ps = amounts.map((_, j) => j === i ? !paidStatus[j] : !!paidStatus[j])
    const pd = amounts.map((_, j) => j === i ? (ps[j] ? new Date().toISOString().split('T')[0] : '') : (paidDates[j] ?? ''))
    onPay(ps, pd)
  }

  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        {allPaid ? <CheckCircle2 size={20} className="text-[#16A34A]" /> : <Circle size={20} className="text-soren-subtle" />}
        <span className="flex items-center gap-2 text-[14px] font-bold text-soren-text flex-1"><CreditCard size={16} />Paiement</span>
      </div>
      <div className="pl-8 flex flex-col gap-3">
        {/* mini cards dashboard-style */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-soren-elevated rounded-xl p-3">
            <span className="text-[10px] text-soren-muted">Total</span>
            <p className="text-[18px] font-black text-soren-text tabular-nums">{fmt(total)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#DCFCE7' }}>
            <span className="text-[10px]" style={{ color: '#16A34A' }}>Encaissé</span>
            <p className="text-[18px] font-black tabular-nums" style={{ color: '#16A34A' }}>{fmt(encaisse)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#FEF9C3' }}>
            <span className="text-[10px]" style={{ color: '#CA8A04' }}>En attente</span>
            <p className="text-[18px] font-black tabular-nums" style={{ color: '#CA8A04' }}>{fmt(attente)}</p>
          </div>
        </div>
        {/* installments */}
        <div className="flex flex-col gap-1.5">
          {amounts.map((a, i) => {
            const paid = !!paidStatus[i]
            return (
              <div key={i} className="flex items-center gap-3 bg-soren-elevated rounded-xl px-3 py-2.5">
                <button onClick={() => togglePaid(i)}>
                  {paid ? <CheckCircle2 size={18} className="text-[#16A34A]" /> : <Circle size={18} className="text-soren-subtle" />}
                </button>
                <span className="text-[12px] font-semibold text-soren-text flex-1">
                  {amounts.length > 1 ? `Échéance ${i + 1}/${amounts.length}` : 'Paiement'}
                  {paid && paidDates[i] && <span className="text-[10px] text-soren-subtle font-normal ml-2">encaissé le {new Date(paidDates[i]).toLocaleDateString('fr-FR')}</span>}
                </span>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: paid ? '#16A34A' : '#374151' }}>{fmt(a)}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={paid ? { background: '#DCFCE7', color: '#16A34A' } : { background: '#FEF9C3', color: '#CA8A04' }}>
                  {paid ? 'encaissé' : 'à payer'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StepCard({ icon, title, done, onToggle, children, extra }: {
  icon: React.ReactNode; title: string; done: boolean; onToggle: (v: boolean) => void; children?: React.ReactNode; extra?: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={() => onToggle(!done)} className="flex-shrink-0">
          {done ? <CheckCircle2 size={20} className="text-[#16A34A]" /> : <Circle size={20} className="text-soren-subtle" />}
        </button>
        <span className="flex items-center gap-2 text-[14px] font-bold text-soren-text flex-1">{icon}{title}</span>
        {extra}
        <button onClick={() => setOpen(o => !o)} className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-soren-elevated flex items-center justify-center transition-colors">
          <ChevronDown size={15} className="text-soren-subtle transition-transform duration-200" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
        </button>
      </div>
      {children && (
        <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 240ms cubic-bezier(0.4,0,0.2,1)' }}>
          <div style={{ overflow: 'hidden' }}><div className="pl-8">{children}</div></div>
        </div>
      )}
    </div>
  )
}

function SignedContractView({ signed, onReplace }: { signed: SignedContract; onReplace: () => void }) {
  const url = useQuery(api.files.getUrl, signed.storageId ? { storageId: signed.storageId } : 'skip')
  const href = url ?? signed.dataUrl ?? '#'
  return (
    <div className="flex items-center gap-2 bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl px-3 py-2.5">
      <FileCheck2 size={15} className="text-[#16A34A]" />
      <span className="text-[12px] font-semibold text-[#16A34A] flex-1 truncate">{signed.fileName}</span>
      <a href={href} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[#16A34A] underline">Voir</a>
      <button onClick={onReplace} className="text-[11px] text-soren-muted hover:text-soren-text">Remplacer</button>
    </div>
  )
}

function ContractStep({ done, onToggle, client, full, payment, signed, onPayment, onSigned, onGenerated }: {
  done: boolean; onToggle: (v: boolean) => void; client: ClientLite; full: FullContact | null
  payment?: { installments: number; amounts: number[] }
  signed?: SignedContract
  onPayment: (p: { installments: number; amounts: number[] }) => void
  onSigned: (s: SignedContract) => void
  onGenerated: () => void
}) {
  const genUploadUrl = useMutation(api.files.generateUploadUrl)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const installments = payment?.installments ?? 1
  const amounts = payment?.amounts ?? [client.value]

  function setInstallments(n: number) {
    const each = Math.round((client.value / n) * 100) / 100
    const arr = Array.from({ length: n }, (_, i) => i === n - 1 ? client.value - each * (n - 1) : each)
    onPayment({ installments: n, amounts: arr })
  }
  function setAmount(i: number, v: number) {
    const arr = [...amounts]; arr[i] = v
    onPayment({ installments, amounts: arr })
  }

  async function generate(preview: boolean) {
    setBusy(true)
    try {
      const res = await fetch('/api/onboarding/contract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: client.name, company: client.company || full?.companyName, address: full?.address1,
          phone: full?.phone, email: full?.email, representant: client.name,
          amount: client.value, installments, amounts, currency: 'CHF', preview,
        }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (preview) { window.open(url, '_blank') }
      else { const a = document.createElement('a'); a.href = url; a.download = `contrat-${client.name}.pdf`; a.click() }
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      onGenerated()
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const uploadUrl = await genUploadUrl()
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
      const { storageId } = await res.json() as { storageId: string }
      onSigned({ fileName: file.name, storageId, uploadedAt: new Date().toISOString() })
    } catch { /* ignore */ } finally { setUploading(false) }
  }

  return (
    <StepCard icon={<FileSignature size={16} />} title="Envoi du contrat" done={done} onToggle={onToggle}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => generate(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-soren-border text-[12px] font-semibold text-soren-text hover:bg-soren-elevated disabled:opacity-50 transition-colors">
            <Eye size={13} /> Aperçu PDF
          </button>
          <button disabled={busy} onClick={() => generate(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF4D00] text-white text-[12px] font-semibold hover:bg-[#e64500] disabled:opacity-50 transition-colors">
            <Download size={13} /> {busy ? 'Génération…' : 'Générer & télécharger'}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-soren-muted">Modalités de paiement — Total {fmt(client.value)}</span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setInstallments(n)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all ${installments === n ? 'border-[#FF4D00] bg-[#FF4D00]/10 text-[#FF4D00]' : 'border-soren-border text-soren-muted hover:bg-soren-elevated'}`}>
                {n === 1 ? '1 fois' : `${n} fois`}
              </button>
            ))}
          </div>
          {installments > 1 && (
            <div className="grid grid-cols-3 gap-2 mt-1">
              {amounts.map((a, i) => (
                <div key={i}>
                  <label className="text-[10px] text-soren-subtle">Échéance {i + 1}</label>
                  <input type="number" value={a} onChange={e => setAmount(i, parseFloat(e.target.value) || 0)}
                    className="w-full bg-soren-elevated rounded-lg px-2 py-1.5 text-[12px] text-soren-text outline-none focus:ring-2 focus:ring-[#FF4D00]/30" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-soren-muted">Contrat signé</span>
          {signed ? (
            <SignedContractView signed={signed} onReplace={() => fileRef.current?.click()} />
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-1.5 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${dragOver ? 'border-[#FF4D00] bg-[#FF4D00]/5' : 'border-soren-border hover:border-[#C8CBD0]'}`}
            >
              <Upload size={18} className="text-soren-subtle" />
              <span className="text-[11px] text-soren-subtle">{uploading ? 'Upload en cours…' : 'Glisse le contrat signé ici, ou clique pour parcourir'}</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      </div>
    </StepCard>
  )
}

function OnboardingForm({ done, onToggle, form, onForm }: {
  done: boolean; onToggle: (v: boolean) => void
  form: Record<string, { value?: string; status?: string }>
  onForm: (f: Record<string, { value?: string; status?: string }>) => void
}) {
  function setField(key: string, patch: { value?: string; status?: string }) {
    onForm({ ...form, [key]: { ...form[key], ...patch } })
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { 'prêt': 0, 'manquant': 0, 'bloqué': 0, 'à voir en appel': 0 }
    for (const f of FORM_FIELDS) {
      const st = form[f.key]?.status as FormStatus | undefined
      if (st && c[st] !== undefined) c[st]++
    }
    return c
  }, [form])

  return (
    <StepCard icon={<ClipboardList size={16} />} title="Formulaire d'onboarding" done={done} onToggle={onToggle}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map(s => (
            <span key={s} className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: STATUS_COLOR[s].bg, color: STATUS_COLOR[s].color }}>
              {counts[s]} {s}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {FORM_FIELDS.map(f => {
            const cur = form[f.key] ?? {}
            return (
              <div key={f.key} className="bg-soren-elevated rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-bold text-soren-text">{f.label}</p>
                    <p className="text-[10px] text-soren-subtle leading-tight">{f.desc}</p>
                  </div>
                  {f.type === 'toggle' && (
                    <button onClick={() => setField(f.key, { value: cur.value === 'fait' ? '' : 'fait' })}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border-2 transition-all flex-shrink-0 ${cur.value === 'fait' ? 'border-[#16A34A] bg-[#DCFCE7] text-[#16A34A]' : 'border-soren-border text-soren-muted'}`}>
                      {cur.value === 'fait' ? '✓ Fait' : 'Pas fait'}
                    </button>
                  )}
                </div>
                {f.type === 'key' && (
                  <input value={cur.value ?? ''} onChange={e => setField(f.key, { value: e.target.value })}
                    placeholder="Coller la clé / valeur…"
                    className="w-full bg-soren-card border border-soren-border rounded-lg px-2.5 py-1.5 text-[11px] text-soren-text outline-none focus:ring-2 focus:ring-[#3462EE]/30" />
                )}
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTS.map(s => {
                    const on = cur.status === s
                    return (
                      <button key={s} onClick={() => setField(f.key, { status: on ? undefined : s })}
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all"
                        style={on
                          ? { background: STATUS_COLOR[s].bg, color: STATUS_COLOR[s].color, borderColor: STATUS_COLOR[s].color }
                          : { background: '#fff', color: '#9CA3AF', borderColor: '#E5E7EB' }}>
                        {on && <Check size={8} className="inline mr-0.5" />}{s}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </StepCard>
  )
}

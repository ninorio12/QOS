'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { fmtMoney } from '@/lib/money'

const CONTRACT_CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP']
import {
  CheckCircle2, Circle, ChevronRight, ChevronDown, Eye, EyeOff, Copy, Download, Search,
  Upload, CalendarPlus, FileSignature, ClipboardList, Check, FileCheck2, CreditCard,
  RefreshCw, Trash2, ArrowDownUp,
} from 'lucide-react'

const NewContactModal = dynamic(() => import('@/components/contacts/NewContactModal'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────
type ClientLite = { id: string; ghl_contact_id?: string; name: string; company: string; value: number; createdAt: number }
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
  form?: Record<string, Record<string, unknown>>   // soumission publique : { sectionId: { fieldKey: value } }
  formReceivedAt?: string
  contractGenerated?: boolean
  kickoffEventId?: string
}

function fmt(n: number) { return `${Math.round(n).toLocaleString('fr-FR')} CHF` }

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
    const cs = (liveClients as ({ _id: string; _creationTime: number; ghl_contact_id?: string; name: string; company: string; value: number })[]).map(c => ({ id: c._id, ghl_contact_id: c.ghl_contact_id, name: c.name, company: c.company, value: c.value, createdAt: c._creationTime }))
    setClients(cs)
    setSelected(prev => {
      // Prefer the ?contact target if it matches a client
      if (targetContact && cs.some(c => (c.ghl_contact_id ?? c.id) === targetContact)) return targetContact
      return prev ?? (cs.length ? (cs[0].ghl_contact_id ?? cs[0].id) : null)
    })
  }, [liveClients, targetContact])

  const current = clients.find(c => (c.ghl_contact_id ?? c.id) === selected) ?? null
  const [ficheContact, setFicheContact] = useState<Record<string, unknown> | null>(null)

  async function openFiche(cid: string, name: string) {
    try {
      const res = await fetch(`/api/contact/${cid}`)
      const data = await res.json() as { contact?: Record<string, unknown> }
      setFicheContact({ ...(data.contact ?? {}), id: cid, contactName: name })
    } catch {
      setFicheContact({ id: cid, contactName: name })
    }
  }

  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'recent' | 'old'>('recent')
  const visibleClients = useMemo(() => {
    const q = search.toLowerCase().trim()
    const arr = q ? clients.filter(c => `${c.name} ${c.company}`.toLowerCase().includes(q)) : clients
    return [...arr].sort((a, b) => sortOrder === 'recent' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt)
  }, [clients, search, sortOrder])

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      <div className="w-full md:w-72 flex-shrink-0 border-r border-soren-border flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex-shrink-0 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-[11px] text-soren-subtle">{clients.length} client{clients.length !== 1 ? 's' : ''} en cours</p>
            <button
              onClick={() => setSortOrder(o => o === 'recent' ? 'old' : 'recent')}
              title="Changer l'ordre de tri"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-soren-muted hover:text-soren-text bg-soren-elevated rounded-full px-2.5 py-1 transition-colors flex-shrink-0"
            >
              <ArrowDownUp size={12} /> {sortOrder === 'recent' ? 'Plus récents' : 'Plus anciens'}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-soren-elevated rounded-xl px-3 py-2">
            <Search size={13} className="text-soren-subtle flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client…"
              className="flex-1 bg-transparent text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-1" data-stagger>
          {clients.length === 0 && (
            <p className="text-[12px] text-soren-subtle px-3 py-4 text-center">Aucun client — convertis un lead en client pour démarrer son onboarding.</p>
          )}
          {visibleClients.map(c => {
            const cid = c.ghl_contact_id ?? c.id
            const active = selected === cid
            return (
              <div key={c.id} role="button" tabIndex={0} onClick={() => setSelected(cid)}
                className={`cursor-pointer text-left px-3 py-2.5 rounded-xl transition-colors ${active ? 'bg-[#FF4D00] text-white' : 'hover:bg-soren-elevated text-soren-text'}`}>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); void openFiche(cid, c.name) }}
                    title="Ouvrir la fiche contact"
                    className="text-[13px] font-semibold truncate text-left hover:underline underline-offset-2"
                  >
                    {c.name}
                  </button>
                  <ChevronRight size={13} className={active ? 'text-white/80' : 'text-soren-subtle'} />
                </div>
                <span className={`text-[10px] ${active ? 'text-white/70' : 'text-soren-subtle'}`}>{c.company || 'Client'} · {fmt(c.value)}</span>
              </div>
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

      {ficheContact && (
        <NewContactModal
          contact={ficheContact as never}
          initialStatut={(ficheContact.statut as 'lead' | 'client' | 'perdu' | undefined) ?? 'client'}
          initialCanton={(ficheContact.canton as string | undefined) ?? ''}
          onClose={() => setFicheContact(null)}
          onSave={() => setFicheContact(null)}
        />
      )}
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

  // Le paiement compte comme 4e étape : 100% seulement quand tout est encaissé.
  const pAmounts = doc?.payment?.amounts ?? [client.value]
  const pPaid = doc?.paidStatus ?? []
  const allPaid = pAmounts.length > 0 && pAmounts.every((_, i) => pPaid[i])
  const steps = [!!tasks.contractSent, !!tasks.formSent, !!tasks.kickoffPlanned, allPaid]
  const doneCount = steps.filter(Boolean).length
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
        done={!!tasks.formSent || !!doc?.formReceivedAt}
        onToggle={v => setTask('formSent', v)}
        form={doc?.form ?? {}}
        receivedAt={doc?.formReceivedAt}
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
        <span className="flex items-center gap-2 text-[13px] font-normal text-soren-text flex-1"><CreditCard size={16} />Paiement</span>
      </div>
      <div className="pl-8 flex flex-col gap-3">
        {/* cards — refined palette */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3" style={{ background: '#FF4D00' }}>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>Total</span>
            <p className="text-[18px] font-black tabular-nums" style={{ color: '#fff' }}>{fmt(total)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#1C1C1E' }}>
            <span className="text-[10px]" style={{ color: '#888' }}>Encaissé</span>
            <p className="text-[18px] font-black tabular-nums" style={{ color: '#fff' }}>{fmt(encaisse)}</p>
          </div>
          <div className="rounded-xl p-3 border border-soren-border" style={{ background: 'var(--bg-elevated)' }}>
            <span className="text-[10px]" style={{ color: '#888' }}>En attente</span>
            <p className="text-[18px] font-black tabular-nums" style={{ color: 'var(--text)' }}>{fmt(attente)}</p>
          </div>
        </div>
        {/* installments — table lines */}
        <div className="border border-soren-border rounded-xl overflow-hidden">
          {amounts.map((a, i) => {
            const paid = !!paidStatus[i]
            return (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-soren-border/60 last:border-0 hover:bg-soren-elevated/50 transition-colors">
                <button onClick={() => togglePaid(i)}>
                  {paid ? <CheckCircle2 size={17} style={{ color: '#059669' }} /> : <Circle size={17} className="text-soren-subtle" />}
                </button>
                <span className="text-[12px] font-semibold text-soren-text flex-1">
                  {amounts.length > 1 ? `Échéance ${i + 1}/${amounts.length}` : 'Paiement'}
                  {paid && paidDates[i] && <span className="text-[10px] text-soren-subtle font-normal ml-2">le {new Date(paidDates[i]).toLocaleDateString('fr-FR')}</span>}
                </span>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: paid ? '#059669' : '#374151' }}>{fmt(a)}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={paid ? { background: '#F0FDF9', color: '#059669' } : { background: '#FFFBEB', color: '#D97706' }}>
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
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={() => onToggle(!done)} className="flex-shrink-0">
          {done ? <CheckCircle2 size={20} className="text-[#16A34A]" /> : <Circle size={20} className="text-soren-subtle" />}
        </button>
        <span className="flex items-center gap-2 text-[13px] font-normal text-soren-text flex-1">{icon}{title}</span>
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

function SignedContractView({ signed, onReplace, onDelete }: { signed: SignedContract; onReplace: () => void; onDelete: () => void }) {
  const url = useQuery(api.files.getUrl, signed.storageId ? { storageId: signed.storageId } : 'skip')
  const href = url ?? signed.dataUrl ?? '#'
  const BLUE = '#2563EB'
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
      <FileCheck2 size={15} style={{ color: BLUE }} />
      <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: BLUE }}>{signed.fileName}</span>
      <a href={href} target="_blank" rel="noreferrer" title="Voir"
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#DBEAFE] transition-colors" style={{ color: BLUE }}>
        <Eye size={14} />
      </a>
      <button onClick={onReplace} title="Remplacer"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-soren-muted hover:text-soren-text hover:bg-soren-elevated transition-colors">
        <RefreshCw size={14} />
      </button>
      <button onClick={onDelete} title="Supprimer"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-soren-muted hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
        <Trash2 size={14} />
      </button>
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
  const [currency, setCurrency] = useState('CHF')
  const cfmt = (n: number) => fmtMoney(n, currency)
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
          amount: client.value, installments, amounts, currency, preview,
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
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] text-soren-muted">Devise</span>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="text-[12px] font-semibold text-soren-text bg-soren-elevated border border-soren-border rounded-xl px-2.5 py-2 outline-none cursor-pointer">
              {CONTRACT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-soren-muted">Modalités de paiement — Total {cfmt(client.value)}</span>
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
          {signed?.fileName ? (
            <SignedContractView
              signed={signed}
              onReplace={() => fileRef.current?.click()}
              onDelete={() => onSigned({ fileName: '', uploadedAt: new Date().toISOString() })}
            />
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

// Rend une valeur soumise (string / number / array) en élément lisible. null si vide.
// —— Labels lisibles + détection des secrets pour le miroir exhaustif ——
const SECTION_LABELS: Record<string, string> = {
  company: 'Entreprise', you: 'Vous', objectives: 'Objectifs', departments: 'Départements',
  tools: 'Outils', method: 'Méthode', accounts: 'Accès & comptes', modules: 'Modules', kickoff: 'Kick-off',
}
const FIELD_LABELS: Record<string, string> = {
  companyName: "Nom de l'entreprise", website: 'Site web', address: 'Adresse principale', canton: 'Canton / région',
  location: 'Localisation', teamSize: "Taille de l'équipe", sector: 'Activité', businessModel: 'Modèle économique',
  activityLine: "Description de l'activité", revenue: "Chiffre d'affaires mensuel", revenuePeriod: 'Période',
  contextNote: 'Contexte', firstName: 'Prénom', lastName: 'Nom', email: 'Email', phone: 'Téléphone', role: 'Rôle',
  departments: 'Départements concernés', departmentsOther: 'Autre département', orgDetails: 'Précisions organisation',
  priorityProblemTags: 'Sujets prioritaires', priorityProblem: 'Problèmes à résoudre',
  timeWasters: 'Pertes de temps', aiWeekly: 'Attentes IA', toolFamilies: "Familles d'outils", toolsDetails: 'Détails outils',
}
// Comptes groupés par module (VPS multi-champs, boîte mail multi-champs, le reste = 1 champ).
const ACCOUNT_GROUPS: { title: string; fields: [string, string][] }[] = [
  { title: 'VPS', fields: [['vps_access', 'Connexion SSH'], ['vps_key', 'Clé privée'], ['vps_pub', 'Clé publique']] },
  { title: 'Codex / OpenAI', fields: [['llm_access', '']] },
  { title: 'Vercel', fields: [['vercel_access', '']] },
  { title: 'Convex', fields: [['convex_access', '']] },
  { title: 'FAL.IA', fields: [['fal_access', '']] },
  { title: 'Nous Research', fields: [['hermes_access', '']] },
  { title: 'Boîte mail', fields: [
    ['workspace_provider', 'Fournisseur'], ['workspace_google_json', 'Clé JSON (Google)'],
    ['workspace_microsoft_client_id', 'ID application (client)'], ['workspace_microsoft_tenant_id', 'ID annuaire (locataire)'],
    ['workspace_microsoft_client_secret', 'Valeur du secret client'],
    ['workspace_yahoo_client_id', 'Client ID (Yahoo)'], ['workspace_yahoo_client_secret', 'Client Secret (Yahoo)'],
  ] },
]
const ACCOUNT_GROUP_KEYS = ACCOUNT_GROUPS.flatMap(g => g.fields.map(f => f[0]))
const humanizeKey = (k: string) => FIELD_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const humanizeSection = (s: string) => SECTION_LABELS[s] || s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const isSecretKey = (k: string) => /(_key|_pub|_secret|_json|_access)$/i.test(k) || /secret|token|private/i.test(k)

// Schéma canonique : ce qu'on attend du formulaire actuel (pour afficher « Non renseigné » sur les vides).
const SCHEMA: { id: string; title: string; keys: string[] }[] = [
  { id: 'company', title: 'Entreprise', keys: ['companyName', 'website', 'address', 'canton', 'sector', 'activityLine', 'teamSize', 'revenue', 'contextNote'] },
  { id: 'objectives', title: 'Objectifs', keys: ['priorityProblemTags', 'priorityProblem'] },
  { id: 'departments', title: 'Départements', keys: ['departments', 'departmentsOther'] },
]
const SCHEMA_IDS = SCHEMA.map(s => s.id)
const hasValue = (v: unknown) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      title={copied ? 'Copié' : 'Copier'}
      onClick={() => { try { navigator.clipboard?.writeText(text) } catch { /* noop */ }; setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className="text-soren-subtle hover:text-soren-text transition"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  )
}

// Ligne sobre du miroir : label + valeur (ou « Non renseigné »). Secret = mono + œil. Actions discrètes à droite.
function MirrorRow({ fieldKey, value, label, compact }: { fieldKey: string; value: unknown; label?: string; compact?: boolean }) {
  const [show, setShow] = useState(true)
  const empty = !hasValue(value)
  const isArr = Array.isArray(value)
  const str = isArr ? (value as unknown[]).join(', ') : String(value ?? '')
  const secret = !empty && !isArr && isSecretKey(fieldKey)
  return (
    <div className={`flex items-start justify-between gap-3 ${compact ? '' : 'px-3.5 py-2.5'}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-medium text-soren-subtle">{label ?? humanizeKey(fieldKey)}</p>
        {empty
          ? <span className="inline-flex w-fit items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FF4D00]/10 text-[#FF4D00] mt-1">Non renseigné</span>
          : isArr
            ? <div className="flex flex-wrap gap-1.5 mt-1">{(value as unknown[]).map((v, i) => (<span key={i} className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-soren-elevated text-soren-text">{String(v)}</span>))}</div>
            : secret
              ? <p className="font-mono text-[11.5px] text-soren-text break-all mt-1 leading-relaxed">{show ? str : '•'.repeat(Math.min(str.length, 32))}</p>
              : <p className="text-[12.5px] text-soren-text whitespace-pre-wrap mt-0.5 leading-snug">{str}</p>}
      </div>
      {!empty && (
        <div className="flex items-center gap-2.5 flex-shrink-0 pt-0.5">
          {secret && (
            <button title={show ? 'Cacher' : 'Voir'} onClick={() => setShow(s => !s)} className="text-soren-subtle hover:text-soren-text transition">
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
          <CopyBtn text={str} />
        </div>
      )}
    </div>
  )
}

// Bloc compte : module multi-champs (VPS, Boîte mail) = sous-titre + sous-lignes indentées. Mono-champ = une ligne.
function AccountBlock({ group, data }: { group: { title: string; fields: [string, string][] }; data: Record<string, unknown> }) {
  if (group.fields.length === 1) {
    const k = group.fields[0][0]
    return <MirrorRow fieldKey={k} value={data[k]} label={group.title} />
  }
  const fields = group.title === 'Boîte mail'
    ? group.fields.filter(([k]) => k === 'workspace_provider' || hasValue(data[k]))
    : group.fields
  return (
    <div className="px-3.5 py-2.5">
      <p className="text-[11px] font-semibold text-soren-text mb-2">{group.title}</p>
      <div className="flex flex-col gap-2.5 pl-3 border-l-2 border-soren-border/50">
        {fields.map(([k, lbl]) => <MirrorRow key={k} fieldKey={k} value={data[k]} label={lbl} compact />)}
      </div>
    </div>
  )
}

// Miroir read-only EXHAUSTIF de la soumission publique : affiche tout ce qui est dans form (toute clé), codes masquables + copiables.
function OnboardingForm({ done, onToggle, form, receivedAt }: {
  done: boolean; onToggle: (v: boolean) => void
  form: Record<string, Record<string, unknown>>
  receivedAt?: string
}) {
  const accData = (form.accounts ?? {}) as Record<string, unknown>
  const accExtraKeys = Object.keys(accData).filter(k => !ACCOUNT_GROUP_KEYS.includes(k) && hasValue(accData[k]))
  // Sections présentes dans la soumission mais hors schéma + comptes (anciennes versions, clés inconnues) → affichées aussi.
  const extraSections = useMemo(
    () => Object.keys(form || {}).filter(id =>
      !SCHEMA_IDS.includes(id) && id !== 'accounts' && form[id] && typeof form[id] === 'object' && Object.values(form[id]).some(hasValue)),
    [form],
  )
  const filledCount = SCHEMA.filter(s => Object.values(form[s.id] || {}).some(hasValue)).length
    + (Object.values(accData).some(hasValue) ? 1 : 0) + extraSections.length
  const empty = !receivedAt && filledCount === 0

  const Section = ({ title, data, keys }: { title: string; data: Record<string, unknown>; keys: string[] }) => (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-soren-subtle mb-2">{title}</p>
      <div className="rounded-xl border border-soren-border/70 divide-y divide-soren-border/50 overflow-hidden bg-soren-card/30">
        {keys.map(k => <MirrorRow key={k} fieldKey={k} value={data[k]} />)}
      </div>
    </div>
  )

  return (
    <StepCard icon={<ClipboardList size={16} />} title="Formulaire d'onboarding" done={done} onToggle={onToggle}>
      {empty ? (
        <div className="bg-soren-elevated rounded-xl p-4 text-center">
          <p className="text-[12px] font-semibold text-soren-text">Formulaire pas encore reçu</p>
          <p className="text-[11px] text-soren-subtle mt-1">Le client le remplit via le lien public — ses réponses s'afficheront ici automatiquement.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {receivedAt && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#16A34A] dark:bg-emerald-500/15 dark:text-emerald-400">
                <Check size={10} /> Reçu le {new Date(receivedAt).toLocaleDateString('fr-FR')}
              </span>
            )}
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-soren-elevated text-soren-muted">
              {filledCount} section{filledCount > 1 ? 's' : ''} remplie{filledCount > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {SCHEMA.map(sec => {
              const data = (form[sec.id] ?? {}) as Record<string, unknown>
              const extraKeys = Object.keys(data).filter(k => !sec.keys.includes(k) && hasValue(data[k]))
              return <Section key={sec.id} title={sec.title} data={data} keys={[...sec.keys, ...extraKeys]} />
            })}
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-soren-subtle mb-2">Accès &amp; comptes</p>
              <div className="rounded-xl border border-soren-border/70 divide-y divide-soren-border/50 overflow-hidden bg-soren-card/30">
                {ACCOUNT_GROUPS.map(g => <AccountBlock key={g.title} group={g} data={accData} />)}
                {accExtraKeys.map(k => <MirrorRow key={k} fieldKey={k} value={accData[k]} />)}
              </div>
            </div>
            {extraSections.map(secId => {
              const data = (form[secId] ?? {}) as Record<string, unknown>
              const keys = Object.keys(data).filter(k => hasValue(data[k]))
              return <Section key={secId} title={humanizeSection(secId)} data={data} keys={keys} />
            })}
          </div>
        </div>
      )}
    </StepCard>
  )
}

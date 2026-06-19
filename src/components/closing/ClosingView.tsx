'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Building2, Clock, CheckCircle2, AlertTriangle, Zap, Calendar, Wallet,
  Search, Phone, FileText, Target,
} from 'lucide-react'

type Intake = {
  companyType?: string; headcount?: string; monthlyRevenue?: string; costliestFunction?: string
  repetitiveCost?: string; whyNow?: string; timing?: string; budget?: string; createdAt?: string
}
type Call = {
  id: string; title?: string; date?: string | null; kind: string; name: string
  company?: string | null; initials: string; prepReady: boolean
  contact?: { id: string; fullName: string; company?: string; email?: string; phone?: string } | null
  intake?: Intake | null; notes?: string | null
}

const SCOPES = [
  { k: 'today', label: "Aujourd'hui" },
  { k: 'week', label: 'Cette semaine' },
  { k: 'all', label: 'Tous' },
]

function QCard({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value?: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-3.5">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-soren-subtle">
        <Icon size={13} className="text-soren-accent" />{label}
      </div>
      <div className={`text-sm font-semibold mt-1.5 leading-snug ${accent ? 'text-emerald-600' : 'text-soren-text'}`}>
        {value || <span className="text-soren-subtle font-normal">—</span>}
        {sub && <span className="block font-normal text-soren-muted text-[12.5px] mt-0.5">{sub}</span>}
      </div>
    </div>
  )
}

export default function ClosingView() {
  const [scope, setScope] = useState('week')
  const calls = (useQuery(api.closing.upcomingCalls, { scope }) ?? null) as Call[] | null
  const [openId, setOpenId] = useState<string | null>(null)
  const saveNote = useMutation(api.closing.saveCallNote)
  const [note, setNote] = useState('')

  const selected = useMemo(() => calls?.find(c => c.id === openId) ?? calls?.[0] ?? null, [calls, openId])
  useEffect(() => { setNote(selected?.notes ?? '') }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = calls === null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* header */}
      <div className="px-6 pt-5 pb-3 flex items-end justify-between border-b border-soren-border flex-shrink-0">
        <div>
          <h1 className="text-[21px] font-bold tracking-tight">Closing — Préparation d'appel</h1>
          <p className="text-[12px] text-soren-muted mt-0.5">Tes R1 &amp; R2 à venir, prêts à dérouler. Fiche contact + réponses du formulaire de confirmation.</p>
        </div>
        <div className="flex bg-soren-elevated border border-soren-border rounded-[10px] p-[3px] text-[12px] font-medium">
          {SCOPES.map(s => (
            <button key={s.k} onClick={() => setScope(s.k)}
              className={`px-3 py-1.5 rounded-[7px] ${scope === s.k ? 'bg-soren-card text-soren-text shadow-sm' : 'text-soren-muted'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[340px_1fr] overflow-hidden">
        {/* call list */}
        <div className="border-r border-soren-border overflow-y-auto p-3.5 bg-soren-elevated/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-soren-subtle px-2 pb-2.5">
            {loading ? 'Chargement…' : `${calls?.length ?? 0} appel${(calls?.length ?? 0) > 1 ? 's' : ''} à venir`}
          </div>
          {!loading && calls?.length === 0 && (
            <div className="text-[12.5px] text-soren-muted px-2 py-6 leading-relaxed">
              Aucun appel planifié sur cette période. Les R1/R2 apparaissent ici depuis le pipeline / iClosed.
            </div>
          )}
          {calls?.map(c => {
            const sel = selected?.id === c.id
            return (
              <button key={c.id} onClick={() => setOpenId(c.id)}
                className={`w-full text-left bg-soren-card border rounded-[13px] p-3 mb-2.5 transition-all ${sel ? 'border-soren-accent ring-[3px] ring-soren-accent/10' : 'border-soren-border hover:border-[#C8CBD0]'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${c.kind === 'R2' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{c.kind}</span>
                  <span className="font-semibold text-[13.5px]">{c.name}</span>
                </div>
                {c.company && <div className="text-[12px] text-soren-muted mt-0.5">{c.company}</div>}
                <div className="flex items-center gap-2 mt-2 text-[11.5px] text-soren-muted">
                  {c.date && <span className="inline-flex items-center gap-1"><Clock size={12} />{c.date}</span>}
                  <span className={`ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold ${c.prepReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.prepReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {c.prepReady ? 'Prep prête' : 'Formulaire manquant'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* prep sheet */}
        <div className="overflow-y-auto p-6">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-soren-muted gap-3">
              <Phone size={30} className="opacity-40" />
              <p className="text-[13px]">Sélectionne un appel pour préparer la fiche.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[13px] bg-soren-elevated border border-soren-border flex items-center justify-center font-bold text-[17px] text-soren-accent">{selected.initials}</div>
                <div>
                  <h2 className="text-[19px] font-bold tracking-tight">{selected.name}</h2>
                  <div className="text-[13px] text-soren-muted mt-0.5">
                    {selected.company ? `${selected.company} · ` : ''}
                    <b className={selected.kind === 'R2' ? 'text-orange-600' : 'text-blue-600'}>{selected.kind}{selected.date ? ` · ${selected.date}` : ''}</b>
                  </div>
                </div>
              </div>

              {selected.intake ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-soren-muted bg-soren-elevated border border-soren-border px-2.5 py-1 rounded-full my-4">
                    <CheckCircle2 size={12} className="text-emerald-600" />Réponses captées via le formulaire de confirmation · liées à la fiche contact
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <QCard icon={Building2} label="Profil entreprise" value={selected.intake.companyType} sub={[selected.intake.headcount, selected.intake.monthlyRevenue].filter(Boolean).join(' · ')} />
                    <QCard icon={Target} label="Douleur n°1" value={selected.intake.costliestFunction} />
                    <QCard icon={Wallet} label="Coût des tâches répétitives" value={selected.intake.repetitiveCost} />
                    <div className="col-span-2"><QCard icon={Zap} label="Pourquoi l'IA maintenant" value={selected.intake.whyNow} /></div>
                    <QCard icon={Calendar} label="Timing" value={selected.intake.timing} />
                    <QCard icon={Wallet} label="Budget IA" value={selected.intake.budget} accent />
                  </div>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 my-4 flex items-start gap-3 text-[13px]">
                  <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div><b className="text-amber-800">Formulaire de confirmation non rempli</b><div className="text-amber-700 mt-0.5">Pas encore de réponses liées à ce prospect. La fiche contact reste disponible pour préparer l'appel.</div></div>
                </div>
              )}

              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-soren-muted mt-6 mb-3">Notes du closer<span className="flex-1 h-px bg-soren-border" /></div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                onBlur={() => selected && saveNote({ id: selected.id as any, notes: note })}
                placeholder="Plan d'appel, ce qui a été dit, prochains pas… (sauvegardé sur l'appel)"
                className="w-full bg-soren-card border border-soren-border rounded-[13px] p-3.5 text-[13px] min-h-[100px] outline-none focus:border-soren-accent resize-y" />
              <div className="flex justify-end gap-2.5 mt-4">
                {selected.contact && (
                  <a href={`/contacts?id=${selected.contact.id}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[11px] text-[13.5px] font-semibold border border-soren-border bg-soren-card"><FileText size={15} />Ouvrir la fiche contact</a>
                )}
                <button onClick={() => selected && saveNote({ id: selected.id as any, notes: note })}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[11px] text-[13.5px] font-semibold bg-soren-text text-white"><CheckCircle2 size={15} />Enregistrer la prep</button>
              </div>
              <div className="h-6" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

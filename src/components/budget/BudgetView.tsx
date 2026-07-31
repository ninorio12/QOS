'use client'

/**
 * Budget — les postes de dépense sont saisis et modifiables ici.
 *
 * Chaque montant, chaque libellé s'édite sur place ; on ajoute un abonnement ou
 * une dépense ponctuelle sans passer par un déploiement. Le total distingue le
 * récurrent mensuel des dépenses ponctuelles, qui ne se cumulent pas au même titre.
 */

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { MotionStagger, MotionItem } from '@/components/ui/Motion'
import { Wallet, Plus, Trash2, Check, X } from 'lucide-react'

type Item = {
  _id: string; label: string; details?: string; amount: number
  currency: string; recurrence: string; date?: string; color?: string
}

// Taux USD→CHF (au 2026-06-08). À ajuster si besoin.
const USD_TO_CHF = 0.7961
const toChf = (amount: number, currency: string) => (currency === 'USD' ? amount * USD_TO_CHF : amount)
const chf = (n: number) => `${Math.round(n).toLocaleString('fr-CH')} CHF`

function Row({ it, onSave, onDelete }: { it: Item; onSave: (patch: Partial<Item>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(it.label)
  const [details, setDetails] = useState(it.details ?? '')
  const [amount, setAmount] = useState(String(it.amount))
  const [currency, setCurrency] = useState(it.currency)

  const commit = () => {
    setEditing(false)
    const n = Number(amount)
    onSave({ label: label.trim() || it.label, details: details.trim(), amount: Number.isFinite(n) ? n : it.amount, currency })
  }

  if (editing) {
    return (
      <div className="bg-soren-card rounded-xl p-3 shadow-sm flex items-center gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Poste"
            className="text-[13px] bg-soren-elevated border border-soren-border rounded-lg px-2 py-1 text-soren-text outline-none focus:border-soren-accent/50" />
          <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Détail (facultatif)"
            className="text-[11px] bg-soren-elevated border border-soren-border rounded-lg px-2 py-1 text-soren-muted outline-none focus:border-soren-accent/50" />
        </div>
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-20 text-[13px] font-bold text-right bg-soren-elevated border border-soren-border rounded-lg px-2 py-1 text-soren-text outline-none focus:border-soren-accent/50 tabular-nums" />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}
          className="text-[11px] bg-soren-elevated border border-soren-border rounded-lg px-1.5 py-1 text-soren-muted outline-none">
          <option value="CHF">CHF</option><option value="USD">USD</option>
        </select>
        <button onClick={commit} title="Enregistrer" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#16A34A] hover:bg-[#16A34A]/10"><Check size={14} /></button>
        <button onClick={() => setEditing(false)} title="Annuler" className="w-7 h-7 rounded-lg flex items-center justify-center text-soren-muted hover:bg-soren-elevated"><X size={14} /></button>
      </div>
    )
  }

  return (
    <div className="group bg-soren-card rounded-xl p-3 shadow-sm flex items-center gap-3">
      <button onClick={() => setEditing(true)} className="flex-1 min-w-0 text-left">
        <p className="text-[13px] font-normal text-soren-text leading-none mb-0.5">{it.label}</p>
        <p className="text-xs text-soren-subtle truncate">
          {it.details || '—'}
          {it.recurrence === 'ponctuel' && <span className="ml-1.5 text-soren-accent font-medium">ponctuel</span>}
        </p>
      </button>
      <button onClick={() => setEditing(true)} className="text-sm font-bold text-soren-text flex-shrink-0 tabular-nums">
        {it.amount === 0 ? <span className="text-xs font-bold text-[#16A34A]">Gratuit</span> : chf(toChf(it.amount, it.currency))}
      </button>
      <button onClick={onDelete} title="Supprimer" className="w-6 h-6 rounded-lg flex items-center justify-center text-soren-subtle hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Trash2 size={12} />
      </button>
    </div>
  )
}

export default function BudgetView() {
  const items = useQuery(api.budget.list) as Item[] | undefined
  const seed = useMutation(api.budget.seedIfEmpty)
  const add = useMutation(api.budget.add)
  const update = useMutation(api.budget.update)
  const remove = useMutation(api.budget.remove)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ label: '', details: '', amount: '', currency: 'CHF', recurrence: 'mensuel' })

  // Première ouverture : on recopie la liste historique pour ne rien perdre.
  useEffect(() => { if (items && items.length === 0) void seed({}) }, [items, seed])

  const list = items ?? []
  const mensuel = list.filter((i) => i.recurrence !== 'ponctuel')
  const ponctuel = list.filter((i) => i.recurrence === 'ponctuel')
  const totalMensuel = mensuel.reduce((s, i) => s + toChf(i.amount, i.currency), 0)
  const totalPonctuel = ponctuel.reduce((s, i) => s + toChf(i.amount, i.currency), 0)

  const submit = () => {
    const n = Number(draft.amount)
    if (!draft.label.trim() || !Number.isFinite(n)) return
    void add({ label: draft.label, details: draft.details, amount: n, currency: draft.currency, recurrence: draft.recurrence })
    setDraft({ label: '', details: '', amount: '', currency: 'CHF', recurrence: 'mensuel' })
    setAdding(false)
  }

  return (
    <MotionStagger className="flex flex-col md:h-[calc(100vh-48px)] p-4 pb-24 md:pb-4 gap-3">
      <MotionItem className="flex-shrink-0 flex items-center justify-between gap-3">
        <p className="text-xs text-soren-subtle">Abonnements, outils et dépenses du Data OS. Clique un montant pour le corriger.</p>
        <button onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-white bg-soren-accent rounded-full px-3 py-1.5 hover:opacity-90 transition-opacity flex-shrink-0">
          <Plus size={12} /> Ajouter une dépense
        </button>
      </MotionItem>

      {adding && (
        <MotionItem className="flex-shrink-0 bg-soren-card border border-soren-border rounded-xl p-3 flex flex-wrap items-center gap-2">
          <input autoFocus value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Poste"
            className="flex-1 min-w-[140px] text-[13px] bg-soren-elevated border border-soren-border rounded-lg px-2.5 py-1.5 text-soren-text outline-none focus:border-soren-accent/50" />
          <input value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} placeholder="Détail"
            className="flex-1 min-w-[140px] text-[12px] bg-soren-elevated border border-soren-border rounded-lg px-2.5 py-1.5 text-soren-muted outline-none focus:border-soren-accent/50" />
          <input type="number" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0.00"
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            className="w-24 text-[13px] font-bold text-right bg-soren-elevated border border-soren-border rounded-lg px-2.5 py-1.5 text-soren-text outline-none focus:border-soren-accent/50 tabular-nums" />
          <select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            className="text-[12px] bg-soren-elevated border border-soren-border rounded-lg px-2 py-1.5 text-soren-muted outline-none">
            <option value="CHF">CHF</option><option value="USD">USD</option>
          </select>
          <select value={draft.recurrence} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value })}
            className="text-[12px] bg-soren-elevated border border-soren-border rounded-lg px-2 py-1.5 text-soren-muted outline-none">
            <option value="mensuel">Mensuel</option><option value="ponctuel">Ponctuel</option>
          </select>
          <button onClick={submit} className="text-[12px] font-semibold text-white bg-soren-text rounded-lg px-3 py-1.5">Ajouter</button>
        </MotionItem>
      )}

      {/* Total */}
      <MotionItem className="flex-shrink-0 bg-soren-sidebar rounded-2xl px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF4D00] flex items-center justify-center flex-shrink-0">
            <Wallet size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white/50 text-[11px] font-medium uppercase tracking-wide">Total mensuel</p>
            <p className="text-white text-2xl font-bold leading-none mt-0.5 tabular-nums">
              {Math.round(totalMensuel).toLocaleString('fr-CH')}
              <span className="text-white/40 text-sm font-semibold ml-1">CHF</span>
              <span className="text-white/40 text-sm font-medium"> / mois</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/25 text-xs">{mensuel.length} récurrents · {ponctuel.length} ponctuels</p>
          {totalPonctuel > 0 && <p className="text-white/50 text-xs font-semibold mt-0.5 tabular-nums">+ {chf(totalPonctuel)} ponctuel</p>}
        </div>
      </MotionItem>

      {/* Postes */}
      <MotionItem className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-soren-subtle">Mensuel</p>
          <div className="flex flex-col gap-2">
            {mensuel.map((it) => (
              <Row key={it._id} it={it}
                onSave={(patch) => void update({ id: it._id as never, ...patch })}
                onDelete={() => void remove({ id: it._id as never })} />
            ))}
            {mensuel.length === 0 && <p className="text-[12px] text-soren-subtle">Aucun poste récurrent.</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-soren-subtle">Ponctuel</p>
          <div className="flex flex-col gap-2">
            {ponctuel.map((it) => (
              <Row key={it._id} it={it}
                onSave={(patch) => void update({ id: it._id as never, ...patch })}
                onDelete={() => void remove({ id: it._id as never })} />
            ))}
            {ponctuel.length === 0 && <p className="text-[12px] text-soren-subtle">Aucune dépense ponctuelle.</p>}
          </div>
        </div>
      </MotionItem>

      <p className="text-[11px] text-soren-subtle text-center flex-shrink-0 pb-1">
        Les montants en USD sont convertis au taux {USD_TO_CHF}. Hors TVA.
      </p>
    </MotionStagger>
  )
}

'use client'

import { useState, useEffect } from 'react'

type Relance = {
  id:          string
  delai_jours: number
  canal:       'whatsapp' | 'email' | 'sms'
  statut:      'programmee' | 'envoyee' | 'annulee' | 'ignoree'
  envoye_le:   string | null
  created_at:  string
}

const STATUT_LABEL: Record<Relance['statut'], { label: string; bg: string; color: string }> = {
  programmee: { label: 'Programmée', bg: '#EEF3FF',  color: '#3462EE' },
  envoyee:    { label: 'Envoyée',    bg: '#f0fdf4',  color: '#16a34a' },
  annulee:    { label: 'Annulée',    bg: '#f3f4f6',  color: '#9ca3af' },
  ignoree:    { label: 'Ignorée',    bg: '#fef2f2',  color: '#dc2626' },
}

const CANAL_COLOR: Record<Relance['canal'], string> = {
  whatsapp: '#4A91A8',
  email:    '#3462EE',
  sms:      '#8B5CF6',
}

function dayLabel(devis_created_at: string, delai: number): string {
  const d = new Date(devis_created_at)
  d.setDate(d.getDate() + delai)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface RelancesSectionProps {
  devisId:         string
  devisCreatedAt:  string
}

export default function RelancesSection({ devisId, devisCreatedAt }: RelancesSectionProps) {
  const [relances, setRelances] = useState<Relance[]>([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [newDelai, setNewDelai] = useState(3)
  const [newCanal, setNewCanal] = useState<Relance['canal']>('whatsapp')

  useEffect(() => {
    fetch(`/api/devis/${devisId}/relances`)
      .then(r => r.json())
      .then(j => { setRelances(j.relances ?? []); setLoading(false) })
  }, [devisId])

  async function handleAdd() {
    const res = await fetch(`/api/devis/${devisId}/relances`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delai_jours: newDelai, canal: newCanal }),
    })
    const json = await res.json()
    if (res.ok) {
      setRelances(prev => [...prev, json.relance])
      setAdding(false)
    }
  }

  async function handleCancel(rid: string) {
    await fetch(`/api/devis/${devisId}/relances/${rid}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ statut: 'annulee' }),
    })
    setRelances(prev => prev.map(r => r.id === rid ? { ...r, statut: 'annulee' } : r))
  }

  return (
    <div className="bg-soren-card rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span className="text-[13px] font-bold text-soren-text">Relances automatiques</span>
        </div>
      </div>

      {loading ? (
        <p className="text-[11px] text-soren-subtle">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {relances.map(r => {
            const cfg = STATUT_LABEL[r.statut]
            return (
              <div key={r.id} className="flex items-center justify-between bg-[#f9f9f7] rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CANAL_COLOR[r.canal] }} />
                  <div>
                    <p className="text-[12px] font-semibold text-soren-text">
                      J+{r.delai_jours} · {r.canal.charAt(0).toUpperCase() + r.canal.slice(1)}
                    </p>
                    <p className="text-[10px] text-soren-subtle">{dayLabel(devisCreatedAt, r.delai_jours)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  {r.statut === 'programmee' && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="text-soren-subtle hover:text-red-500 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulaire ajout */}
      {adding ? (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={newDelai}
            onChange={e => setNewDelai(Number(e.target.value))}
            className="bg-[#f9f9f7] border border-[#f0f0eb] rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#111] font-jakarta"
          >
            {[3, 7, 14, 21].map(d => <option key={d} value={d}>J+{d}</option>)}
          </select>
          <select
            value={newCanal}
            onChange={e => setNewCanal(e.target.value as Relance['canal'])}
            className="bg-[#f9f9f7] border border-[#f0f0eb] rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#111] font-jakarta"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
          <button onClick={handleAdd} className="bg-[#111] text-white rounded-lg px-3 py-1.5 text-[11px] font-semibold font-jakarta">
            Ajouter
          </button>
          <button onClick={() => setAdding(false)} className="text-soren-subtle text-[11px] font-semibold font-jakarta">
            Annuler
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full border border-dashed border-[#d1d5db] rounded-xl py-2 text-[11px] font-semibold text-soren-subtle hover:text-[#6b7280] hover:border-[#9ca3af] transition-colors font-jakarta"
        >
          + Ajouter une relance
        </button>
      )}
    </div>
  )
}

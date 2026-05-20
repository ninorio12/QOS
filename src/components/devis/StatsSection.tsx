'use client'

import { useState, useEffect } from 'react'

interface StatsData {
  taux_acceptation:  number | null
  delai_moyen_jours: number | null
  evolution_pct:     number | null
  similaires: {
    acceptes:  number
    refuses:   number
    en_cours:  number
    total:     number
  }
}

interface StatsSectionProps {
  devisId: string
}

export default function StatsSection({ devisId }: StatsSectionProps) {
  const [stats, setStats]     = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/devis/${devisId}/stats`)
      .then(r => r.json())
      .then(j => { setStats(j); setLoading(false) })
  }, [devisId])

  if (loading) {
    return (
      <div className="bg-soren-card rounded-2xl p-5 shadow-sm">
        <p className="text-[11px] text-soren-subtle">Chargement des statistiques…</p>
      </div>
    )
  }

  if (!stats || stats.similaires.total === 0) {
    return (
      <div className="bg-soren-card rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span className="text-[13px] font-bold text-soren-text">Statistiques de conversion</span>
        </div>
        <p className="text-[11px] text-soren-subtle">Pas encore assez de devis similaires pour afficher des statistiques.</p>
      </div>
    )
  }

  const { taux_acceptation, delai_moyen_jours, evolution_pct, similaires } = stats
  const maxBar = Math.max(similaires.acceptes, similaires.refuses, similaires.en_cours, 1)

  return (
    <div className="bg-soren-card rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <span className="text-[13px] font-bold text-soren-text">Statistiques de conversion</span>
      </div>

      {/* 3 KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#f9f9f7] rounded-xl p-2.5 text-center">
          <p className="font-outfit text-[22px] font-bold text-soren-text leading-none">
            {taux_acceptation != null ? `${taux_acceptation}%` : '—'}
          </p>
          <p className="text-[9px] text-soren-subtle font-semibold mt-1">Taux accept.</p>
        </div>
        <div className="bg-[#f9f9f7] rounded-xl p-2.5 text-center">
          <p className="font-outfit text-[22px] font-bold text-soren-text leading-none">
            {delai_moyen_jours != null ? `${delai_moyen_jours}j` : '—'}
          </p>
          <p className="text-[9px] text-soren-subtle font-semibold mt-1">Délai moyen</p>
        </div>
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: evolution_pct != null && evolution_pct >= 0 ? '#FF4D00' : '#fef2f2' }}
        >
          <p className="font-outfit text-[22px] font-bold text-soren-text leading-none">
            {evolution_pct != null
              ? `${evolution_pct >= 0 ? '↑' : '↓'}${Math.abs(evolution_pct)}%`
              : '—'
            }
          </p>
          <p
            className="text-[9px] font-semibold mt-1"
            style={{ color: evolution_pct != null && evolution_pct >= 0 ? '#556b00' : '#dc2626' }}
          >
            vs mois préc.
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <p className="text-[10px] text-soren-subtle font-semibold mb-2">
        Devis similaires (±50% du montant) · {similaires.total} au total
      </p>
      <div className="flex flex-col gap-1.5">
        {[
          { label: 'Acceptés', count: similaires.acceptes, color: '#111111' },
          { label: 'Refusés',  count: similaires.refuses,  color: '#d1d5db' },
          { label: 'En cours', count: similaires.en_cours, color: '#FF4D00' },
        ].map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[10px] text-soren-muted font-jakarta" style={{ width: 52 }}>{label}</span>
            <div className="flex-1 h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((count / maxBar) * 100)}%`, background: color }}
              />
            </div>
            <span className="text-[10px] font-bold text-soren-text" style={{ width: 16, textAlign: 'right' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

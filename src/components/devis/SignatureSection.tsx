'use client'

import { useState } from 'react'

type SignatureStatut = 'non_envoye' | 'envoye' | 'vu' | 'signe'

interface SignatureSectionProps {
  devisId:          string
  statut:           SignatureStatut
  contactEmail:     string | null
  signatureVuLe:    string | null
  signatureSigne:   string | null
  onStatutChange:   (statut: SignatureStatut) => void
}

const STEPS: { key: SignatureStatut | 'created'; label: string }[] = [
  { key: 'created',    label: 'Créé' },
  { key: 'envoye',     label: 'Envoyé' },
  { key: 'vu',         label: 'Vu' },
  { key: 'signe',      label: 'Signé' },
]

function stepIndex(statut: SignatureStatut): number {
  const map: Record<SignatureStatut, number> = {
    non_envoye: 0, envoye: 1, vu: 2, signe: 3,
  }
  return map[statut]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function badgeLabel(statut: SignatureStatut) {
  const map: Record<SignatureStatut, { label: string; bg: string; color: string }> = {
    non_envoye: { label: 'Non envoyé',  bg: '#f3f4f6',  color: '#6b7280' },
    envoye:     { label: 'En attente',  bg: '#FEF9C3',  color: '#854D0E' },
    vu:         { label: 'Vu',          bg: '#EEF3FF',  color: '#3462EE' },
    signe:      { label: 'Signé ✓',     bg: '#f0fdf4',  color: '#16a34a' },
  }
  return map[statut]
}

export default function SignatureSection({
  devisId, statut, contactEmail, signatureVuLe, signatureSigne, onStatutChange,
}: SignatureSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const badge = badgeLabel(statut)
  const done  = stepIndex(statut)

  async function handleEnvoyer() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/devis/${devisId}/signature`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      onStatutChange('envoye')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          <span className="text-[13px] font-bold text-[#111111]">Signature électronique</span>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0 mb-4">
        {STEPS.map((step, i) => {
          const isDone = i <= done
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: isDone ? '#111' : '#f3f4f6',
                    border: isDone ? 'none' : '2px dashed #d1d5db',
                  }}
                >
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#d1d5db]" />
                  )}
                </div>
                <span className="text-[9px] font-semibold text-[#9CA3AF]">{step.label}</span>
              </div>
              {!isLast && (
                <div
                  className="flex-1 h-0.5 mb-4"
                  style={{ background: i < done ? '#111' : '#e5e7eb' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Info + action */}
      {error && (
        <p className="text-[11px] text-red-600 mb-2">{error}</p>
      )}
      <div className="flex items-center justify-between bg-[#f9f9f7] rounded-xl px-3 py-2.5">
        <div>
          {statut === 'non_envoye' ? (
            <p className="text-[11px] text-[#9CA3AF]">Aucun lien envoyé</p>
          ) : (
            <>
              <p className="text-[10px] text-[#9CA3AF] mb-0.5">
                {statut === 'signe' ? 'Signé le' : statut === 'vu' ? 'Vu le' : 'Envoyé à'}
              </p>
              <p className="text-[12px] font-semibold text-[#111111]">
                {statut === 'signe' && signatureSigne ? fmtDate(signatureSigne)
                  : statut === 'vu' && signatureVuLe ? fmtDate(signatureVuLe)
                  : contactEmail ?? '—'}
              </p>
            </>
          )}
        </div>
        {statut !== 'signe' && (
          <button
            onClick={handleEnvoyer}
            disabled={loading}
            className="bg-[#111] text-white rounded-lg px-3 py-1.5 text-[11px] font-semibold hover:bg-[#333] transition-colors disabled:opacity-40 font-jakarta"
          >
            {loading ? '...' : statut === 'non_envoye' ? 'Envoyer le lien' : 'Renvoyer le lien'}
          </button>
        )}
      </div>
    </div>
  )
}

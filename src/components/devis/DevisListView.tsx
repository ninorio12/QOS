'use client'

import { Plus } from 'lucide-react'
import PdfThumbnail from './PdfThumbnail'

type Devis = {
  id: string
  numero: string | null
  contact_name: string | null
  titre: string
  lignes: { quantite: number; prixUnitaire: number; tvaRate: number }[]
  montant_ht: number | null
  statut: string
  created_at: string
  pdf_url: string | null
  source: string
}

const STATUT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  brouillon: { label: 'Brouillon', bg: '#f3f4f6',  color: '#6b7280' },
  'envoyé':  { label: 'Envoyé',   bg: '#EEF3FF',   color: '#3462EE' },
  'accepté': { label: 'Accepté',  bg: '#f0fdf4',   color: '#16a34a' },
  'refusé':  { label: 'Refusé',   bg: '#fef2f2',   color: '#dc2626' },
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function totalHT(lignes: Devis['lignes']) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
}

function totalTTC(lignes: Devis['lignes']) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (1 + l.tvaRate / 100), 0)
}

interface DevisListViewProps {
  devisList: Devis[]
  onNew:    () => void
  onSelect: (d: Devis) => void
}

export default function DevisListView({ devisList, onNew, onSelect }: DevisListViewProps) {
  const enAttente = devisList.filter(d => d.statut === 'envoyé').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 flex-shrink-0">
        <div>
          <h1 className="font-montserrat text-[26px] font-extrabold text-[#111111]">Devis</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5 font-jakarta">
            {devisList.length} devis{enAttente > 0 ? ` · ${enAttente} en attente` : ''}
          </p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 bg-[#111111] text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-[#222] transition-colors font-jakarta"
        >
          <Plus size={13} /> Nouveau devis
        </button>
      </div>

      {/* Grille scrollable horizontalement */}
      {devisList.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#f3f4f6] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-[#111111]">Aucun devis</p>
          <p className="text-[12px] text-[#9CA3AF]">Créez votre premier devis</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
          <div className="flex flex-row gap-4 h-full" style={{ minWidth: 'max-content' }}>
            {devisList.map((d) => {
              const lignes = d.lignes ?? []
              const ht  = totalHT(lignes)
              const ttc = totalTTC(lignes)
              const displayHt  = ht  > 0 ? ht  : (d.montant_ht ?? 0)
              const displayTtc = ttc > 0 ? ttc : null
              const cfg = STATUT_CONFIG[d.statut] ?? STATUT_CONFIG.brouillon

              return (
                <div
                  key={d.id}
                  onClick={() => onSelect(d)}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.01] cursor-pointer transition-all duration-200 border border-transparent hover:border-[#E2FF8D] flex-shrink-0"
                  style={{ width: 220 }}
                >
                  {/* Thumbnail */}
                  <div className="h-[140px] bg-[#f8f8f6] flex items-center justify-center">
                    <PdfThumbnail pdfUrl={d.pdf_url} numero={d.numero} montantTtc={displayTtc} />
                  </div>

                  {/* Infos */}
                  <div className="p-3.5">
                    <p className="text-[10px] text-[#9CA3AF] font-semibold mb-0.5 font-jakarta">{d.numero ?? '—'}</p>
                    <p className="text-[13px] font-bold text-[#111111] truncate font-jakarta">{d.titre}</p>
                    <p className="text-[11px] text-[#6B7280] mb-2.5 truncate font-jakarta">{d.contact_name ?? '—'}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-outfit text-[15px] font-bold text-[#111111]">
                        {displayHt > 0 ? fmtEUR(displayHt) : '—'}
                      </span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

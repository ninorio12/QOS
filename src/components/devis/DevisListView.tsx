'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Search, X } from 'lucide-react'
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
  brouillon:                { label: 'Brouillon',            bg: '#FEF9C3', color: '#854D0E' },
  'envoyé':                 { label: 'Envoyé',               bg: '#EEF3FF', color: '#3462EE' },
  'accepté':                { label: 'Accepté',              bg: '#f0fdf4', color: '#16a34a' },
  'refusé':                 { label: 'Refusé',               bg: '#fef2f2', color: '#dc2626' },
  pending_human_validation: { label: 'En attente validation', bg: '#FFF7ED', color: '#C2410C' },
}

const FILTERS = [
  { key: 'tous',                    label: 'Tous' },
  { key: 'brouillon',               label: 'Brouillons' },
  { key: 'pending_human_validation', label: 'En attente' },
  { key: 'envoyé',                  label: 'Envoyés' },
  { key: 'accepté',                 label: 'Acceptés' },
  { key: 'refusé',                  label: 'Refusés' },
]

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function totalHT(lignes: Devis['lignes']) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
}

function totalTTC(lignes: Devis['lignes']) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (1 + l.tvaRate / 100), 0)
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days}j`
  if (days < 30) return `il y a ${Math.floor(days / 7)}sem`
  return `il y a ${Math.floor(days / 30)}mois`
}

interface DevisListViewProps {
  devisList:  Devis[]
  brandColor: string
  onNew:      () => void
  onSelect:   (d: Devis) => void
  onDelete?:  (id: string) => void
}

export default function DevisListView({ devisList, brandColor, onNew, onSelect, onDelete }: DevisListViewProps) {
  const [filter, setFilter] = useState('tous')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await fetch(`/api/devis/${id}`, { method: 'DELETE' })
      onDelete?.(id)
    } finally {
      setDeletingId(null)
    }
  }
  const filtersRef = useRef<HTMLDivElement>(null)
  const cardsRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanups: (() => void)[] = []

    for (const ref of [filtersRef, cardsRef]) {
      const el = ref.current
      if (!el) continue

      let target = el.scrollLeft
      let raf: number | null = null

      const animate = () => {
        const diff = target - el.scrollLeft
        if (Math.abs(diff) < 0.5) { el.scrollLeft = target; raf = null; return }
        el.scrollLeft += diff * 0.12
        raf = requestAnimationFrame(animate)
      }

      const onWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
        e.preventDefault()
        target = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, target + e.deltaY))
        if (!raf) raf = requestAnimationFrame(animate)
      }

      el.addEventListener('wheel', onWheel, { passive: false })
      cleanups.push(() => {
        el.removeEventListener('wheel', onWheel)
        if (raf) cancelAnimationFrame(raf)
      })
    }

    return () => cleanups.forEach(fn => fn())
  }, [])

  // Filtrage
  const filtered = useMemo(() => {
    let list = devisList
    if (filter !== 'tous') list = list.filter(d => d.statut === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.titre.toLowerCase().includes(q) ||
        (d.contact_name ?? '').toLowerCase().includes(q) ||
        (d.numero ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [devisList, filter, search])

  // KPIs globaux (toujours sur tous les devis)
  const totalEnCours = useMemo(() => {
    return devisList
      .filter(d => d.statut !== 'refusé')
      .reduce((s, d) => {
        const lignes = d.lignes ?? []
        const ht = totalHT(lignes)
        return s + (ht > 0 ? ht : (d.montant_ht ?? 0))
      }, 0)
  }, [devisList])

  const enAttente = devisList.filter(d => d.statut === 'envoyé').length
  const acceptes  = devisList.filter(d => d.statut === 'accepté').length
  const envoyes   = devisList.filter(d => ['envoyé', 'accepté', 'refusé'].includes(d.statut)).length
  const tauxAccept = envoyes > 0 ? Math.round((acceptes / envoyes) * 100) : null


  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0 gap-4" style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}>
        <div className="flex-shrink-0">
          <h1 className="font-montserrat text-[26px] font-extrabold text-soren-text leading-none">Devis</h1>
          <p className="text-[12px] text-soren-subtle mt-0.5 font-jakarta">
            {devisList.length} devis{enAttente > 0 ? ` · ${enAttente} en attente` : ''}
          </p>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un devis..."
            className="w-full bg-soren-card rounded-full pl-8 pr-4 py-2 text-[13px] text-[#111] placeholder:text-soren-subtle border border-transparent focus:outline-none focus:border-[#FF4D00] font-jakarta shadow-sm"
          />
        </div>

        <button
          onClick={onNew}
          className="flex-shrink-0 flex items-center gap-1.5 bg-soren-sidebar text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-[#222] transition-colors font-jakarta"
        >
          <Plus size={13} /> Nouveau devis
        </button>
      </div>

      {/* Stats KPIs */}
      <div className="flex gap-3 px-6 mb-3 flex-shrink-0" style={{ animation: 'fadeSlideUp 400ms ease-out 80ms both' }}>
        <div className="bg-soren-card rounded-2xl px-4 py-2.5 flex flex-col shadow-sm flex-1">
          <span className="text-[11px] text-soren-subtle font-jakarta">En cours</span>
          <span className="text-[18px] font-extrabold text-[#111]" style={{ color: brandColor }}>
            {totalEnCours > 0 ? fmtEUR(totalEnCours) : '—'}
          </span>
        </div>
        <div className="bg-soren-card rounded-2xl px-4 py-2.5 flex flex-col shadow-sm flex-1">
          <span className="text-[11px] text-soren-subtle font-jakarta">En attente</span>
          <span className="text-[18px] font-extrabold" style={{ color: enAttente > 0 ? '#3462EE' : '#111' }}>
            {enAttente > 0 ? enAttente : '—'}
          </span>
        </div>
        <div className="bg-soren-card rounded-2xl px-4 py-2.5 flex flex-col shadow-sm flex-1">
          <span className="text-[11px] text-soren-subtle font-jakarta">Taux acceptation</span>
          <span className="text-[18px] font-extrabold" style={{ color: tauxAccept != null && tauxAccept >= 50 ? '#16a34a' : '#111' }}>
            {tauxAccept != null ? `${tauxAccept}%` : '—'}
          </span>
        </div>
      </div>

      {/* Filtres statut */}
      <div ref={filtersRef} className="flex gap-2 px-6 mb-4 flex-shrink-0 overflow-x-auto no-scrollbar" style={{ animation: 'fadeSlideUp 400ms ease-out 150ms both' }}>
        {FILTERS.map(f => {
          const count = f.key === 'tous' ? devisList.length : devisList.filter(d => d.statut === f.key).length
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex-shrink-0 text-[12px] font-semibold px-3.5 py-1.5 rounded-full transition-all font-jakarta"
              style={{
                background: active ? '#111' : 'white',
                color: active ? 'white' : '#6b7280',
                boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {f.label} · {count}
            </button>
          )
        })}
      </div>

      {/* Zone cards */}
      <div ref={cardsRef} className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4"
           style={{ animation: 'fadeSlideUp 400ms ease-out 220ms both', scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
        <div className="flex flex-row gap-5 h-full items-center" style={{ width: 'max-content' }}>

          {/* Carte "+ Nouveau devis" — toujours en premier à gauche */}
          <div
            onClick={onNew}
            className="rounded-3xl overflow-hidden border-2 border-dashed border-[#d1d5db] cursor-pointer hover:border-[#111] transition-colors group flex-shrink-0"
            style={{ width: 220 }}
          >
            <div className="h-[180px] flex items-center justify-center flex-col gap-2"
                 style={{ background: 'rgba(0,0,0,0.03)' }}>
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#d1d5db] flex items-center justify-center group-hover:border-[#111] transition-colors">
                <Plus size={16} className="text-[#d1d5db] group-hover:text-[#111] transition-colors" />
              </div>
              <span className="text-[11px] font-semibold text-soren-subtle group-hover:text-[#111] transition-colors font-jakarta">
                Nouveau devis
              </span>
            </div>
            <div className="p-3.5">
              <div className="h-[10px] rounded-full bg-[#f3f4f6] w-1/3 mb-2" />
              <div className="h-[13px] rounded-full bg-[#f3f4f6] w-3/4 mb-1.5" />
              <div className="h-[11px] rounded-full bg-[#f3f4f6] w-1/2 mb-3" />
              <div className="flex items-center justify-between">
                <div className="h-[15px] rounded-full bg-[#f3f4f6] w-1/3" />
                <div className="h-[20px] rounded-full bg-[#f3f4f6] w-1/4" />
              </div>
            </div>
          </div>

          {/* Cards réelles — du plus récent au plus ancien, poussées à droite de la ghost card */}
          {filtered.map((d) => {
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
                className="relative bg-soren-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] cursor-pointer transition-all duration-200 border border-transparent hover:border-[#FF4D00] flex-shrink-0"
                style={{ width: 260 }}
              >
                {/* Bouton suppression */}
                <button
                  onClick={e => handleDelete(e, d.id)}
                  disabled={deletingId === d.id}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 hover:bg-red-500 flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  {deletingId === d.id
                    ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <X size={11} className="text-white" />
                  }
                </button>

                {/* Vignette PDF */}
                <div className="h-[180px] bg-soren-sidebar flex items-center justify-center relative">
                  <PdfThumbnail
                    pdfUrl={d.pdf_url}
                    numero={d.numero}
                    titre={d.titre}
                    brandColor={brandColor}
                    montantTtc={displayTtc}
                  />
                </div>

                {/* Infos */}
                <div className="p-3.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] text-soren-subtle font-semibold font-jakarta">{d.numero ?? '—'}</p>
                    <p className="text-[10px] text-soren-subtle font-jakarta">{relativeDate(d.created_at)}</p>
                  </div>
                  <p className="text-[13px] font-bold text-soren-text truncate font-jakarta">{d.titre}</p>
                  <p className="text-[11px] text-soren-muted mb-2.5 truncate font-jakarta">{d.contact_name ?? '—'}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-outfit text-[15px] font-bold text-soren-text">
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

    </div>
  )
}

// src/components/devis/DevisDetailView.tsx
'use client'

import { useState } from 'react'
import { ChevronLeft, Save, Download, ExternalLink, Plus, X } from 'lucide-react'
import InfoSection from './InfoSection'
import SignatureSection from './SignatureSection'
import RelancesSection from './RelancesSection'
import StatsSection from './StatsSection'

type Ligne = {
  _id: string; description: string; quantite: number
  unite: string; prixUnitaire: number; tvaRate: number
}

type SignatureStatut = 'non_envoye' | 'envoye' | 'vu' | 'signe'

type Devis = {
  id: string; numero: string | null; contact_name: string | null
  contact_email: string | null; contact_phone: string | null
  contact_id: string | null; conversation_id: string | null
  titre: string; contenu: string; lignes: Omit<Ligne, '_id'>[]
  notes: string; montant_ht: number | null; statut: string
  created_at: string; envoye_le: string | null; ville: string | null
  date_validite: string | null; adresse_chantier: string | null
  pdf_url: string | null; source: string
  signature_statut: SignatureStatut
  signature_vu_le: string | null
  signature_signe_le: string | null
}

type Tab = 'split' | 'edit' | 'preview'

const STATUT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  brouillon: { label: 'Brouillon', bg: '#f3f4f6', color: '#6b7280' },
  'envoyé':  { label: 'Envoyé',   bg: '#EEF3FF', color: '#3462EE' },
  'accepté': { label: 'Accepté',  bg: '#f0fdf4', color: '#16a34a' },
  'refusé':  { label: 'Refusé',   bg: '#fef2f2', color: '#dc2626' },
}

const UNITES = ['U', 'm²', 'ml', 'm³', 'h', 'j', 'forfait', 'ens.']

function uid() { return Math.random().toString(36).slice(2) }
function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function totalHT(lignes: Ligne[]) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
}
function totalTTC(lignes: Ligne[]) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (1 + l.tvaRate / 100), 0)
}
function fromLignesDb(raw: Omit<Ligne, '_id'>[]): Ligne[] {
  return (raw ?? []).map(l => ({ ...l, _id: uid() }))
}
function toLignesPayload(lignes: Ligne[]) {
  return lignes.map(({ _id: _, ...rest }) => rest)
}

const inputCls = 'w-full bg-[#f9f9f7] border border-[#f0f0eb] rounded-xl px-3 py-2 text-[13px] text-[#111111] placeholder-[#d1d5db] focus:outline-none focus:border-[#3462EE] focus:bg-white transition-colors font-jakarta'

interface DevisDetailViewProps {
  devis:      Devis
  onClose:    () => void
  onUpdated:  (d: Devis) => void
  onDeleted:  (id: string) => void
}

export default function DevisDetailView({ devis: initial, onClose, onUpdated, onDeleted }: DevisDetailViewProps) {
  const [tab, setTab]           = useState<Tab>('split')
  const [titre, setTitre]       = useState(initial.titre)
  const [lignes, setLignes]     = useState<Ligne[]>(fromLignesDb(initial.lignes))
  const [notes, setNotes]       = useState(initial.notes ?? '')
  const [ville, setVille]       = useState(initial.ville ?? '')
  const [dateVal, setDateVal]   = useState(initial.date_validite?.slice(0, 10) ?? '')
  const [chantier, setChantier] = useState(initial.adresse_chantier ?? '')
  const [sigStatut, setSigStatut] = useState<SignatureStatut>(initial.signature_statut ?? 'non_envoye')
  const [saving, setSaving]     = useState(false)
  const [genPdf, setGenPdf]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [pdfUrl, setPdfUrl]     = useState(initial.pdf_url)

  const statut = initial.statut
  const cfg = STATUT_CONFIG[statut] ?? STATUT_CONFIG.brouillon
  const ht  = totalHT(lignes)
  const ttc = totalTTC(lignes)

  const tvaMap: Record<number, number> = {}
  for (const l of lignes) {
    const lHt = l.quantite * l.prixUnitaire
    tvaMap[l.tvaRate] = (tvaMap[l.tvaRate] ?? 0) + lHt * (l.tvaRate / 100)
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const validLignes = lignes.filter(l => l.description.trim())
      const res = await fetch(`/api/devis/${initial.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre, notes,
          ville: ville || null,
          date_validite:    dateVal || null,
          adresse_chantier: chantier || null,
          lignes:           toLignesPayload(validLignes),
          montant_ht:       ht > 0 ? ht : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      onUpdated(json.devis as Devis)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function handleGeneratePdf() {
    setGenPdf(true); setError(null)
    try {
      const res = await fetch(`/api/devis/${initial.id}/pdf`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur PDF')
      setPdfUrl(json.pdf_url)
      window.open(json.pdf_url, '_blank')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur PDF')
    } finally {
      setGenPdf(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce devis définitivement ?')) return
    await fetch(`/api/devis/${initial.id}`, { method: 'DELETE' })
    onDeleted(initial.id)
  }

  const formPanel = (
    <div className="overflow-y-auto p-6 flex flex-col gap-5" style={{ scrollbarWidth: 'thin' }}>
      {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      <div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Client</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Nom</label>
            <input className={inputCls} defaultValue={initial.contact_name ?? ''} readOnly />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Téléphone</label>
            <input className={inputCls} defaultValue={initial.contact_phone ?? ''} readOnly />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Email</label>
            <input className={inputCls} defaultValue={initial.contact_email ?? ''} readOnly />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Devis</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Titre</label>
            <input className={inputCls} value={titre} onChange={e => setTitre(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Ville</label>
            <input className={inputCls} value={ville} onChange={e => setVille(e.target.value)} placeholder="Paris" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Validité</label>
            <input type="date" className={inputCls} value={dateVal} onChange={e => setDateVal(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Adresse chantier</label>
            <input className={inputCls} value={chantier} onChange={e => setChantier(e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Lignes</p>
        <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          <table className="w-full" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                {['Description', 'Qté', 'Unité', 'PU HT', 'TVA%', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] pb-2 pr-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map(l => (
                <tr key={l._id} className="border-b border-[#f0f0eb] last:border-0">
                  <td className="py-1.5 pr-2">
                    <input
                      value={l.description}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, description: e.target.value } : x))}
                      placeholder="Libellé…"
                      className="w-full bg-transparent text-[12px] text-[#111] outline-none focus:bg-[#EEF3FF] focus:rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1.5 pr-2" style={{ width: 50 }}>
                    <input
                      type="number" value={l.quantite}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, quantite: parseFloat(e.target.value) || 0 } : x))}
                      className="w-full bg-transparent text-[12px] text-right outline-none focus:bg-[#EEF3FF] focus:rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1.5 pr-2" style={{ width: 70 }}>
                    <select
                      value={l.unite}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, unite: e.target.value } : x))}
                      className="w-full bg-transparent text-[12px] outline-none"
                    >
                      {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 pr-2" style={{ width: 80 }}>
                    <input
                      type="number" value={l.prixUnitaire}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, prixUnitaire: parseFloat(e.target.value) || 0 } : x))}
                      className="w-full bg-transparent text-[12px] text-right outline-none focus:bg-[#EEF3FF] focus:rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1.5 pr-2" style={{ width: 50 }}>
                    <input
                      type="number" value={l.tvaRate}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, tvaRate: parseFloat(e.target.value) || 0 } : x))}
                      className="w-full bg-transparent text-[12px] text-right outline-none focus:bg-[#EEF3FF] focus:rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1.5" style={{ width: 28 }}>
                    <button
                      onClick={() => setLignes(prev => prev.filter(x => x._id !== l._id))}
                      className="text-[#d1d5db] hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setLignes(prev => [...prev, { _id: uid(), description: '', quantite: 1, unite: 'U', prixUnitaire: 0, tvaRate: 20 }])}
          className="mt-2 flex items-center gap-1 text-[12px] text-[#3462EE] font-semibold hover:text-[#2550CC] transition-colors font-jakarta"
        >
          <Plus size={12} /> Ajouter une ligne
        </button>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Conditions de paiement, délai d'exécution…"
          className={inputCls + ' resize-none'}
        />
      </div>

      <div className="bg-[#f9f9f7] rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex justify-between text-[12px] text-[#6B7280]">
          <span>Total HT</span>
          <span className="font-semibold text-[#111]">{fmtEUR(ht)}</span>
        </div>
        {Object.entries(tvaMap).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, amount]) => (
          <div key={rate} className="flex justify-between text-[12px] text-[#6B7280]">
            <span>TVA {rate}%</span><span>{fmtEUR(amount)}</span>
          </div>
        ))}
        <div className="flex justify-between text-[14px] font-bold text-[#111] border-t border-[#e5e7eb] pt-2 mt-1">
          <span>Total TTC</span><span>{fmtEUR(ttc)}</span>
        </div>
      </div>

      <InfoSection
        devisId={initial.id}
        contactId={initial.contact_id}
        contactName={initial.contact_name}
        conversationId={initial.conversation_id}
        source={initial.source}
        createdAt={initial.created_at}
        envoyeLe={initial.envoye_le}
        pdfUrl={pdfUrl}
        montantHt={ht > 0 ? ht : initial.montant_ht}
      />

      <div>
        <button
          onClick={handleDelete}
          className="text-[12px] font-semibold text-red-500 hover:text-red-700 transition-colors font-jakarta"
        >
          Supprimer ce devis…
        </button>
      </div>
    </div>
  )

  const previewPanel = (
    <div className="overflow-y-auto bg-[#e8e9e4] flex flex-col items-center p-6 gap-4" style={{ scrollbarWidth: 'thin' }}>
      <div className="w-full max-w-[540px] flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Aperçu PDF</span>
        <div className="flex gap-2">
          {pdfUrl && (
            <>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                className="text-[11px] font-semibold bg-white text-[#6B7280] px-3 py-1.5 rounded-lg hover:text-[#111] transition-colors font-jakarta">
                ↗ Ouvrir
              </a>
              <a href={pdfUrl} download
                className="text-[11px] font-semibold bg-[#111] text-white px-3 py-1.5 rounded-lg hover:bg-[#333] transition-colors font-jakarta">
                ⬇ Télécharger
              </a>
            </>
          )}
        </div>
      </div>

      <div className="w-full max-w-[540px] bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-[#111111] px-6 py-5 flex justify-between">
          <div>
            <p className="text-[#E2FF8D] font-black text-[16px]">{initial.contact_name ?? 'SOREN'}</p>
            <p className="text-white/40 text-[9px] mt-1">{ville || 'Infrastructure d\'Acquisition BTP'}</p>
          </div>
          <div className="text-right">
            <p className="text-white font-outfit font-bold text-[18px]">DEVIS N° {initial.numero ?? '—'}</p>
            <p className="text-white/40 text-[9px] mt-1">{fmtDate(initial.created_at)}</p>
            <p className="text-white/70 text-[11px] font-semibold mt-2">{initial.contact_name ?? '—'}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-[#f9f9f7] rounded-xl p-3 mb-4 flex justify-between">
            <div>
              <p className="text-[9px] text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Objet</p>
              <p className="text-[13px] font-bold text-[#111]">{titre}</p>
              {chantier && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{chantier}</p>}
            </div>
            {dateVal && (
              <div className="text-right">
                <p className="text-[9px] text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Validité</p>
                <p className="text-[12px] font-bold text-[#111]">{fmtDate(dateVal)}</p>
              </div>
            )}
          </div>

          <table className="w-full mb-4" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#111' }}>
                {['Description', 'Qté', 'Unité', 'PU HT', 'TVA', 'Total HT'].map(h => (
                  <th key={h} className="text-left px-2 py-2 text-white"
                    style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.filter(l => l.description.trim()).map((l, i) => (
                <tr key={l._id} style={{ background: i % 2 === 0 ? 'white' : '#fafaf8', borderBottom: '1px solid #f0f0eb' }}>
                  <td className="px-2 py-1.5 text-[10px] text-[#111]">{l.description}</td>
                  <td className="px-2 py-1.5 text-[10px] text-right">{l.quantite}</td>
                  <td className="px-2 py-1.5 text-[10px]">{l.unite}</td>
                  <td className="px-2 py-1.5 text-[10px] text-right">{fmtEUR(l.prixUnitaire)}</td>
                  <td className="px-2 py-1.5 text-[10px] text-right">{l.tvaRate}%</td>
                  <td className="px-2 py-1.5 text-[10px] text-right font-semibold">{fmtEUR(l.quantite * l.prixUnitaire)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-4">
            <div style={{ width: 180 }}>
              <div className="flex justify-between text-[10px] text-[#6B7280] py-1">
                <span>Total HT</span><span>{fmtEUR(ht)}</span>
              </div>
              {Object.entries(tvaMap).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, amount]) => (
                <div key={rate} className="flex justify-between text-[10px] text-[#6B7280] py-1">
                  <span>TVA {rate}%</span><span>{fmtEUR(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold py-2 border-t-2 border-[#111] mt-1" style={{ fontSize: 13 }}>
                <span>Total TTC</span><span>{fmtEUR(ttc)}</span>
              </div>
            </div>
          </div>

          {notes && (
            <div className="bg-[#f9f9f7] rounded-xl px-3 py-2 text-[9px] text-[#6B7280] leading-relaxed">
              <strong>Notes :</strong> {notes}
            </div>
          )}
        </div>

        <div className="bg-[#111] px-6 py-2.5 flex justify-between">
          <span className="text-white/50 font-semibold" style={{ fontSize: 8 }}>Devis {initial.numero ?? '—'}</span>
          <span className="text-white/30" style={{ fontSize: 8 }}>Document généré par Soren</span>
        </div>
      </div>

      <div className="w-full max-w-[540px] flex flex-col gap-3">
        <SignatureSection
          devisId={initial.id}
          statut={sigStatut}
          contactEmail={initial.contact_email}
          signatureVuLe={initial.signature_vu_le}
          signatureSigne={initial.signature_signe_le}
          onStatutChange={setSigStatut}
        />
        <RelancesSection
          devisId={initial.id}
          devisCreatedAt={initial.created_at}
        />
        <StatsSection devisId={initial.id} />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-[#f0f0eb] px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#f5f5f0] rounded-xl flex items-center justify-center hover:bg-[#e5e7eb] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <div>
            <p className="text-[11px] text-[#9CA3AF] font-semibold font-jakarta">
              {initial.numero ?? '—'} · {initial.contact_name ?? '—'}
            </p>
            <p className="text-[15px] font-bold text-[#111]">{titre}</p>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-[#f0f0eb] rounded-xl p-1">
            {(['split', 'edit', 'preview'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1 rounded-lg text-[12px] font-semibold transition-all font-jakarta"
                style={{
                  background: tab === t ? 'white' : 'transparent',
                  color: tab === t ? '#111' : '#9ca3af',
                  boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t === 'split' ? 'Split' : t === 'edit' ? 'Édition' : 'Aperçu'}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#f5f5f0] text-[#111] rounded-xl px-3 py-2 text-[12px] font-semibold hover:bg-[#e5e7eb] transition-colors disabled:opacity-40 font-jakarta"
          >
            <Save size={13} /> {saving ? '…' : 'Sauvegarder'}
          </button>

          {pdfUrl ? (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#E2FF8D] text-[#111] rounded-xl px-3 py-2 text-[12px] font-semibold hover:bg-[#d4f570] transition-colors font-jakarta">
              <ExternalLink size={13} /> Voir PDF
            </a>
          ) : (
            <button
              onClick={handleGeneratePdf}
              disabled={genPdf}
              className="flex items-center gap-1.5 bg-[#E2FF8D] text-[#111] rounded-xl px-3 py-2 text-[12px] font-semibold hover:bg-[#d4f570] transition-colors disabled:opacity-40 font-jakarta"
            >
              <Download size={13} /> {genPdf ? '…' : 'Générer PDF'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden" style={{ gap: 1, background: '#e5e7eb' }}>
        {tab !== 'preview' && (
          <div
            className="bg-white flex flex-col"
            style={{ width: tab === 'split' ? '45%' : '100%', flexShrink: 0 }}
          >
            {formPanel}
          </div>
        )}
        {tab !== 'edit' && (
          <div className="flex-1 flex flex-col">
            {previewPanel}
          </div>
        )}
      </div>
    </div>
  )
}

// src/components/devis/DevisDetailView.tsx
'use client'

import { useState } from 'react'
import { ChevronLeft, Save, Download, ExternalLink, Plus, X, FileText, ZoomIn } from 'lucide-react'
import { ToastType } from '@/hooks/useToast'
import Select from '@/components/ui/Select'
import InfoSection from './InfoSection'
import SignatureSection from './SignatureSection'
import RelancesSection from './RelancesSection'
import PdfThumbnail from './PdfThumbnail'
import DevisTemplate from './DevisTemplate'

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
  adresse_client: string | null
  pdf_url: string | null; source: string
  signature_statut: SignatureStatut
  signature_vu_le: string | null
  signature_signe_le: string | null
}

const STATUT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  brouillon: { label: 'Brouillon', bg: '#FEF9C3', color: '#854D0E' },
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
  devis:       Devis
  onClose:     () => void
  onUpdated:   (d: Devis) => void
  onDeleted:   (id: string) => void
  brandColor?: string
  toast:       (message: string, type: ToastType) => void
}

export default function DevisDetailView({ devis: initial, onClose, onUpdated, onDeleted, brandColor = '#E2FF8D', toast }: DevisDetailViewProps) {
  const [titre, setTitreRaw]       = useState(initial.titre)
  const [lignes, setLignesRaw]     = useState<Ligne[]>(fromLignesDb(initial.lignes))
  const [notes, setNotesRaw]       = useState(initial.notes ?? '')
  const [ville, setVilleRaw]       = useState(initial.ville ?? '')
  const [dateVal, setDateValRaw]   = useState(initial.date_validite?.slice(0, 10) ?? '')
  const [chantier, setChantierRaw] = useState(initial.adresse_chantier ?? '')

  // Adresse client → 3 champs séparés
  const _parseAdresse = (raw: string | null) => {
    const lines = (raw ?? '').split('\n')
    const rue = lines[0] ?? ''
    const line2 = lines[1] ?? ''
    const spaceIdx = line2.search(/\s/)
    const cp   = spaceIdx > 0 ? line2.slice(0, spaceIdx) : line2
    const city = spaceIdx > 0 ? line2.slice(spaceIdx + 1) : ''
    return { rue, cp, city }
  }
  const _parsed = _parseAdresse(initial.adresse_client)
  const [adresseRue,  setAdresseRueRaw]  = useState(_parsed.rue)
  const [adresseCP,   setAdresseCPRaw]   = useState(_parsed.cp)
  const [adresseCity, setAdresseCityRaw] = useState(_parsed.city)

  // Recompose pour template + save
  const adresseClient = [adresseRue, [adresseCP, adresseCity].filter(Boolean).join(' ')].filter(Boolean).join('\n')

  function setTitre(v: string)        { setTitreRaw(v);        setDirty(true) }
  function setLignes(v: Ligne[] | ((p: Ligne[]) => Ligne[])) { setLignesRaw(v as Parameters<typeof setLignesRaw>[0]); setDirty(true) }
  function setNotes(v: string)        { setNotesRaw(v);        setDirty(true) }
  function setVille(v: string)        { setVilleRaw(v);        setDirty(true) }
  function setDateVal(v: string)      { setDateValRaw(v);      setDirty(true) }
  function setChantier(v: string)    { setChantierRaw(v);    setDirty(true) }
  function setAdresseRue(v: string)  { setAdresseRueRaw(v);  setDirty(true) }
  function setAdresseCP(v: string)   { setAdresseCPRaw(v);   setDirty(true) }
  function setAdresseCity(v: string) { setAdresseCityRaw(v); setDirty(true) }
  const [sigStatut, setSigStatut] = useState<SignatureStatut>(initial.signature_statut ?? 'non_envoye')
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [genPdf, setGenPdf]     = useState(false)
  const [dirty, setDirty]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [pdfUrl, setPdfUrl]     = useState(initial.pdf_url)
  const [showPreview, setShowPreview] = useState(false)

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
          adresse_client:   adresseClient || null,
          lignes:           toLignesPayload(validLignes),
          montant_ht:       ht > 0 ? ht : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      onUpdated(json.devis as Devis)
      setDirty(false)
      toast('Devis sauvegardé', 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur sauvegarde'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownload() {
    setGenPdf(true); setError(null)
    try {
      const res = await fetch(`/api/devis/${initial.id}/pdf`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur PDF')
      const url = json.pdf_url
      setPdfUrl(url)
      const blob = await (await fetch(url)).blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `devis-${initial.numero ?? initial.id}.pdf`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur PDF')
    } finally {
      setGenPdf(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce devis définitivement ?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/devis/${initial.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression')
      toast('Devis supprimé', 'success')
      onDeleted(initial.id)
    } catch {
      toast('Erreur lors de la suppression', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const formPanel = (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}>
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
          <div className="col-span-2">
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Rue</label>
            <input
              className={inputCls}
              value={adresseRue}
              onChange={e => setAdresseRue(e.target.value)}
              placeholder="21, chemin des Vignes"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Code postal</label>
            <input
              className={inputCls}
              value={adresseCP}
              onChange={e => setAdresseCP(e.target.value)}
              placeholder="34130"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Ville</label>
            <input
              className={inputCls}
              value={adresseCity}
              onChange={e => setAdresseCity(e.target.value)}
              placeholder="Montpellier"
            />
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
                  <td className="py-1.5 pr-2 align-top">
                    <textarea
                      value={l.description}
                      onChange={e => {
                        const el = e.target
                        el.style.height = 'auto'
                        el.style.height = el.scrollHeight + 'px'
                        setLignes(prev => prev.map(x => x._id === l._id ? { ...x, description: e.target.value } : x))
                      }}
                      placeholder="Libellé…"
                      rows={1}
                      className="w-full bg-transparent text-[12px] text-[#111] outline-none px-1 py-0.5 resize-none overflow-hidden leading-relaxed rounded border border-[#3462EE]/25 focus:border-[#3462EE]/60 focus:bg-[#EEF3FF]/40 transition-colors"
                      style={{ minHeight: '1.6em' }}
                    />
                  </td>
                  <td className="py-1.5 pr-2 align-top" style={{ width: 80 }}>
                    <input
                      type="number" value={l.quantite}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, quantite: parseFloat(e.target.value) || 0 } : x))}
                      className="w-full bg-[#f9f9f7] text-[12px] text-right outline-none px-2 py-1 rounded-lg border border-[#f0f0eb] hover:border-[#d1d5db] focus:border-[#3462EE] transition-colors"
                    />
                  </td>
                  <td className="py-1.5 pr-2 align-top" style={{ width: 80 }}>
                    <Select
                      size="sm"
                      value={l.unite}
                      onChange={v => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, unite: v } : x))}
                      options={UNITES.map(u => ({ label: u, value: u }))}
                    />
                  </td>
                  <td className="py-1.5 pr-2 align-top" style={{ width: 80 }}>
                    <input
                      type="number" value={l.prixUnitaire}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, prixUnitaire: parseFloat(e.target.value) || 0 } : x))}
                      className="w-full bg-[#f9f9f7] text-[12px] text-right outline-none px-2 py-1 rounded-lg border border-[#f0f0eb] hover:border-[#d1d5db] focus:border-[#3462EE] transition-colors"
                    />
                  </td>
                  <td className="py-1.5 pr-2 align-top" style={{ width: 90 }}>
                    <input
                      type="number" value={l.tvaRate}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, tvaRate: parseFloat(e.target.value) || 0 } : x))}
                      className="w-full bg-[#f9f9f7] text-[12px] text-right outline-none px-2 py-1 rounded-lg border border-[#f0f0eb] hover:border-[#d1d5db] focus:border-[#3462EE] transition-colors"
                    />
                  </td>
                  <td className="py-1.5 align-top" style={{ width: 28 }}>
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
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Délai d'exécution</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="ex : 4 mois à compter de la signature du devis"
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

      <div className="border-t border-[#f0f0eb] pt-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors font-jakarta disabled:opacity-50"
        >
          {deleting
            ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <X size={11} />
          }
          {deleting ? 'Suppression…' : 'Supprimer ce devis'}
        </button>
      </div>
    </div>
  )

  // ── Aperçu PDF complet (dans modal) ──────────────────────────
  const fullPreview = (
    <DevisTemplate
      numero={initial.numero}
      titre={titre}
      lignes={lignes}
      notes={notes}
      ville={ville}
      dateValidite={dateVal}
      adresseChantier={chantier}
      contactName={initial.contact_name}
      contactEmail={initial.contact_email}
      contactPhone={initial.contact_phone}
      adresseClient={adresseClient}
      createdAt={initial.created_at}
      brandColor={brandColor}
    />
  )

  // ── Panneau droit compact ─────────────────────────────────────
  const previewPanel = (
    <div className="w-[380px] flex-shrink-0 border-l border-[#e5e7eb] bg-[#F5F5F0] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}>

        {/* Miniature PDF cliquable */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-2">Document</p>
          <div
            onClick={() => setShowPreview(true)}
            className="w-full rounded-2xl overflow-hidden cursor-pointer group relative"
            style={{ height: 200, background: '#111' }}
          >
            <PdfThumbnail
              pdfUrl={pdfUrl}
              numero={initial.numero}
              titre={titre}
              brandColor={brandColor}
              montantTtc={ttc > 0 ? ttc : null}
            />
            {/* Overlay aperçu — toujours visible */}
            <div className="absolute top-2 left-2 bg-white/90 text-[#111] text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm pointer-events-none">
              <ZoomIn size={10} /> Aperçu
            </div>
          </div>
        </div>

        {/* Signature */}
        <SignatureSection
          devisId={initial.id}
          statut={sigStatut}
          contactEmail={initial.contact_email}
          signatureVuLe={initial.signature_vu_le}
          signatureSigne={initial.signature_signe_le}
          onStatutChange={setSigStatut}
        />

        {/* Relances */}
        <RelancesSection
          devisId={initial.id}
          devisCreatedAt={initial.created_at}
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header — ligne unique */}
      <div className="bg-white border-b border-[#f0f0eb] flex-shrink-0">
        <div className="flex items-center gap-4 px-5 py-4">

          {/* Retour */}
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#f5f5f0] rounded-xl flex items-center justify-center hover:bg-[#e5e7eb] transition-colors flex-shrink-0"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Identité */}
          <div className="flex-1 min-w-0">
            <h1 className="font-montserrat text-[17px] font-extrabold text-[#111] leading-tight truncate mb-0.5">
              {titre}
            </h1>
            <div className="flex items-center gap-2">
              {initial.numero && (
                <span className="text-[11px] text-[#C8CCC6] font-medium font-jakarta">{initial.numero}</span>
              )}
              {initial.numero && initial.contact_name && <span className="text-[#E5E7EB]">·</span>}
              {initial.contact_name && (
                <span className="text-[11px] text-[#9CA3AF] font-medium font-jakarta">{initial.contact_name}</span>
              )}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
          </div>

          {/* TTC */}
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-[#9CA3AF] font-medium mb-0.5">Total TTC</p>
            <p className="font-outfit text-[16px] font-extrabold text-[#111]">{fmtEUR(ttc > 0 ? ttc : 0)}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all font-jakarta ${
                dirty
                  ? 'bg-[#111] text-white hover:bg-[#333]'
                  : 'bg-transparent text-[#C8CCC6] cursor-default'
              }`}
            >
              <Save size={13} />
              {saving
                ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : 'Sauvegarder'
              }
            </button>
            <button
                onClick={handleDownload}
                disabled={genPdf}
                className="flex items-center gap-1.5 bg-[#E2FF8D] text-[#111] rounded-xl px-4 py-2 text-[12px] font-bold hover:bg-[#d4f570] transition-colors disabled:opacity-40 font-jakarta"
              >
                <Download size={13} /> {genPdf ? '…' : 'Télécharger'}
              </button>
          </div>

        </div>
      </div>

      <div className="flex-1 flex overflow-hidden" style={{ gap: 1, background: '#e5e7eb' }}>
        <div className="flex-1 bg-white flex flex-col min-h-0">
          {formPanel}
        </div>
        {previewPanel}
      </div>

      {/* Modal aperçu PDF complet */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto py-8 px-6"
          onClick={() => setShowPreview(false)}
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#555 transparent' }}
        >
          <div
            className="relative flex-shrink-0 shadow-2xl"
            style={{ width: 'fit-content' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#111] transition-colors shadow-sm"
            >
              <X size={14} />
            </button>
            {fullPreview}
          </div>
        </div>
      )}
    </div>
  )
}

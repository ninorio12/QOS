'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, FileText, Users, GitMerge, Building2, Check, AlertCircle, ChevronRight, Layers } from 'lucide-react'
import { type Contact, getAvatarColor, getInitials } from './types'
import { type GHLPipelineData } from '@/components/pipeline/types'

const PIPELINE_KW: Record<'acquisition' | 'reactivation', string[]> = {
  acquisition:  ['acquisition'],
  reactivation: ['réactivation', 'reactivation', 'réactiv'],
}

function classifyPipeline(name: string): 'acquisition' | 'reactivation' | null {
  const n = name.toLowerCase()
  for (const [type, kws] of Object.entries(PIPELINE_KW)) {
    if (kws.some(k => n.includes(k))) return type as 'acquisition' | 'reactivation'
  }
  return null
}

// ─── CRM fields to map to ─────────────────────────────────────
const GHL_FIELDS = [
  { key: 'firstName',   label: 'Prénom' },
  { key: 'lastName',    label: 'Nom' },
  { key: 'email',       label: 'E-mail' },
  { key: 'phone',       label: 'Téléphone' },
  { key: 'companyName', label: 'Entreprise' },
  { key: '_ignore',     label: 'Ignorer cette colonne' },
]

type Step = 1 | 2 | 3 | 4
type ImportType = 'contacts' | 'prospects'

type ParsedRow = Record<string, string>
type Mapping = Record<string, string> // csvCol → ghlKey

// ─── CSV parser ───────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const sep     = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  const rows    = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
  return { headers, rows }
}

// Auto-detect mapping from header names
function autoMap(headers: string[]): Mapping {
  const mapping: Mapping = {}
  headers.forEach(h => {
    const l = h.toLowerCase()
    if (/pr[eé]nom|first/.test(l))      mapping[h] = 'firstName'
    else if (/^nom$|last|surname/.test(l)) mapping[h] = 'lastName'
    else if (/mail/.test(l))             mapping[h] = 'email'
    else if (/t[eé]l|phone|mobile/.test(l)) mapping[h] = 'phone'
    else if (/entreprise|company|soci/.test(l)) mapping[h] = 'companyName'
    else                                 mapping[h] = '_ignore'
  })
  return mapping
}

// ─── Step indicator ───────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Début',       sub: 'Sélectionnez des objets' },
    { n: 2, label: 'Télécharger', sub: 'Uploadez le fichier CSV' },
    { n: 3, label: 'Carte',       sub: 'Mappez les colonnes' },
    { n: 4, label: 'Vérifier',    sub: 'Confirmez l\'import' },
  ]
  return (
    <div className="flex items-start gap-0 px-6 py-4 border-b border-soren-border">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s.n < step  ? 'bg-soren-sidebar text-white' :
              s.n === step ? 'bg-soren-sidebar text-white ring-4 ring-[#FF4D00]' :
              'bg-[#F0F0EE] text-soren-subtle border border-soren-border'
            }`}>
              {s.n < step ? <Check size={12} /> : s.n}
            </div>
            <div className="text-center">
              <p className={`text-[11px] font-semibold ${s.n <= step ? 'text-soren-text' : 'text-soren-subtle'}`}>{s.label}</p>
              <p className="text-[10px] text-soren-subtle leading-tight max-w-[90px]">{s.sub}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mt-[-14px] mx-2 ${s.n < step ? 'bg-soren-sidebar' : 'bg-[#E5E7EB]'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────
export default function ImportModal({
  onClose,
  onImported,
}: {
  onClose:    () => void
  onImported: (count: number) => void
}) {
  const [step,           setStep]           = useState<Step>(1)
  const [importType,     setImportType]     = useState<ImportType>('contacts')
  const [file,           setFile]           = useState<File | null>(null)
  const [headers,        setHeaders]        = useState<string[]>([])
  const [rows,           setRows]           = useState<ParsedRow[]>([])
  const [mapping,        setMapping]        = useState<Mapping>({})
  const [dragging,       setDragging]       = useState(false)
  const [importing,      setImporting]      = useState(false)
  const [result,         setResult]         = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null)
  const [pipelines,      setPipelines]      = useState<GHLPipelineData[]>([])
  const [pipelineChoice, setPipelineChoice] = useState<'acquisition' | 'reactivation' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/pipelines').then(r => r.json()).then((d: { pipelines?: GHLPipelineData[] }) => {
      const all = d.pipelines ?? []
      const filtered = all.filter(p => classifyPipeline(p.name) !== null)
      setPipelines(filtered)
    }).catch(() => {})
  }, [])

  // ── File processing ──────────────────────────────────────────
  function processFile(f: File) {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text    = e.target?.result as string
      const parsed  = parseCSV(text)
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setMapping(autoMap(parsed.headers))
    }
    reader.readAsText(f, 'UTF-8')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) processFile(f)
  }, [])

  // ── Build mapped rows ────────────────────────────────────────
  function buildMappedRows() {
    return rows.map(row => {
      const out: Record<string, string> = { firstName: '', lastName: '', email: '', phone: '', companyName: '' }
      headers.forEach(h => {
        const ghlKey = mapping[h]
        if (ghlKey && ghlKey !== '_ignore') out[ghlKey] = row[h] ?? ''
      })
      return out
    }).filter(r => r.firstName || r.lastName || r.email)
  }

  // ── Import ────────────────────────────────────────────────────
  async function handleImport() {
    const mapped = buildMappedRows()
    setImporting(true)
    const selectedPipeline = pipelineChoice
      ? pipelines.find(p => classifyPipeline(p.name) === pipelineChoice)
      : null
    const pipelineId   = selectedPipeline?.id ?? null
    const firstStageId = selectedPipeline?.stages[0]?.id ?? null
    try {
      const res  = await fetch('/api/contact/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows: mapped, pipelineId, firstStageId }),
      })
      const data = await res.json() as { created: number; errors: { row: number; message: string }[] }
      setResult(data)
      setStep(4)
    } finally {
      setImporting(false)
    }
  }

  const mappedPreview = step >= 3 ? buildMappedRows().slice(0, 5) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-soren-card rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-soren-text">Importations</h2>
            <p className="text-xs text-soren-subtle mt-0.5">Importez contacts, prospects et des objets personnalisés</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB] transition-colors">
            <X size={14} className="text-soren-muted" />
          </button>
        </div>

        <StepBar step={step} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1 : Début ──────────────────────────────── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-soren-text mb-3">Sélectionner des objets pour commencer l&apos;importation</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'contacts',  Icon: Users,     label: 'Contacts',   desc: 'Contient la liste de tous les prospects, leurs informations et leurs spécifications.' },
                    { key: 'prospects', Icon: GitMerge,  label: 'Prospects',  desc: 'Contient la liste de toutes les ventes, leurs étapes, leur statut et leur progression dans le pipeline.' },
                    { key: 'companies', Icon: Building2, label: 'Companies',  desc: 'Contains list of all businesses, their details, and contact information.', disabled: true },
                  ].map(({ key, Icon, label, desc, disabled }) => (
                    <button
                      key={key}
                      disabled={disabled}
                      onClick={() => !disabled && setImportType(key as ImportType)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                        disabled ? 'border-[#F0F0EE] opacity-40 cursor-not-allowed' :
                        importType === key ? 'border-[#111111] bg-[#F9F9F7]' :
                        'border-soren-border hover:border-[#D1D5DB]'
                      }`}
                    >
                      <Icon size={18} className={`mb-2 ${importType === key ? 'text-soren-text' : 'text-soren-subtle'}`} />
                      <p className={`text-sm font-semibold mb-1 ${importType === key ? 'text-soren-text' : 'text-[#374151]'}`}>{label}</p>
                      <p className="text-[11px] text-soren-subtle leading-relaxed">{desc}</p>
                      {importType === key && !disabled && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded bg-soren-sidebar flex items-center justify-center">
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pipeline assignment */}
              <div className="border border-soren-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={14} className="text-soren-muted" />
                  <h3 className="text-sm font-semibold text-soren-text">Assigner à un pipeline</h3>
                  <span className="text-[10px] text-soren-subtle font-medium">optionnel</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: null,           label: 'Contacts uniquement', desc: 'Sans opportunité',       color: '#9CA3AF' },
                    { type: 'acquisition',  label: 'Acquisition',         desc: '1ère étape auto',        color: '#3462EE' },
                    { type: 'reactivation', label: 'Réactivation',        desc: '1ère étape auto',        color: '#F97316' },
                  ].map(opt => {
                    const isSelected = pipelineChoice === opt.type
                    const pipeFound  = opt.type ? pipelines.find(p => classifyPipeline(p.name) === opt.type) : true
                    return (
                      <button
                        key={String(opt.type)}
                        onClick={() => setPipelineChoice(opt.type as typeof pipelineChoice)}
                        disabled={!!opt.type && !pipeFound}
                        className={`relative p-3 rounded-xl border-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'border-[#111111] bg-[#F9F9F7]'
                            : 'border-soren-border hover:border-[#D1D5DB]'
                        }`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full mb-2" style={{ background: opt.color }} />
                        <p className={`text-xs font-semibold mb-0.5 ${isSelected ? 'text-soren-text' : 'text-[#374151]'}`}>{opt.label}</p>
                        <p className="text-[10px] text-soren-subtle">{opt.desc}</p>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded bg-soren-sidebar flex items-center justify-center">
                            <Check size={9} className="text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {pipelineChoice && (
                  <p className="text-[10px] text-soren-muted mt-2.5">
                    Chaque contact importé sera automatiquement placé en 1ère étape du pipeline {pipelineChoice === 'acquisition' ? 'Acquisition' : 'Réactivation'}.
                  </p>
                )}
              </div>

              <div className="border border-soren-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-soren-text mb-1">Importations précédentes</h3>
                <div className="h-px bg-[#F0F0EE] my-3" />
                <p className="text-xs text-soren-subtle">Les importations précédentes se trouvent dans Actions en masse</p>
              </div>
            </div>
          )}

          {/* ── Step 2 : Télécharger ─────────────────────────── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-soren-text">Télécharger votre fichier CSV</h3>
                <a
                  href="data:text/csv;charset=utf-8,Prénom,Nom,E-mail,Téléphone,Entreprise%0AJean,Dupont,jean@exemple.fr,+33600000000,Dupont BTP"
                  download="template_contacts.csv"
                  className="text-xs text-soren-muted underline hover:text-soren-text"
                >
                  Télécharger le modèle CSV
                </a>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  dragging ? 'border-[#111111] bg-soren-elevated' :
                  file     ? 'border-[#22C55E] bg-[#F0FDF4]' :
                  'border-soren-border hover:border-[#D1D5DB] hover:bg-[#FAFAF8]'
                }`}
              >
                {file ? (
                  <>
                    <FileText size={32} className="text-[#22C55E]" />
                    <p className="text-sm font-semibold text-soren-text">{file.name}</p>
                    <p className="text-xs text-soren-muted">{rows.length} lignes détectées · {headers.length} colonnes</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-soren-subtle" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-soren-text">Glissez votre fichier CSV ici</p>
                      <p className="text-xs text-soren-subtle mt-0.5">ou cliquez pour parcourir</p>
                    </div>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
              </div>

              {file && rows.length > 0 && (
                <div className="bg-soren-elevated rounded-xl px-4 py-3 text-xs text-soren-muted">
                  Aperçu — {rows.length} contacts à importer. Colonne détectées : {headers.join(', ')}.
                </div>
              )}
            </div>
          )}

          {/* ── Step 3 : Carte ───────────────────────────────── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-soren-text">Cartographiez les colonnes sur les champs CRM</h3>
              <div className="border border-soren-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#F9F9F7] border-b border-soren-border">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-soren-muted uppercase tracking-wide">Colonne CSV</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-soren-muted uppercase tracking-wide">Aperçu</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-soren-muted uppercase tracking-wide">Champ CRM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map(h => (
                      <tr key={h} className="border-b border-[#F0F0EE] last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="text-sm font-medium text-soren-text">{h}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-soren-subtle truncate max-w-[120px] block">
                            {rows[0]?.[h] ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={mapping[h] ?? '_ignore'}
                            onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                            className="w-full bg-soren-elevated border-0 rounded-lg px-2.5 py-1.5 text-xs text-soren-text focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 appearance-none"
                          >
                            {GHL_FIELDS.map(f => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step 4 : Vérifier ────────────────────────────── */}
          {step === 4 && result && (
            <div className="flex flex-col gap-4">
              {/* Result banner */}
              <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${result.errors.length === 0 ? 'bg-[#F0FDF4]' : 'bg-[#FEF2F2]'}`}>
                {result.errors.length === 0
                  ? <Check size={20} className="text-[#22C55E] flex-shrink-0" />
                  : <AlertCircle size={20} className="text-[#EF4444] flex-shrink-0" />
                }
                <div>
                  <p className="text-sm font-bold text-soren-text">
                    {result.created} contact{result.created > 1 ? 's' : ''} importé{result.created > 1 ? 's' : ''} avec succès
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-xs text-[#EF4444] mt-0.5">{result.errors.length} erreur{result.errors.length > 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>

              {/* Preview table */}
              {mappedPreview.length > 0 && (
                <div className="border border-soren-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F9F9F7] border-b border-soren-border">
                      <tr>
                        {['Prénom', 'Nom', 'E-mail', 'Téléphone', 'Entreprise'].map(c => (
                          <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold text-soren-muted uppercase tracking-wide">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mappedPreview.map((r, i) => {
                        const initials = `${r.firstName?.[0] ?? ''}${r.lastName?.[0] ?? ''}`.toUpperCase() || '?'
                        const color    = getAvatarColor(initials)
                        const isDark   = color === '#FF4D00' || color === '#EFE347'
                        return (
                          <tr key={i} className="border-b border-[#F0F0EE] last:border-0">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                  style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}>
                                  {initials}
                                </div>
                                <span className="text-xs text-soren-text">{r.firstName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-[#374151]">{r.lastName}</td>
                            <td className="px-3 py-2.5 text-xs text-[#374151]">{r.email || '—'}</td>
                            <td className="px-3 py-2.5 text-xs text-[#374151]">{r.phone || '—'}</td>
                            <td className="px-3 py-2.5 text-xs text-[#374151]">{r.companyName || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — preview before importing */}
          {step === 4 && !result && (
            <div className="flex flex-col gap-4">
              <div className="bg-soren-elevated rounded-xl px-4 py-3 text-sm text-soren-text">
                <span className="font-bold">{buildMappedRows().length} contacts</span> prêts à être importés.
              </div>
              <div className="border border-soren-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#F9F9F7] border-b border-soren-border">
                    <tr>
                      {['Prénom', 'Nom', 'E-mail', 'Téléphone', 'Entreprise'].map(c => (
                        <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold text-soren-muted uppercase tracking-wide">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {buildMappedRows().slice(0, 8).map((r, i) => (
                      <tr key={i} className="border-b border-[#F0F0EE] last:border-0">
                        <td className="px-3 py-2.5 text-xs text-soren-text">{r.firstName || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-[#374151]">{r.lastName || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-[#374151]">{r.email || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-[#374151]">{r.phone || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-[#374151]">{r.companyName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-soren-border flex-shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && !result && (
              <button
                onClick={() => setStep(s => (s - 1) as Step)}
                className="px-4 py-2 rounded-full border border-soren-border text-sm text-soren-muted hover:border-[#D1D5DB] hover:text-soren-text transition-colors"
              >
                Retour
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-full border border-soren-border text-sm text-soren-muted hover:border-[#D1D5DB] hover:text-soren-text transition-colors">
              {result ? 'Fermer' : 'Annuler'}
            </button>

            {!result && step < 4 && (
              <button
                onClick={() => {
                  if (step === 2 && !file) return
                  setStep(s => (s + 1) as Step)
                }}
                disabled={step === 2 && !file}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-soren-sidebar hover:bg-[#2a2a2a] disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                Suivant <ChevronRight size={14} />
              </button>
            )}

            {!result && step === 4 && (
              <button
                onClick={handleImport}
                disabled={importing || buildMappedRows().length === 0}
                className="px-5 py-2 rounded-full bg-soren-sidebar hover:bg-[#2a2a2a] disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                {importing ? 'Import en cours...' : `Importer ${buildMappedRows().length} contacts`}
              </button>
            )}

            {result && (
              <button
                onClick={() => onImported(result.created)}
                className="px-5 py-2 rounded-full bg-soren-sidebar hover:bg-[#2a2a2a] text-white text-sm font-semibold transition-colors"
              >
                Terminer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

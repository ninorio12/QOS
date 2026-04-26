'use client'

import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { type Opportunity, type GHLPipelineData } from './types'
import { fetchJSON } from '@/lib/fetchJSON'

// ─── Props ────────────────────────────────────────────────────
interface EditProps {
  mode?:             'edit'
  opp:               Opportunity
  pipelines:         GHLPipelineData[]
  onClose:           () => void
  onUpdate:          (updated: Partial<Opportunity>) => void
  onCreate?:         never
  initialPipelineId?: never
  initialStageId?:   never
}

interface CreateProps {
  mode:              'create'
  opp?:              never
  pipelines:         GHLPipelineData[]
  onClose:           () => void
  onUpdate?:         never
  onCreate:          (opp: Opportunity) => void
  initialPipelineId: string
  initialStageId:    string
}

type Props = EditProps | CreateProps

// ─── Constants ────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte', won: 'Gagnée', lost: 'Perdue', abandoned: 'Abandonnée',
}

const SOURCES = ['', 'Meta Ads', 'WhatsApp', 'LinkedIn', 'Téléphone', 'Site web', 'Referral', 'Email']

type Tab = 'info' | 'tasks' | 'notes'

// ─── Component ───────────────────────────────────────────────
export default function OppDetailModal(props: Props) {
  const isCreate = props.mode === 'create'

  const [tab,         setTab]         = useState<Tab>('info')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // Contact fields (editable in create mode)
  const [contactName, setContactName] = useState(props.opp?.name    ?? '')
  const [email,       setEmail]       = useState(props.opp?.email   ?? '')
  const [phone,       setPhone]       = useState(props.opp?.phone   ?? '')
  const [company,     setCompany]     = useState(props.opp?.company ?? '')

  // Opportunity fields
  const [oppName,     setOppName]     = useState(props.opp?.name    ?? '')
  const [value,       setValue]       = useState(String(props.opp?.value ?? ''))
  const [status,      setStatus]      = useState<Opportunity['status']>(props.opp?.status ?? 'open')
  const [source,      setSource]      = useState(props.opp?.source  ?? '')
  const [pipelineId,  setPipelineId]  = useState(props.opp?.pipelineId  ?? props.initialPipelineId ?? '')
  const [stageId,     setStageId]     = useState(props.opp?.stageId     ?? props.initialStageId    ?? '')

  const pipeline = props.pipelines.find(p => p.id === pipelineId)
  const stages   = pipeline?.stages ?? []

  function stripEmoji(str: string) {
    return Array.from(str)
      .filter(ch => { const cp = ch.codePointAt(0) ?? 0; return cp < 0x2600 || (cp > 0x27BF && cp < 0x1F000) || cp > 0x1FFFF })
      .join('')
      .trim()
  }

  // Sync stageId when pipeline changes
  function handlePipelineChange(newPipelineId: string) {
    setPipelineId(newPipelineId)
    const newPipeline = props.pipelines.find(p => p.id === newPipelineId)
    setStageId(newPipeline?.stages[0]?.id ?? '')
  }

  async function handleSave() {
    if (!contactName.trim()) return
    setSaving(true)
    setError(null)

    try {
      if (isCreate) {
        const data = await fetchJSON<{ opp: Opportunity }>('/api/opp', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            contactName: contactName.trim(),
            email, phone, company, pipelineId,
            pipelineStageId: stageId,
            monetaryValue:   parseFloat(value) || 0,
            source,
          }),
        })
        props.onCreate(data.opp)
        props.onClose()
      } else {
        await fetchJSON(`/api/opp/${props.opp.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            name:            oppName,
            monetaryValue:   parseFloat(value) || 0,
            status,
            pipelineId:      props.opp.pipelineId,
            pipelineStageId: stageId,
          }),
        })
        props.onUpdate({ name: oppName, value: parseFloat(value) || 0, status, stageId })
        props.onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const NAV: { key: Tab; label: string }[] = [
    { key: 'info',  label: "Informations sur l'opportunité" },
    { key: 'tasks', label: 'Tâches' },
    { key: 'notes', label: 'Remarques' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={props.onClose} />

      <div className="relative bg-soren-card rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-soren-border flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-soren-text">
              {isCreate ? 'Nouveau prospect' : `Modifier "${props.opp.name}"`}
            </h2>
            <p className="text-xs text-soren-subtle mt-0.5">
              {isCreate ? 'Créer un contact et une opportunité dans le CRM.' : 'opportunité, activités, remarques et rendez-vous.'}
            </p>
          </div>
          <button
            onClick={props.onClose}
            className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB] transition-colors"
          >
            <X size={14} className="text-soren-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left nav */}
          <div className="w-48 flex-shrink-0 border-r border-soren-border py-4 px-3 flex flex-col gap-1">
            {NAV.map(n => (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  tab === n.key
                    ? 'bg-soren-sidebar text-white'
                    : 'text-soren-muted hover:bg-soren-elevated hover:text-soren-text'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === 'info' && (
              <div className="flex flex-col gap-6">

                {/* Contact section */}
                <div>
                  <h3 className="text-sm font-bold text-soren-text mb-4">Informations Contact</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <EditableField
                      label="Nom du contact *"
                      value={isCreate ? contactName : props.opp.name}
                      editable={isCreate}
                      onChange={setContactName}
                    />
                    <EditableField
                      label="E-mail"
                      value={isCreate ? email : (props.opp.email || '—')}
                      editable={isCreate}
                      onChange={setEmail}
                      type="email"
                    />
                    <EditableField
                      label="Téléphone"
                      value={isCreate ? phone : (props.opp.phone || '—')}
                      editable={isCreate}
                      onChange={setPhone}
                      type="tel"
                    />
                    <EditableField
                      label="Entreprise"
                      value={isCreate ? company : (props.opp.company || '—')}
                      editable={isCreate}
                      onChange={setCompany}
                    />
                  </div>
                </div>

                {/* Opportunity section */}
                <div>
                  <h3 className="text-sm font-bold text-soren-text mb-4">{"Informations sur l'Opportunité"}</h3>
                  <div className="flex flex-col gap-3">

                    {/* Opp name — hidden in create (uses contactName) */}
                    {!isCreate && (
                      <div>
                        <label className="block text-xs text-soren-muted mb-1.5 font-medium">{"Nom de l'opportunité"}</label>
                        <input
                          value={oppName}
                          onChange={e => setOppName(e.target.value)}
                          className="w-full bg-soren-elevated border-0 rounded-xl px-3 py-2.5 text-sm text-soren-text focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {/* Pipeline */}
                      <div>
                        <label className="block text-xs text-soren-muted mb-1.5 font-medium">Pipeline</label>
                        {isCreate ? (
                          <select
                            value={pipelineId}
                            onChange={e => handlePipelineChange(e.target.value)}
                            className="w-full bg-soren-elevated border-0 rounded-xl px-3 py-2.5 text-sm text-soren-text focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 appearance-none"
                          >
                            {props.pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        ) : (
                          <div className="bg-soren-elevated rounded-xl px-3 py-2.5 text-sm text-soren-muted">
                            {pipeline?.name ?? '—'}
                          </div>
                        )}
                      </div>

                      {/* Stage */}
                      <div>
                        <label className="block text-xs text-soren-muted mb-1.5 font-medium">Étape</label>
                        <select
                          value={stageId}
                          onChange={e => setStageId(e.target.value)}
                          className="w-full bg-soren-elevated border-0 rounded-xl px-3 py-2.5 text-sm text-soren-text focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 appearance-none"
                        >
                          {stages.map(s => <option key={s.id} value={s.id}>{stripEmoji(s.name)}</option>)}
                        </select>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-xs text-soren-muted mb-1.5 font-medium">Statut</label>
                        <select
                          value={status}
                          onChange={e => setStatus(e.target.value as Opportunity['status'])}
                          className="w-full bg-soren-elevated border-0 rounded-xl px-3 py-2.5 text-sm text-soren-text focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 appearance-none"
                        >
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>

                      {/* Value */}
                      <div>
                        <label className="block text-xs text-soren-muted mb-1.5 font-medium">Valeur (€)</label>
                        <input
                          type="number"
                          value={value}
                          onChange={e => setValue(e.target.value)}
                          className="w-full bg-soren-elevated border-0 rounded-xl px-3 py-2.5 text-sm text-soren-text focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40"
                        />
                      </div>

                      {/* Source (create mode only) */}
                      {isCreate && (
                        <div>
                          <label className="block text-xs text-soren-muted mb-1.5 font-medium">Source</label>
                          <select
                            value={source}
                            onChange={e => setSource(e.target.value)}
                            className="w-full bg-soren-elevated border-0 rounded-xl px-3 py-2.5 text-sm text-soren-text focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 appearance-none"
                          >
                            {SOURCES.map(s => (
                              <option key={s} value={s}>{s || 'Direct'}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta (edit mode only) */}
                {!isCreate && (
                  <div className="text-[11px] text-soren-subtle flex flex-col gap-0.5 pt-2 border-t border-[#F0F0F0]">
                    <span>
                      Créé le :{' '}
                      {new Date(props.opp.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                    <span>Source : {props.opp.source || 'Direct'}</span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <p className="text-xs text-[#EF4444] bg-[#FEF2F2] rounded-xl px-3 py-2">{error}</p>
                )}
              </div>
            )}

            {tab === 'tasks' && (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <CheckCircle2 size={32} className="text-[#E5E7EB]" />
                <p className="text-sm text-soren-subtle">Aucune tâche pour le moment</p>
              </div>
            )}

            {tab === 'notes' && (
              <div className="flex flex-col gap-3">
                <textarea
                  placeholder="Ajouter une remarque..."
                  rows={6}
                  className="w-full bg-soren-elevated border-0 rounded-xl px-3 py-2.5 text-sm text-soren-text placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 resize-none"
                />
                <button className="self-end bg-soren-sidebar text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#2a2a2a] transition-colors">
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-soren-border flex-shrink-0">
          <button
            onClick={props.onClose}
            className="px-5 py-2 rounded-full border border-soren-border text-sm text-soren-muted hover:border-[#D1D5DB] hover:text-soren-text transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !contactName.trim()}
            className="px-5 py-2 rounded-full bg-soren-sidebar text-white text-sm font-semibold hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
          >
            {saving ? (isCreate ? 'Création...' : 'Enregistrement...') : (isCreate ? 'Créer le prospect' : 'Mise à jour')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Editable / readonly field ─────────────────────────────────
function EditableField({
  label, value, editable, onChange, type = 'text',
}: {
  label:    string
  value:    string
  editable: boolean
  onChange: (v: string) => void
  type?:    string
}) {
  return (
    <div>
      <label className="block text-xs text-soren-muted mb-1.5 font-medium">{label}</label>
      {editable ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={label.replace(' *', '')}
          className="w-full px-3 py-2.5 text-sm bg-soren-elevated border-0 rounded-xl text-soren-text placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40"
        />
      ) : (
        <div className="px-3 py-2.5 text-sm rounded-xl bg-[#F9F9F7] text-soren-muted">
          {value}
        </div>
      )}
    </div>
  )
}

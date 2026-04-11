'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, Bot, Workflow, ExternalLink, Save, MessageSquare, ChevronDown, Phone, Mic, Clock, Settings2, PhoneCall, PhoneOff, Volume2, KeyRound } from 'lucide-react'
import type { GHLWorkflow } from '@/lib/ghl'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EscaladeProps {
  initialSystemPrompt: string
  initialAutoResponse: boolean
  initialBudgetMin:    number
  initialActiveHours:  { start: string; end: string }
}

interface Props {
  workflows: GHLWorkflow[]
  escalade:  EscaladeProps
}

type Tab = 'ghl-workflows' | 'ghl-chatbot' | 'reception' | 'n8n' | 'ghl-forms'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusBadge({ status }: { status: GHLWorkflow['status'] }) {
  return status === 'published'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Actif</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-[#6B7280]">Brouillon</span>
}

// ─── Trigger / Action labels ─────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  ContactCreated:              'Nouveau contact créé',
  ContactTagAdded:             'Tag ajouté au contact',
  ContactTagRemoved:           'Tag retiré du contact',
  OpportunityStageChanged:     'Étape d\'opportunité changée',
  OpportunityStatusChanged:    'Statut opportunité changé',
  AppointmentBooked:           'RDV réservé',
  AppointmentCancelled:        'RDV annulé',
  AppointmentNoShow:           'RDV manqué',
  FormSubmitted:               'Formulaire soumis',
  SurveySubmitted:             'Sondage soumis',
  InboundMessage:              'Message entrant reçu',
  ConversationUnread:          'Conversation non lue',
  NoteAdded:                   'Note ajoutée',
  TaskCompleted:               'Tâche complétée',
  PipelineStageChanged:        'Étape pipeline changée',
  ManuallyTriggered:           'Déclenchement manuel',
  DateTimeEvent:               'Date/heure programmée',
  ContactDndChanged:           'DND contact changé',
  StageChanged:                'Étape changée',
  LeadConnectorFormSubmitted:  'Formulaire LC soumis',
}

const ACTION_LABELS: Record<string, string> = {
  SendEmail:               'Envoyer un email',
  SendSMS:                 'Envoyer un SMS',
  SendWhatsapp:            'Envoyer WhatsApp',
  AddToWorkflow:           'Ajouter à un workflow',
  RemoveFromWorkflow:      'Retirer d\'un workflow',
  AddTag:                  'Ajouter un tag',
  RemoveTag:               'Retirer un tag',
  AssignUser:              'Assigner un agent',
  CreateOpportunity:       'Créer une opportunité',
  UpdateOpportunity:       'Mettre à jour opportunité',
  MoveToStage:             'Changer d\'étape',
  AddNote:                 'Ajouter une note',
  CreateTask:              'Créer une tâche',
  Wait:                    'Attendre',
  IfElse:                  'Condition Si/Sinon',
  SendInternalNotification:'Notification interne',
  UpdateContact:           'Mettre à jour contact',
  AddToFunnel:             'Ajouter à un funnel',
  Webhook:                 'Envoyer un webhook',
  GoToWorkflow:            'Aller à un workflow',
  SetEventStartDate:       'Définir date événement',
  GPTAssistant:            'Assistant GPT',
  ConversationAI:          'IA Conversation',
}

function labelTrigger(type: string) {
  return TRIGGER_LABELS[type] ?? type
}

function labelAction(type: string) {
  return ACTION_LABELS[type] ?? type
}

// ─── Onglet Workflows GHL ─────────────────────────────────────────────────────

function GHLWorkflowsTab({ workflows }: { workflows: GHLWorkflow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#6B7280]">Automatisations configurées dans GoHighLevel — lecture seule.</p>
        <a
          href="https://app.gohighlevel.com/automations"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#3462EE] hover:underline"
        >
          Gérer dans GHL <ExternalLink size={11} />
        </a>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center justify-center text-center">
          <Zap size={32} className="text-[#6B7280] mb-3" strokeWidth={1.5} />
          <p className="text-[#6B7280] text-sm">Aucun workflow récupéré depuis GHL</p>
          <p className="text-[#9CA3AF] text-xs mt-1">Vérifie que ton API Key GHL a les droits de lecture workflows.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {workflows.map(wf => {
            const isOpen = expanded === wf.id
            const triggers = wf.triggers ?? []
            const actions  = wf.actions  ?? []

            return (
              <div key={wf.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  className="w-full px-5 py-4 flex items-center gap-4 text-left"
                  onClick={() => setExpanded(isOpen ? null : wf.id)}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#EEF0EB] flex items-center justify-center flex-shrink-0">
                    <Zap size={16} className="text-[#3462EE]" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#111111] font-semibold text-sm truncate">{wf.name}</p>
                    <p className="text-[#6B7280] text-xs mt-0.5">
                      {triggers.length > 0
                        ? `Déclenché par : ${triggers.map(t => labelTrigger(t.type)).join(', ')}`
                        : `Modifié le ${formatDate(wf.updatedAt)}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={wf.status} />
                    <ChevronDown size={14} className={`text-[#6B7280] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 border-t border-[#F3F4F6] pt-3 space-y-3">
                    {wf.description && (
                      <p className="text-sm text-[#374151] leading-relaxed">{wf.description}</p>
                    )}

                    {triggers.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">Déclencheurs</p>
                        <div className="flex flex-wrap gap-1.5">
                          {triggers.map((t, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 font-medium">
                              {labelTrigger(t.type)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {actions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">Actions ({actions.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {actions.map((a, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-[#EEF0EB] text-[#374151] font-medium">
                              {labelAction(a.type)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {triggers.length === 0 && actions.length === 0 && (
                      <p className="text-xs text-[#9CA3AF]">Détails non disponibles — ouvrir dans GHL pour voir les règles.</p>
                    )}

                    <p className="text-xs text-[#9CA3AF]">Modifié le {formatDate(wf.updatedAt)}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Onglet Chatbot GHL ───────────────────────────────────────────────────────

function GHLChatbotTab({ initialSystemPrompt, initialAutoResponse, initialBudgetMin, initialActiveHours }: EscaladeProps) {
  const [systemPrompt,   setSystemPrompt]   = useState(initialSystemPrompt)
  const [autoResponse,   setAutoResponse]   = useState(initialAutoResponse)
  const [budgetMin,      setBudgetMin]      = useState(initialBudgetMin)
  const [activeHours,    setActiveHours]    = useState(initialActiveHours)
  const [promptSaving,   setPromptSaving]   = useState(false)
  const [promptSaved,    setPromptSaved]    = useState(false)
  const [behaviorSaving, setBehaviorSaving] = useState(false)
  const [behaviorSaved,  setBehaviorSaved]  = useState(false)

  async function savePrompt() {
    setPromptSaving(true)
    await fetch('/api/chatbot', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt }),
    })
    setPromptSaving(false); setPromptSaved(true)
    setTimeout(() => setPromptSaved(false), 2000)
  }

  async function saveBehavior() {
    setBehaviorSaving(true)
    await fetch('/api/chatbot', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoResponse, budgetMin, activeHours }),
    })
    setBehaviorSaving(false); setBehaviorSaved(true)
    setTimeout(() => setBehaviorSaved(false), 2000)
  }

  return (
    <div className="space-y-4">

      {/* ── Bot GHL natif ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#EEF0EB] flex items-center justify-center flex-shrink-0">
            <MessageSquare size={16} className="text-[#3462EE]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#111111] font-semibold text-sm">Chatbot natif GHL</p>
            <p className="text-[#9CA3AF] text-xs mt-0.5">Détails non disponibles — ouvrir dans GHL pour voir les règles.</p>
          </div>
          <a
            href="https://app.gohighlevel.com/conversations-settings"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#3462EE] hover:underline flex-shrink-0"
          >
            Ouvrir dans GHL <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* ── Kai — Réponses IA ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-[#3462EE] flex items-center justify-center flex-shrink-0">
            <Bot size={12} className="text-white" />
          </div>
          <h2 className="text-[#111111] font-semibold text-sm">Kai · Réponses IA</h2>
        </div>
        <p className="text-[#6B7280] text-xs mb-4 ml-8">
          Kai lit l'historique du chat et prend le relais fluidement quand le bot GHL atteint ses limites.
        </p>

        <textarea
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          rows={10}
          className="w-full font-mono text-sm text-[#111111] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE] transition-colors"
          placeholder="Prompt système de Kai pour les cas complexes..."
        />
        <div className="flex items-center justify-end gap-3 mt-3">
          {promptSaved && <span className="text-[#14B8A6] text-sm font-medium">Sauvegardé !</span>}
          <button onClick={savePrompt} disabled={promptSaving}
            className="flex items-center gap-2 bg-[#111111] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#333] disabled:opacity-50 transition-colors">
            <Save size={13} />
            {promptSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* ── Comportement ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-[#111111] font-semibold text-sm mb-4">Comportement de Kai</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#111111] text-sm font-medium">Réponses Kai activées</p>
              <p className="text-[#6B7280] text-xs mt-0.5">
                {autoResponse ? 'Kai prend le relais automatiquement' : 'Réponses IA désactivées'}
              </p>
            </div>
            <button onClick={() => setAutoResponse(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${autoResponse ? 'bg-[#3462EE]' : 'bg-[#D1D5DB]'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${autoResponse ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div>
            <label className="block text-[#111111] text-sm font-medium mb-1.5">Budget minimum qualifié (€)</label>
            <input type="number" value={budgetMin} onChange={e => setBudgetMin(Number(e.target.value))}
              min={0} step={500}
              className="w-48 text-sm text-[#111111] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE]" />
          </div>

          <div>
            <label className="block text-[#111111] text-sm font-medium mb-1.5">Heures actives</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] text-xs">De</span>
                <input type="time" value={activeHours.start} onChange={e => setActiveHours(h => ({ ...h, start: e.target.value }))}
                  className="text-sm text-[#111111] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] text-xs">à</span>
                <input type="time" value={activeHours.end} onChange={e => setActiveHours(h => ({ ...h, end: e.target.value }))}
                  className="text-sm text-[#111111] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-5">
          {behaviorSaved && <span className="text-[#14B8A6] text-sm font-medium">Sauvegardé !</span>}
          <button onClick={saveBehavior} disabled={behaviorSaving}
            className="flex items-center gap-2 bg-[#111111] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#333] disabled:opacity-50 transition-colors">
            <Save size={13} />
            {behaviorSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Onglet Réception Vapi ────────────────────────────────────────────────────

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended'
type TranscriptLine = { role: 'user' | 'assistant'; text: string }

function ReceptionTab() {
  const [vapiKey,     setVapiKey]     = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [configSaved, setConfigSaved] = useState(false)
  const [callStatus,  setCallStatus]  = useState<CallStatus>('idle')
  const [isSpeaking,  setIsSpeaking]  = useState(false)
  const [transcript,  setTranscript]  = useState<TranscriptLine[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef        = useRef<any>(null)
  const transcriptRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVapiKey(localStorage.getItem('vapi_key') ?? '')
    setAssistantId(localStorage.getItem('vapi_assistant_id') ?? '')
  }, [])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript])

  function saveConfig() {
    localStorage.setItem('vapi_key',          vapiKey)
    localStorage.setItem('vapi_assistant_id', assistantId)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
  }

  async function startCall() {
    if (!vapiKey || !assistantId) return
    setCallStatus('connecting')
    setTranscript([])

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Vapi = (await import('@vapi-ai/web')).default
    const vapi = new Vapi(vapiKey)
    vapiRef.current = vapi

    vapi.on('call-start',  () => setCallStatus('active'))
    vapi.on('call-end',    () => { setCallStatus('ended'); vapiRef.current = null; setIsSpeaking(false) })
    vapi.on('speech-start',() => setIsSpeaking(true))
    vapi.on('speech-end',  () => setIsSpeaking(false))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on('message', (msg: any) => {
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        setTranscript(prev => [...prev, { role: msg.role as 'user' | 'assistant', text: msg.transcript }])
      }
    })
    vapi.on('error', () => { setCallStatus('idle'); vapiRef.current = null })

    await vapi.start(assistantId)
  }

  function stopCall() {
    vapiRef.current?.stop()
  }

  const isConfigured = vapiKey.trim().length > 0 && assistantId.trim().length > 0
  const isActive     = callStatus === 'active'
  const isConnecting = callStatus === 'connecting'

  return (
    <div className="space-y-4">

      {/* ── Status header ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
             style={{ background: isActive ? '#22c55e18' : '#F43F5E18' }}>
          <Phone size={18} style={{ color: isActive ? '#22c55e' : '#F43F5E' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[13px] font-bold text-[#111]">Réception IA — Vapi</p>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={isActive
                    ? { background: '#22c55e18', color: '#16a34a' }
                    : isConfigured
                      ? { background: '#3462EE18', color: '#3462EE' }
                      : { background: '#FEF9C3', color: '#854D0E' }
                  }>
              {isActive ? 'En appel' : isConnecting ? 'Connexion…' : isConfigured ? 'Configuré' : 'À configurer'}
            </span>
          </div>
          <p className="text-[11px] text-[#9CA3AF]">
            Agent vocal IA qui gère les appels entrants 24/7 — qualification, prise de RDV, FAQ.
          </p>
        </div>
      </div>

      {/* ── Fonctionnalités ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Mic,       color: '#F43F5E', label: 'Appels entrants', desc: 'Répond 24/7 à tous les appels' },
          { icon: Clock,     color: '#8B5CF6', label: 'Prise de RDV',    desc: 'Réserve dans ton agenda en direct' },
          { icon: Settings2, color: '#3462EE', label: 'Qualification',   desc: 'Chaud / tiède / froid automatique' },
        ].map(({ icon: Icon, color, label, desc }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                 style={{ background: color + '15' }}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-[12px] font-bold text-[#111] mb-0.5">{label}</p>
            <p className="text-[11px] text-[#9CA3AF] leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Configuration ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={13} className="text-[#9CA3AF]" />
          <p className="text-[11px] font-bold text-[#C4C9D4] uppercase tracking-widest">Configuration Vapi</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Clé publique Vapi</label>
            <input
              type="password"
              value={vapiKey}
              onChange={e => setVapiKey(e.target.value)}
              placeholder="Votre clé publique Vapi"
              className="w-full text-[12px] bg-[#F9F9F7] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">ID de l'assistant</label>
            <input
              type="text"
              value={assistantId}
              onChange={e => setAssistantId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full text-[12px] bg-[#F9F9F7] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Numéro de téléphone</label>
            <input
              type="text"
              placeholder="+33 • • • • • • • • •"
              disabled
              className="w-full text-[12px] bg-[#F9F9F7] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#9CA3AF] cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4">
          {configSaved && <span className="text-[12px] font-medium text-[#22c55e]">Sauvegardé !</span>}
          <button
            onClick={saveConfig}
            className="flex items-center gap-1.5 bg-[#111111] text-white px-4 py-2 rounded-full text-[12px] font-medium hover:bg-[#333] transition-colors"
          >
            <Save size={12} />
            Sauvegarder
          </button>
        </div>
      </div>

      {/* ── Test en direct ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-[11px] font-bold text-[#C4C9D4] uppercase tracking-widest mb-4">Test en direct</p>

        {/* Call controls */}
        <div className="flex items-center gap-3 mb-4">
          {!isActive && !isConnecting ? (
            <button
              onClick={() => void startCall()}
              disabled={!isConfigured || callStatus === 'ended'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#22c55e18', color: '#16a34a' }}
            >
              <PhoneCall size={14} />
              {callStatus === 'ended' ? 'Appel terminé' : 'Démarrer le test'}
            </button>
          ) : (
            <button
              onClick={stopCall}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold transition-all animate-pulse"
              style={{ background: '#F43F5E18', color: '#F43F5E' }}
            >
              <PhoneOff size={14} />
              {isConnecting ? 'Connexion…' : 'Raccrocher'}
            </button>
          )}

          {callStatus === 'ended' && (
            <button
              onClick={() => { setCallStatus('idle'); setTranscript([]) }}
              className="text-[11px] font-medium text-[#3462EE] hover:underline"
            >
              Nouveau test
            </button>
          )}

          {isActive && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Volume2 size={12} style={{ color: isSpeaking ? '#22c55e' : '#D1D5DB' }} />
              <span className="text-[11px] font-medium" style={{ color: isSpeaking ? '#16a34a' : '#9CA3AF' }}>
                {isSpeaking ? 'Agent parle…' : 'En écoute'}
              </span>
              <div className="flex gap-0.5 ml-1">
                {[1,2,3].map(i => (
                  <div key={i} className="w-0.5 rounded-full transition-all duration-150"
                       style={{
                         height: isSpeaking ? `${8 + i * 4}px` : '4px',
                         background: isSpeaking ? '#22c55e' : '#D1D5DB',
                       }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transcript */}
        {(transcript.length > 0 || isActive) && (
          <div
            ref={transcriptRef}
            className="rounded-xl border border-[#F0F0EE] bg-[#F9F9F7] p-3 space-y-2 max-h-64 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
          >
            {transcript.length === 0 && isActive && (
              <p className="text-[11px] text-[#C4C9D4] italic text-center py-4">En attente des premiers mots…</p>
            )}
            {transcript.map((line, i) => (
              <div key={i} className={`flex gap-2 ${line.role === 'assistant' ? '' : 'justify-end'}`}>
                {line.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-full bg-[#3462EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mic size={9} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-[11px] leading-snug ${
                  line.role === 'assistant'
                    ? 'bg-white border border-[#E5E7EB] text-[#374151] rounded-tl-md'
                    : 'text-white rounded-tr-md'
                }`}
                style={line.role === 'user' ? { background: 'linear-gradient(135deg, #1a2b4a 0%, #2d4a7a 100%)' } : undefined}>
                  {line.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isConfigured && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FEF9C3] border border-[#FDE68A]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] flex-shrink-0" />
            <p className="text-[11px] text-[#92400E]">Renseigne la clé publique Vapi et l'ID de l'assistant pour activer le test.</p>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Onglet N8N ───────────────────────────────────────────────────────────────

function N8NTab() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-[#EEF0EB] flex items-center justify-center mb-4">
          <Workflow size={28} className="text-[#3462EE]" strokeWidth={1.5} />
        </div>
        <h2 className="text-[#111111] font-bold text-lg mb-2">Workflows N8N</h2>
        <p className="text-[#6B7280] text-sm max-w-sm leading-relaxed">
          Les workflows N8N permettront d'orchestrer les automatisations IA avancées qui n'existent pas dans GHL nativement — qualification de leads complexe, génération de devis automatique, rapports hebdomadaires.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-left w-full max-w-xs">
          {[
            'Qualification lead → Kai → Supabase',
            'Nouveau contact → Analyse → Assignation agent',
            'Relance hebdo → Rapport → Telegram',
          ].map(item => (
            <div key={item} className="flex items-center gap-2.5 text-sm text-[#6B7280]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3462EE] flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-[#9CA3AF]">À configurer — connexion N8N en cours</p>
      </div>
    </div>
  )
}

// ─── Onglet Formulaires GHL ───────────────────────────────────────────────────

function GHLFormsTab() {
  const steps = [
    {
      num: '01',
      title: 'Créer le formulaire dans GHL',
      desc: 'Va dans Funnels → Forms → New Form. Ajoute les champs : Prénom, Téléphone, Type de travaux, Budget estimé.',
    },
    {
      num: '02',
      title: 'Connecter à un workflow GHL',
      desc: 'Dans le workflow, ajoute le trigger "Form Submitted" et sélectionne ton formulaire. GHL crée le contact automatiquement et déclenche la qualification.',
    },
    {
      num: '03',
      title: 'Intégrer sur la landing Meta Ads',
      desc: 'Copie le lien public GHL du formulaire et colle-le comme URL de destination dans ta campagne Meta Ads — ou utilise l\'iframe embed sur ta landing page.',
    },
    {
      num: '04',
      title: 'Le lead arrive dans Soren',
      desc: 'Dès soumission, le contact apparaît dans Pipeline et Contacts. Le chatbot qualif se déclenche automatiquement via SMS/WhatsApp.',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[#111111] font-bold text-[15px] mb-1">Formulaires GHL</h2>
          <p className="text-[#6B7280] text-[13px] leading-relaxed max-w-lg">
            Les formulaires GHL sont la porte d'entrée de tes leads Meta Ads. Un formulaire soumis crée un contact dans GHL et déclenche automatiquement le workflow de qualification.
          </p>
        </div>
        <a
          href="https://app.gohighlevel.com/funnels-websites"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-[#EEF0EB] text-[#111111] font-medium px-3 py-2 rounded-xl hover:bg-[#e4e6e1] transition-colors"
        >
          Gérer dans GHL <ExternalLink size={11} />
        </a>
      </div>

      {/* Flow */}
      <div className="grid grid-cols-2 gap-3">
        {steps.map(step => (
          <div key={step.num} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-bold text-[#E2FF8D] bg-[#111111] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                {step.num}
              </span>
              <p className="text-[#111111] font-semibold text-[13px]">{step.title}</p>
            </div>
            <p className="text-[#6B7280] text-[12px] leading-relaxed pl-9">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Schéma flux */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-[#111111] font-semibold text-[13px] mb-4">Flux complet</p>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Meta Ads', color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { label: '→', color: 'text-[#9CA3AF]' },
            { label: 'Formulaire GHL', color: 'bg-[#EEF0EB] text-[#111111] border-[#DDE0D8]' },
            { label: '→', color: 'text-[#9CA3AF]' },
            { label: 'Contact créé', color: 'bg-[#EEF0EB] text-[#111111] border-[#DDE0D8]' },
            { label: '→', color: 'text-[#9CA3AF]' },
            { label: 'Workflow déclenché', color: 'bg-[#EEF0EB] text-[#111111] border-[#DDE0D8]' },
            { label: '→', color: 'text-[#9CA3AF]' },
            { label: 'Chatbot SMS/WA', color: 'bg-green-50 text-green-700 border-green-100' },
            { label: '→', color: 'text-[#9CA3AF]' },
            { label: 'RDV qualifié', color: 'bg-[#111111] text-[#E2FF8D] border-transparent' },
          ].map((item, i) =>
            item.label === '→'
              ? <span key={i} className={`text-sm font-bold ${item.color}`}>{item.label}</span>
              : <span key={i} className={`text-[11px] font-medium border px-3 py-1.5 rounded-xl ${item.color}`}>{item.label}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Vue principale ───────────────────────────────────────────────────────────

export default function WorkflowsView({ workflows, escalade }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('ghl-chatbot')

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'ghl-chatbot',   label: 'Chatbot',        icon: MessageSquare },
    { id: 'reception',     label: 'Réception',      icon: Phone },
    { id: 'ghl-workflows', label: 'Workflows GHL',  icon: Zap },
    { id: 'n8n',           label: 'Workflows N8N',  icon: Workflow },
    { id: 'ghl-forms',     label: 'Formulaires',    icon: MessageSquare },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111111]">Automatisation</h1>
        <p className="text-[#6B7280] text-sm mt-1">Chatbot GHL, workflows natifs et orchestration N8N</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm w-fit mb-6">
        {tabs.map(tab => {
          const Icon   = tab.icon
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-[#111111] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111111]'
              }`}>
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'ghl-chatbot'   && <GHLChatbotTab {...escalade} />}
      {activeTab === 'reception'     && <ReceptionTab />}
      {activeTab === 'ghl-workflows' && <GHLWorkflowsTab workflows={workflows} />}
      {activeTab === 'n8n'           && <N8NTab />}
      {activeTab === 'ghl-forms'     && <GHLFormsTab />}
    </div>
  )
}

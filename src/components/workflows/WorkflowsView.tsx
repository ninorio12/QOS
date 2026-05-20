'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, Bot, Workflow, ExternalLink, Save, MessageSquare, ChevronDown, Phone, Mic, Clock, Settings2, PhoneCall, KeyRound, User, PhoneCall as PhoneIcon, Mail, AlignLeft, Type } from 'lucide-react'
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
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-soren-muted">Brouillon</span>
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

// ─── Catalogue statique GHL (dossiers + descriptions) ────────────────────────

const FOLDER_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  ACQUISITION:  { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  GLOBAL:       { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  RÉACTIVATION: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  RÉCEPTION:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
}

const WORKFLOW_CATALOG = [
  {
    folder: 'ACQUISITION',
    description: 'Capture et qualification des leads entrants depuis Meta Ads.',
    workflows: [
      { name: 'AQU 1 - nouveaux leads Meta',            description: 'Intègre automatiquement les nouveaux leads générés par les publicités Meta dans le CRM.' },
      { name: 'WF-ACQUIZ : Lead en conversation',        description: 'Engage le lead dès qu\'une conversation est initiée — envoi du premier message IA.' },
      { name: 'WF-ACQUIZ-01 : Premier Contact Lead Meta',description: 'Premier contact automatique envoyé dans les minutes suivant la soumission du formulaire Meta.' },
      { name: 'WF-ACQUIZ-02 : Lead qualifié',            description: 'Séquence déclenchée quand l\'IA marque le lead comme qualifié — passage en pipeline actif.' },
      { name: 'WF-ACQUIZ-03 : Lead non qualifié',        description: 'Gestion des leads hors cible — archivage automatique et relance programmée à 30 jours.' },
      { name: 'WF-ACQUIZ-04 : Confirmation & Rappels RDV',description: 'Envoie la confirmation de RDV et les rappels automatiques (J-1 et H-2) avant le rendez-vous.' },
    ],
  },
  {
    folder: 'GLOBAL',
    description: 'Workflows transversaux partagés entre tous les modules.',
    workflows: [
      { name: 'Historique conversation IA',              description: 'Enregistre et centralise l\'historique complet des conversations IA dans la fiche contact GHL.' },
      { name: 'WF-GLOBAL-01 : Transfert Acquiz → Réactivation', description: 'Transfère automatiquement les leads non convertis après 30 jours vers la séquence de réactivation.' },
    ],
  },
  {
    folder: 'RÉACTIVATION',
    description: 'Réengagement des contacts dormants et anciens leads non convertis.',
    workflows: [
      { name: 'WF-REACTIV-01 : Séquence de Réactivation',description: 'Séquence multicanale SMS/Email/WhatsApp sur 21 jours pour réengager les contacts dormants.' },
      { name: 'WF-REACT-02 : Confirmation & Rappels RDV', description: 'Confirmation et rappels automatiques pour les RDV obtenus via la réactivation.' },
      { name: 'WF-REACT-03 : Lead re-qualifié',           description: 'Déclenché quand un contact réactivé redevient qualifié — reprise du pipeline principal.' },
    ],
  },
  {
    folder: 'RÉCEPTION',
    description: 'Traitement intelligent des messages et appels entrants 24/7.',
    workflows: [
      { name: 'Notification : conseiller demandé',        description: 'Alerte l\'équipe en temps réel quand un client demande explicitement à parler à un conseiller humain.' },
      { name: 'WF-RECEPT-01 : Traitement Message Entrant',description: 'Analyse et classe chaque message entrant — routing vers le bon workflow selon le contenu.' },
      { name: 'WF-RECEPT-02 : IA statut qualifié',        description: 'L\'IA détecte les signaux de qualification dans les messages et met à jour le statut CRM.' },
      { name: 'WF-RECEPT-03 : IA transfere à un humain',  description: 'Transfère la conversation à un agent humain quand l\'IA détecte un cas complexe ou une demande spécifique.' },
      { name: 'WF-RECEPT-04 : Spam détecté',              description: 'Filtre et archive automatiquement les messages spam ou hors sujet détectés par l\'IA.' },
      { name: 'WF-RECEPT-05 : Confirmation & Rappels RDV',description: 'Gestion des confirmations et rappels pour les RDV pris directement via la réception IA.' },
    ],
  },
]

// ─── Onglet Workflows GHL ─────────────────────────────────────────────────────

function GHLWorkflowsTab({ workflows }: { workflows: GHLWorkflow[] }) {
  const [expandedFolder, setExpandedFolder] = useState<string | null>('ACQUISITION')
  const [expandedWf,     setExpandedWf]     = useState<string | null>(null)

  // Enrichit le catalogue avec le statut live de l'API si disponible
  function liveStatus(name: string): 'published' | 'draft' {
    const match = workflows.find(w => w.name.trim() === name.trim())
    return match?.status ?? 'published'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-soren-muted">Automatisations configurées dans GoHighLevel — {WORKFLOW_CATALOG.reduce((a, f) => a + f.workflows.length, 0)} workflows · 4 dossiers</p>
        <a
          href="https://app.gohighlevel.com/automations"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#3462EE] hover:underline"
        >
          Gérer dans GHL <ExternalLink size={11} />
        </a>
      </div>

      <div className="grid gap-3">
        {WORKFLOW_CATALOG.map(folder => {
          const colors     = FOLDER_COLORS[folder.folder] ?? FOLDER_COLORS['GLOBAL']
          const isFolderOpen = expandedFolder === folder.folder

          return (
            <div key={folder.folder} className="bg-soren-card rounded-2xl shadow-sm overflow-hidden">
              {/* Folder header */}
              <button
                className="w-full px-5 py-3.5 flex items-center gap-3 text-left"
                onClick={() => { setExpandedFolder(isFolderOpen ? null : folder.folder); setExpandedWf(null) }}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                  <Zap size={14} className={colors.text} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-soren-text font-black text-sm">{folder.folder}</p>
                  <p className="text-soren-subtle text-xs mt-0.5">{folder.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {folder.workflows.length} workflows
                  </span>
                  <ChevronDown size={14} className={`text-soren-muted transition-transform ${isFolderOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Workflows list */}
              {isFolderOpen && (
                <div className="border-t border-[#F3F4F6]">
                  {folder.workflows.map((wf, idx) => {
                    const key    = `${folder.folder}-${idx}`
                    const isOpen = expandedWf === key
                    const status = liveStatus(wf.name)

                    return (
                      <div key={key} className={idx > 0 ? 'border-t border-[#F9FAFB]' : ''}>
                        <button
                          className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-[#FAFAFA] transition-colors"
                          onClick={() => setExpandedWf(isOpen ? null : key)}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-soren-text font-medium text-xs">{wf.name}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={status} />
                            <ChevronDown size={12} className={`text-soren-subtle transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-3 pt-1 bg-[#FAFAFA] border-t border-[#F3F4F6]">
                            <p className="text-xs text-[#4B5563] leading-relaxed">{wf.description}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
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
      <div className="bg-soren-card rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-soren-app flex items-center justify-center flex-shrink-0">
            <MessageSquare size={16} className="text-[#3462EE]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-soren-text font-semibold text-sm">Chatbot natif GHL</p>
            <p className="text-soren-subtle text-xs mt-0.5">Détails non disponibles — ouvrir dans GHL pour voir les règles.</p>
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
      <div className="bg-soren-card rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-[#3462EE] flex items-center justify-center flex-shrink-0">
            <Bot size={12} className="text-white" />
          </div>
          <h2 className="text-soren-text font-semibold text-sm">Kai · Réponses IA</h2>
        </div>
        <p className="text-soren-muted text-xs mb-4 ml-8">
          Kai lit l'historique du chat et prend le relais fluidement quand le bot GHL atteint ses limites.
        </p>

        <textarea
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          rows={10}
          className="w-full font-mono text-sm text-soren-text bg-[#F9FAFB] border border-soren-border rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE] transition-colors"
          placeholder="Prompt système de Kai pour les cas complexes..."
        />
        <div className="flex items-center justify-end gap-3 mt-3">
          {promptSaved && <span className="text-[#14B8A6] text-sm font-medium">Sauvegardé !</span>}
          <button onClick={savePrompt} disabled={promptSaving}
            className="flex items-center gap-2 bg-soren-sidebar text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#333] disabled:opacity-50 transition-colors">
            <Save size={13} />
            {promptSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* ── Comportement ── */}
      <div className="bg-soren-card rounded-2xl p-5 shadow-sm">
        <h2 className="text-soren-text font-semibold text-sm mb-4">Comportement de Kai</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-soren-text text-sm font-medium">Réponses Kai activées</p>
              <p className="text-soren-muted text-xs mt-0.5">
                {autoResponse ? 'Kai prend le relais automatiquement' : 'Réponses IA désactivées'}
              </p>
            </div>
            <button onClick={() => setAutoResponse(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${autoResponse ? 'bg-[#3462EE]' : 'bg-[#D1D5DB]'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-soren-card rounded-full shadow transition-transform duration-200 ${autoResponse ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div>
            <label className="block text-soren-text text-sm font-medium mb-1.5">Budget minimum qualifié (€)</label>
            <input type="number" value={budgetMin} onChange={e => setBudgetMin(Number(e.target.value))}
              min={0} step={500}
              className="w-48 text-sm text-soren-text bg-[#F9FAFB] border border-soren-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE]" />
          </div>

          <div>
            <label className="block text-soren-text text-sm font-medium mb-1.5">Heures actives</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-soren-muted text-xs">De</span>
                <input type="time" value={activeHours.start} onChange={e => setActiveHours(h => ({ ...h, start: e.target.value }))}
                  className="text-sm text-soren-text bg-[#F9FAFB] border border-soren-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-soren-muted text-xs">à</span>
                <input type="time" value={activeHours.end} onChange={e => setActiveHours(h => ({ ...h, end: e.target.value }))}
                  className="text-sm text-soren-text bg-[#F9FAFB] border border-soren-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-5">
          {behaviorSaved && <span className="text-[#14B8A6] text-sm font-medium">Sauvegardé !</span>}
          <button onClick={saveBehavior} disabled={behaviorSaving}
            className="flex items-center gap-2 bg-soren-sidebar text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#333] disabled:opacity-50 transition-colors">
            <Save size={13} />
            {behaviorSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Onglet Réception ElevenLabs ─────────────────────────────────────────────

const ELEVENLABS_DEFAULT = 'https://elevenlabs.io/app/agents/agents/agent_0901kp3xq8mnej4b6ge20gqs2xgc/preview?branchId=agtbrch_1301kp3xq9qzfscvafw64zk2dtkf&include_draft=true'

function ReceptionTab() {
  const [shareLink,   setShareLink]   = useState(ELEVENLABS_DEFAULT)
  const [linkSaved,   setLinkSaved]   = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [showConfig,  setShowConfig]  = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('elevenlabs_share_link')
    if (saved) setShareLink(saved)
  }, [])

  function saveLink() {
    localStorage.setItem('elevenlabs_share_link', shareLink)
    setLinkSaved(true)
    setTimeout(() => setLinkSaved(false), 2000)
    setShowConfig(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasLink = shareLink.trim().length > 0

  return (
    <div className="space-y-4">

      {/* ── Hero card ── */}
      <div className="bg-soren-card rounded-3xl overflow-hidden shadow-sm">

        {/* Agent header */}
        <div className="px-6 pt-6 pb-5 flex items-center gap-4 border-b border-[#F0F0EE]">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-[15px] flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)' }}>
            L
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[#111]">Lucie — Réceptionniste IA</p>
            <p className="text-[11px] text-soren-subtle">Qualification · Prise de RDV · FAQ 24/7</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={hasLink
                  ? { background: '#FF4D00', color: '#111' }
                  : { background: '#F3F4F6', color: '#9CA3AF' }}>
            {hasLink ? 'Prêt' : 'À configurer'}
          </span>
        </div>

        {/* CTA zone */}
        <div className="px-6 py-8 flex flex-col items-center gap-5"
             style={{ background: 'linear-gradient(180deg, #FAFAF8 0%, #F4F4F0 100%)' }}>

          {hasLink ? (
            <>
              {/* URL display */}
              <div className="w-full flex items-center gap-2 bg-soren-card border border-soren-border rounded-2xl px-4 py-3">
                <Phone size={13} className="text-soren-subtle flex-shrink-0" />
                <p className="flex-1 text-[11px] text-[#374151] font-mono truncate">{shareLink}</p>
                <button
                  onClick={copyLink}
                  className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all"
                  style={copied
                    ? { background: '#22c55e18', color: '#16a34a' }
                    : { background: '#F3F4F6', color: '#6B7280' }}
                >
                  {copied ? 'Copié !' : 'Copier'}
                </button>
              </div>

              {/* Open button */}
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-3.5 rounded-full text-[13px] font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
              >
                <PhoneCall size={15} />
                Tester Lucie
                <ExternalLink size={11} className="opacity-70" />
              </a>

              <p className="text-[10px] text-[#C4C9D4] text-center">
                S&apos;ouvre dans un nouvel onglet · Aucune installation requise
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed border-soren-border">
                <Phone size={20} className="text-[#D1D5DB]" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#374151] mb-1">Aucun lien de test configuré</p>
                <p className="text-[11px] text-soren-subtle">Ajoute le lien de partage ElevenLabs de ton assistant.</p>
              </div>
              <button
                onClick={() => setShowConfig(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold bg-[#111] text-white hover:bg-[#333] transition-colors"
              >
                <Settings2 size={13} />
                Configurer le lien
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Fonctionnalités ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Mic,       color: '#3462EE', label: 'Appels entrants', desc: 'Répond 24/7 à tous les appels' },
          { icon: Clock,     color: '#8B5CF6', label: 'Prise de RDV',    desc: 'Réserve dans ton agenda en direct' },
          { icon: Settings2, color: '#F43F5E', label: 'Qualification',   desc: 'Chaud / tiède / froid automatique' },
        ].map(({ icon: Icon, color, label, desc }) => (
          <div key={label} className="bg-soren-card rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                 style={{ background: color + '15' }}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-[12px] font-bold text-[#111] mb-0.5">{label}</p>
            <p className="text-[11px] text-soren-subtle leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Paramètres (collapsible) ── */}
      <div className="bg-soren-card rounded-3xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowConfig(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAF8] transition-colors"
        >
          <div className="flex items-center gap-2">
            <KeyRound size={13} className="text-soren-subtle" />
            <p className="text-[11px] font-bold text-soren-subtle uppercase tracking-widest">Lien de partage ElevenLabs</p>
            {hasLink && <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />}
          </div>
          <ChevronDown size={14} className="text-[#C4C9D4] transition-transform"
                       style={{ transform: showConfig ? 'rotate(180deg)' : 'none' }} />
        </button>

        {showConfig && (
          <div className="px-5 pb-5 border-t border-[#F0F0EE] pt-4 space-y-3">
            <p className="text-[11px] text-soren-subtle">
              Dans le dashboard ElevenLabs → ton agente → bouton <strong>Preview</strong> → copie le lien ici.
            </p>
            <input
              type="url"
              value={shareLink}
              onChange={e => setShareLink(e.target.value)}
              placeholder="https://elevenlabs.io/app/agents/…"
              className="w-full text-[12px] bg-[#F9F9F7] border border-soren-border rounded-xl px-3 py-2.5 text-[#111] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE]"
            />
            <div className="flex items-center justify-end gap-3">
              {linkSaved && <span className="text-[11px] font-medium text-[#22c55e]">Sauvegardé</span>}
              <button
                onClick={saveLink}
                disabled={!shareLink.trim()}
                className="flex items-center gap-1.5 bg-[#111] text-white px-4 py-2 rounded-full text-[11px] font-medium hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={11} />
                Sauvegarder
              </button>
            </div>
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
      <div className="bg-soren-card rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-soren-app flex items-center justify-center mb-4">
          <Workflow size={28} className="text-[#3462EE]" strokeWidth={1.5} />
        </div>
        <h2 className="text-soren-text font-bold text-lg mb-2">Workflows N8N</h2>
        <p className="text-soren-muted text-sm max-w-sm leading-relaxed">
          Les workflows N8N permettront d'orchestrer les automatisations IA avancées qui n'existent pas dans GHL nativement — qualification de leads complexe, génération de devis automatique, rapports hebdomadaires.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-left w-full max-w-xs">
          {[
            'Qualification lead → Kai → Supabase',
            'Nouveau contact → Analyse → Assignation agent',
            'Relance hebdo → Rapport → Telegram',
          ].map(item => (
            <div key={item} className="flex items-center gap-2.5 text-sm text-soren-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3462EE] flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-soren-subtle">À configurer — connexion N8N en cours</p>
      </div>
    </div>
  )
}

// ─── Onglet Formulaires GHL ───────────────────────────────────────────────────

interface FormField {
  key: string; label: string; type: string
  enabled: boolean; required: boolean; locked: boolean
}

const DEFAULT_FIELDS: FormField[] = [
  { key: 'firstName', label: 'Prénom',    type: 'text',     enabled: true,  required: true,  locked: true  },
  { key: 'lastName',  label: 'Nom',       type: 'text',     enabled: true,  required: false, locked: false },
  { key: 'phone',     label: 'Téléphone', type: 'tel',      enabled: true,  required: true,  locked: true  },
  { key: 'email',     label: 'Email',     type: 'email',    enabled: true,  required: false, locked: false },
  { key: 'message',   label: 'Message',   type: 'textarea', enabled: false, required: false, locked: false },
]

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-soren-sidebar' : 'bg-[#E5E7EB]'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-soren-card rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

function GHLFormsTab() {
  const [origin,    setOrigin]    = useState('')
  const [fields,    setFields]    = useState<FormField[]>(DEFAULT_FIELDS)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [preview,   setPreview]   = useState<'formulaire' | 'merci'>('formulaire')

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
    fetch('/api/settings/form-fields-get')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.fields) setFields(data.fields) })
      .catch(() => {})

    // Rafraîchit l'iframe quand les paramètres entreprise sont sauvegardés
    const onSettingsUpdated = () => setIframeKey(k => k + 1)
    window.addEventListener('company-settings-updated', onSettingsUpdated)
    return () => window.removeEventListener('company-settings-updated', onSettingsUpdated)
  }, [])

  // Auto-save + refresh iframe dès qu'un champ change (debounce 600ms)
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      await fetch('/api/settings/form-fields', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      setIframeKey(k => k + 1)
    }, 600)
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current) }
  }, [fields])

  function toggleEnabled(key: string) {
    setFields(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f))
  }

  function toggleRequired(key: string) {
    setFields(prev => prev.map(f => f.key === key ? { ...f, required: !f.required } : f))
  }

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/settings/form-fields', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      setSaved(true)
      setIframeKey(k => k + 1)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-[1fr_300px] gap-4 flex-1 min-h-0">

        {/* Préview iframe */}
        <div className="bg-soren-card rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#F5F5F3] border-b border-[#EBEBEB]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            {/* Toggle formulaire / merci */}
            <div className="flex bg-soren-card border border-soren-border rounded-lg overflow-hidden mx-2">
              {(['formulaire', 'merci'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPreview(p)}
                  className={`text-[11px] px-3 py-1 transition-colors font-medium ${
                    preview === p ? 'bg-soren-sidebar text-[#FF4D00]' : 'text-soren-subtle hover:text-soren-text'
                  }`}
                >
                  {p === 'formulaire' ? 'Formulaire' : 'Merci'}
                </button>
              ))}
            </div>
            <div className="flex-1 bg-soren-card rounded-lg px-3 py-1 text-[11px] text-soren-subtle truncate border border-[#E5E5E5]">
              {origin}/{preview === 'merci' ? 'formulaire/merci' : 'formulaire'}
            </div>
            <a
              href={`/${preview === 'merci' ? 'formulaire/merci' : 'formulaire'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-soren-subtle hover:text-soren-text transition-colors flex-shrink-0"
            >
              <ExternalLink size={11} />
            </a>
          </div>
          <div className="relative flex-1 min-h-0">
            <iframe
              key={`${iframeKey}-${preview}`}
              src={preview === 'merci' ? '/formulaire/merci?prenom=Prénom' : '/formulaire'}
              className="absolute inset-0 w-full h-full border-0"
              style={{ transform: 'scale(0.72)', transformOrigin: 'top left', width: '139%', height: '139%' }}
              title="Aperçu"
            />
          </div>
        </div>

        {/* Sidebar config */}
        <div className="space-y-3 flex flex-col min-h-0 overflow-y-auto">
          {/* Lien public */}
          <div className="bg-soren-card rounded-2xl p-4 shadow-sm">
            <p className="text-soren-text font-semibold text-[12px] mb-2">Lien public</p>
            <div className="bg-[#F5F5F3] rounded-xl px-3 py-2 text-[11px] text-soren-muted break-all font-mono leading-relaxed">
              {origin || ''}/formulaire
            </div>
          </div>

          {/* Champs avec toggles */}
          <div className="bg-soren-card rounded-2xl p-4 shadow-sm">
            <p className="text-soren-text font-semibold text-[12px] mb-1">Champs du formulaire</p>
            <p className="text-soren-subtle text-[10px] mb-3">Active ou désactive les champs visibles par le client</p>
            <div className="space-y-1.5">
              {fields.map(f => {
                const fieldIcons: Record<string, React.ElementType> = {
                  firstName: User, lastName: User, phone: Phone, email: Mail, message: AlignLeft
                }
                const Icon = fieldIcons[f.key] ?? Type

                const statusColor = !f.enabled
                  ? { bg: '#F5F5F3', text: '#C4C9D4', dot: '#D1D5DB' }
                  : f.locked
                  ? { bg: 'var(--bg-app)', text: '#6B7280', dot: '#6B7280' }
                  : f.required
                  ? { bg: '#FFF1EC', text: '#EA580C', dot: '#EA580C' }
                  : { bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A' }

                const statusLabel = !f.enabled ? 'Désactivé'
                  : f.locked ? 'Toujours affiché'
                  : f.required ? 'Obligatoire'
                  : 'Optionnel'

                return (
                  <div
                    key={f.key}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      f.enabled ? 'border-[#EBEBEB] bg-soren-card' : 'border-transparent bg-[#F5F5F3] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Icône champ */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${f.enabled ? 'bg-[#F5F5F3]' : 'bg-[#EBEBEB]'}`}>
                        <Icon size={13} color={f.enabled ? '#111111' : '#C4C9D4'} />
                      </div>

                      <span className={`text-[12px] font-medium flex-1 ${f.enabled ? 'text-soren-text' : 'text-soren-subtle'}`}>
                        {f.label}
                      </span>

                      {/* Badge statut */}
                      {f.enabled && (
                        <button
                          onClick={() => !f.locked && toggleRequired(f.key)}
                          disabled={f.locked}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 transition-opacity"
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                          title={f.locked ? undefined : 'Cliquer pour changer'}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor.dot }} />
                          {statusLabel}
                        </button>
                      )}
                    </div>
                    <Toggle checked={f.enabled} onChange={() => toggleEnabled(f.key)} disabled={f.locked} />
                  </div>
                )
              })}
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full mt-3 py-2 rounded-xl text-[12px] font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#111111', color: '#FF4D00' }}
            >
              {saved ? '✓ Sauvegardé' : saving ? 'Sauvegarde…' : 'Appliquer'}
            </button>
          </div>
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
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4" style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}>
        <h1 className="text-2xl font-bold text-soren-text">Automatisation</h1>
        <p className="text-soren-muted text-sm mt-1">Chatbot GHL, workflows natifs et orchestration N8N</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-soren-card rounded-2xl p-1 shadow-sm w-fit mb-4" style={{ animation: 'fadeSlideUp 400ms ease-out 70ms both' }}>
        {tabs.map(tab => {
          const Icon   = tab.icon
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-soren-sidebar text-white shadow-sm' : 'text-soren-muted hover:text-soren-text'
              }`}>
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ animation: 'fadeSlideUp 400ms ease-out 140ms both' }}>
        {activeTab === 'ghl-chatbot'   && <GHLChatbotTab {...escalade} />}
        {activeTab === 'reception'     && <ReceptionTab />}
        {activeTab === 'ghl-workflows' && <GHLWorkflowsTab workflows={workflows} />}
        {activeTab === 'n8n'           && <N8NTab />}
        {activeTab === 'ghl-forms'     && <GHLFormsTab />}
      </div>
    </div>
  )
}

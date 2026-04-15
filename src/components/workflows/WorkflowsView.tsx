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

function ReceptionTab() {
  const [shareLink,   setShareLink]   = useState('')
  const [linkSaved,   setLinkSaved]   = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [showConfig,  setShowConfig]  = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setShareLink(localStorage.getItem('vapi_share_link') ?? process.env.NEXT_PUBLIC_VAPI_SHARE_URL ?? '')
  }, [])

  function saveLink() {
    localStorage.setItem('vapi_share_link', shareLink)
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
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm">

        {/* Agent header */}
        <div className="px-6 pt-6 pb-5 flex items-center gap-4 border-b border-[#F0F0EE]">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-[15px] flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #3462EE 0%, #6C8EFF 100%)' }}>
            K
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[#111]">Kai — Agent vocal BTP</p>
            <p className="text-[11px] text-[#9CA3AF]">Qualification · Prise de RDV · FAQ 24/7</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={hasLink
                  ? { background: '#E2FF8D', color: '#111' }
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
              <div className="w-full flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3">
                <Phone size={13} className="text-[#9CA3AF] flex-shrink-0" />
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
                Tester Kai
                <ExternalLink size={11} className="opacity-70" />
              </a>

              <p className="text-[10px] text-[#C4C9D4] text-center">
                S&apos;ouvre dans un nouvel onglet · Aucune installation requise
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed border-[#E5E7EB]">
                <Phone size={20} className="text-[#D1D5DB]" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#374151] mb-1">Aucun lien de test configuré</p>
                <p className="text-[11px] text-[#9CA3AF]">Ajoute le lien de partage Vapi de ton assistant.</p>
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

      {/* ── Paramètres (collapsible) ── */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowConfig(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAF8] transition-colors"
        >
          <div className="flex items-center gap-2">
            <KeyRound size={13} className="text-[#9CA3AF]" />
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Lien de partage Vapi</p>
            {hasLink && <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />}
          </div>
          <ChevronDown size={14} className="text-[#C4C9D4] transition-transform"
                       style={{ transform: showConfig ? 'rotate(180deg)' : 'none' }} />
        </button>

        {showConfig && (
          <div className="px-5 pb-5 border-t border-[#F0F0EE] pt-4 space-y-3">
            <p className="text-[11px] text-[#9CA3AF]">
              Dans le dashboard Vapi → ton assistant → bouton <strong>Share</strong> → copie le lien ici.
            </p>
            <input
              type="url"
              value={shareLink}
              onChange={e => setShareLink(e.target.value)}
              placeholder="https://vapi.ai/?demo=true&shareKey=…"
              className="w-full text-[12px] bg-[#F9F9F7] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111] focus:outline-none focus:ring-2 focus:ring-[#3462EE]/20 focus:border-[#3462EE]"
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
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#111111]' : 'bg-[#E5E7EB]'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
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

  useEffect(() => {
    setOrigin(window.location.origin)
    // Charge la config actuelle
    fetch('/api/settings/form-fields-get')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.fields) setFields(data.fields) })
      .catch(() => {})
  }, [])

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
      setIframeKey(k => k + 1) // refresh iframe
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-[1fr_300px] gap-4 flex-1 min-h-0">

        {/* Préview iframe */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#F5F5F3] border-b border-[#EBEBEB]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            {/* Toggle formulaire / merci */}
            <div className="flex bg-white border border-[#E5E7EB] rounded-lg overflow-hidden mx-2">
              {(['formulaire', 'merci'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPreview(p)}
                  className={`text-[11px] px-3 py-1 transition-colors font-medium ${
                    preview === p ? 'bg-[#111111] text-[#E2FF8D]' : 'text-[#9CA3AF] hover:text-[#111111]'
                  }`}
                >
                  {p === 'formulaire' ? 'Formulaire' : 'Merci'}
                </button>
              ))}
            </div>
            <div className="flex-1 bg-white rounded-lg px-3 py-1 text-[11px] text-[#9CA3AF] truncate border border-[#E5E5E5]">
              {origin}/{preview === 'merci' ? 'formulaire/merci' : 'formulaire'}
            </div>
            <a
              href={`/${preview === 'merci' ? 'formulaire/merci' : 'formulaire'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-[#9CA3AF] hover:text-[#111111] transition-colors flex-shrink-0"
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
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[#111111] font-semibold text-[12px] mb-2">Lien public</p>
            <div className="bg-[#F5F5F3] rounded-xl px-3 py-2 text-[11px] text-[#6B7280] break-all font-mono leading-relaxed">
              {origin || ''}/formulaire
            </div>
          </div>

          {/* Champs avec toggles */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[#111111] font-semibold text-[12px] mb-1">Champs du formulaire</p>
            <p className="text-[#9CA3AF] text-[10px] mb-3">Active ou désactive les champs visibles par le client</p>
            <div className="space-y-1.5">
              {fields.map(f => {
                const fieldIcons: Record<string, React.ElementType> = {
                  firstName: User, lastName: User, phone: Phone, email: Mail, message: AlignLeft
                }
                const Icon = fieldIcons[f.key] ?? Type

                const statusColor = !f.enabled
                  ? { bg: '#F5F5F3', text: '#C4C9D4', dot: '#D1D5DB' }
                  : f.locked
                  ? { bg: '#EEF0EB', text: '#6B7280', dot: '#6B7280' }
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
                      f.enabled ? 'border-[#EBEBEB] bg-white' : 'border-transparent bg-[#F5F5F3] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Icône champ */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${f.enabled ? 'bg-[#F5F5F3]' : 'bg-[#EBEBEB]'}`}>
                        <Icon size={13} color={f.enabled ? '#111111' : '#C4C9D4'} />
                      </div>

                      <span className={`text-[12px] font-medium flex-1 ${f.enabled ? 'text-[#111111]' : 'text-[#9CA3AF]'}`}>
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
              style={{ backgroundColor: '#111111', color: '#E2FF8D' }}
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
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#111111]">Automatisation</h1>
        <p className="text-[#6B7280] text-sm mt-1">Chatbot GHL, workflows natifs et orchestration N8N</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm w-fit mb-4">
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

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'ghl-chatbot'   && <GHLChatbotTab {...escalade} />}
        {activeTab === 'reception'     && <ReceptionTab />}
        {activeTab === 'ghl-workflows' && <GHLWorkflowsTab workflows={workflows} />}
        {activeTab === 'n8n'           && <N8NTab />}
        {activeTab === 'ghl-forms'     && <GHLFormsTab />}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Zap, Bot, Workflow, ExternalLink, Save, MessageSquare } from 'lucide-react'
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

type Tab = 'ghl-workflows' | 'ghl-chatbot' | 'n8n'

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

// ─── Onglet Workflows GHL ─────────────────────────────────────────────────────

function GHLWorkflowsTab({ workflows }: { workflows: GHLWorkflow[] }) {
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
          {workflows.map(wf => (
            <div key={wf.id} className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#EEF0EB] flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-[#3462EE]" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#111111] font-semibold text-sm truncate">{wf.name}</p>
                <p className="text-[#6B7280] text-xs mt-0.5">Modifié le {formatDate(wf.updatedAt)}</p>
              </div>
              <StatusBadge status={wf.status} />
            </div>
          ))}
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
      {/* Lien GHL natif */}
      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-[#EEF0EB] flex items-center justify-center flex-shrink-0">
          <MessageSquare size={16} className="text-[#3462EE]" />
        </div>
        <div className="flex-1">
          <p className="text-[#111111] font-semibold text-sm">Chatbot natif GHL</p>
          <p className="text-[#6B7280] text-xs mt-1 leading-relaxed">
            Ton chatbot GHL gère les réponses automatiques de base. Configure-le directement dans GHL pour les réponses FAQ, horaires, et messages de bienvenue.
          </p>
          <a
            href="https://app.gohighlevel.com/conversations-settings"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#3462EE] hover:underline"
          >
            Configurer le chatbot GHL <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Escalade vers Kai */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-[#3462EE] flex items-center justify-center flex-shrink-0">
            <Bot size={12} className="text-white" />
          </div>
          <h2 className="text-[#111111] font-semibold text-sm">Escalade vers Kai</h2>
        </div>
        <p className="text-[#6B7280] text-xs mb-4 ml-8">
          Quand le chatbot GHL ne peut plus continuer, Kai prend le relais avec ce prompt.
        </p>

        <textarea
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          rows={14}
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

      {/* Comportement escalade */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-[#111111] font-semibold text-sm mb-4">Comportement de l'escalade</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#111111] text-sm font-medium">Escalade IA activée</p>
              <p className="text-[#6B7280] text-xs mt-0.5">
                {autoResponse ? 'Kai répond quand le chatbot GHL ne peut pas' : 'Escalade IA désactivée'}
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

// ─── Vue principale ───────────────────────────────────────────────────────────

export default function WorkflowsView({ workflows, escalade }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('ghl-chatbot')

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'ghl-chatbot',   label: 'Chatbot GHL',    icon: MessageSquare },
    { id: 'ghl-workflows', label: 'Workflows GHL',  icon: Zap },
    { id: 'n8n',           label: 'Workflows N8N',  icon: Workflow },
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
      {activeTab === 'ghl-workflows' && <GHLWorkflowsTab workflows={workflows} />}
      {activeTab === 'n8n'           && <N8NTab />}
    </div>
  )
}

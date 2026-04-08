'use client'

import { useState } from 'react'
import { Bot, Save } from 'lucide-react'

interface Props {
  initialSystemPrompt: string
  initialAutoResponse: boolean
  initialBudgetMin:    number
  initialActiveHours:  { start: string; end: string }
}

export default function ChatbotView({
  initialSystemPrompt,
  initialAutoResponse,
  initialBudgetMin,
  initialActiveHours,
}: Props) {
  // Section 1 — Prompt
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt)
  const [promptSaving, setPromptSaving] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)

  // Section 2 — Comportement
  const [autoResponse, setAutoResponse] = useState(initialAutoResponse)
  const [budgetMin, setBudgetMin] = useState(initialBudgetMin)
  const [activeHours, setActiveHours] = useState(initialActiveHours)
  const [behaviorSaving, setBehaviorSaving] = useState(false)
  const [behaviorSaved, setBehaviorSaved] = useState(false)

  async function savePrompt() {
    setPromptSaving(true)
    await fetch('/api/chatbot', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt }),
    })
    setPromptSaving(false)
    setPromptSaved(true)
    setTimeout(() => setPromptSaved(false), 2000)
  }

  async function saveBehavior() {
    setBehaviorSaving(true)
    await fetch('/api/chatbot', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoResponse, budgetMin, activeHours }),
    })
    setBehaviorSaving(false)
    setBehaviorSaved(true)
    setTimeout(() => setBehaviorSaved(false), 2000)
  }

  return (
    <div className="bg-[#EEF0EB] min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-[#3462EE] flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <h1 className="text-[#111111] text-xl font-bold">Configuration de Kai</h1>
        </div>
        <p className="text-[#6B7280] text-sm ml-11">
          Personnalisez le comportement et le prompt système de votre agent IA.
        </p>
      </div>

      {/* Section 1 — Prompt système */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[#3462EE] flex items-center justify-center flex-shrink-0">
            <Bot size={12} className="text-white" />
          </div>
          <h2 className="text-[#111111] font-semibold text-sm">Prompt de Kai</h2>
        </div>

        <textarea
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          rows={20}
          className="w-full font-mono text-sm text-[#111111] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE] transition-colors"
          placeholder="Entrez le prompt système de Kai..."
        />

        <div className="flex items-center justify-end gap-3 mt-3">
          {promptSaved && (
            <span className="text-[#14B8A6] text-sm font-medium">Sauvegardé !</span>
          )}
          <button
            onClick={savePrompt}
            disabled={promptSaving}
            className="flex items-center gap-2 bg-[#111111] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#333333] disabled:opacity-50 transition-colors"
          >
            <Save size={13} />
            {promptSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Section 2 — Comportement */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <h2 className="text-[#111111] font-semibold text-sm mb-5">Comportement</h2>

        <div className="space-y-5">
          {/* Toggle auto-response */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#111111] text-sm font-medium">Réponse automatique activée</p>
              <p className="text-[#6B7280] text-xs mt-0.5">
                {autoResponse
                  ? 'Kai répond automatiquement aux messages entrants'
                  : 'Kai ne répond pas automatiquement'}
              </p>
            </div>
            <button
              onClick={() => setAutoResponse(!autoResponse)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                autoResponse ? 'bg-[#3462EE]' : 'bg-[#D1D5DB]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  autoResponse ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Budget minimum */}
          <div>
            <label className="block text-[#111111] text-sm font-medium mb-1.5">
              Budget minimum (€)
            </label>
            <input
              type="number"
              value={budgetMin}
              onChange={e => setBudgetMin(Number(e.target.value))}
              min={0}
              step={500}
              className="w-48 text-sm text-[#111111] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE] transition-colors"
            />
            <p className="text-[#6B7280] text-xs mt-1">
              Les leads avec un budget inférieur ne seront pas qualifiés.
            </p>
          </div>

          {/* Heures actives */}
          <div>
            <label className="block text-[#111111] text-sm font-medium mb-1.5">
              Heures actives
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] text-xs">De</span>
                <input
                  type="time"
                  value={activeHours.start}
                  onChange={e => setActiveHours(h => ({ ...h, start: e.target.value }))}
                  className="text-sm text-[#111111] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE] transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] text-xs">à</span>
                <input
                  type="time"
                  value={activeHours.end}
                  onChange={e => setActiveHours(h => ({ ...h, end: e.target.value }))}
                  className="text-sm text-[#111111] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3462EE]/30 focus:border-[#3462EE] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-5">
          {behaviorSaved && (
            <span className="text-[#14B8A6] text-sm font-medium">Sauvegardé !</span>
          )}
          <button
            onClick={saveBehavior}
            disabled={behaviorSaving}
            className="flex items-center gap-2 bg-[#111111] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#333333] disabled:opacity-50 transition-colors"
          >
            <Save size={13} />
            {behaviorSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Section 3 — Info */}
      <div className="bg-[#F3F4F6] rounded-2xl p-6 shadow-sm">
        <p className="text-[#6B7280] text-sm leading-relaxed">
          Kai répond automatiquement quand un contact envoie un message WhatsApp, SMS ou Email
          et que la réponse automatique est activée pour cette conversation dans le module Conversations.
        </p>
      </div>
    </div>
  )
}

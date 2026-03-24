'use client'

import { useState } from 'react'
import {
  Bot, Zap, ToggleLeft, ToggleRight, Save,
  TrendingUp, Users, Target, Clock,
  ChevronRight, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { DEFAULT_AGENT_CONFIG, type AgentConfig } from '@/lib/agent-config'

const TYPES_TRAVAUX = [
  'Gros œuvre', 'Rénovation', 'Électricité', 'Plomberie',
  'Façade', 'Toiture', 'Aménagement intérieur', 'Isolation',
  'Menuiserie', 'Carrelage', 'Peinture', 'Climatisation',
]

// Mock stats
const STATS = [
  { label: 'Leads qualifiés', value: '18', sub: 'ce mois', icon: Target, color: '#C8F135' },
  { label: 'Taux conversion', value: '42%', sub: 'vs 28% sans IA', icon: TrendingUp, color: '#3462EE' },
  { label: 'Contacts traités', value: '43', sub: 'ce mois', icon: Users, color: '#4A91A8' },
  { label: 'Temps moyen', value: '3.2 min', sub: 'par qualification', icon: Clock, color: '#EFE347' },
]

const RECENT_QUALIFICATIONS = [
  { name: 'Thomas Mercier', company: 'Bouygues Immo', budget: 87000, status: 'qualifié', score: 92 },
  { name: 'Sophie Laurent', company: 'Vinci Construction', budget: 234000, status: 'qualifié', score: 88 },
  { name: 'Lucas Girard', company: 'Girard Immo', budget: 4500, status: 'non qualifié', score: 31 },
  { name: 'Emma Petit', company: 'Petit & Associés', budget: 68000, status: 'qualifié', score: 74 },
  { name: 'Camille Roux', company: 'Roux Construction', budget: 2000, status: 'non qualifié', score: 18 },
]

export default function AgentView() {
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'logs'>('config')

  function handleSave() {
    // In production: save to Supabase or local storage
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleTravaux(type: string) {
    setConfig(c => ({
      ...c,
      typesTravauxActifs: c.typesTravauxActifs.includes(type)
        ? c.typesTravauxActifs.filter(t => t !== type)
        : [...c.typesTravauxActifs, type],
    }))
  }

  return (
    <div className="p-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3462EE]/20 border border-[#3462EE]/30 flex items-center justify-center">
            <Bot size={20} className="text-[#3462EE]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Agent IA</h1>
            <p className="text-xs text-[#8896AB]">Qualification automatique des leads — Claude Opus 4.6</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle agent */}
          <button
            onClick={() => setConfig(c => ({ ...c, agentActif: !c.agentActif }))}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all
              ${config.agentActif
                ? 'bg-[#C8F135]/10 border-[#C8F135]/30 text-[#C8F135]'
                : 'bg-[#1A2235] border-[#232D3F] text-[#8896AB]'
              }
            `}
          >
            {config.agentActif
              ? <><ToggleRight size={18} /> Agent actif</>
              : <><ToggleLeft size={18} /> Agent inactif</>
            }
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#3462EE] hover:bg-[#2a50d4] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
            {saved ? 'Sauvegardé !' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm
        ${config.agentActif
          ? 'bg-[#C8F135]/5 border-[#C8F135]/20 text-[#C8F135]'
          : 'bg-[#EF4444]/5 border-[#EF4444]/20 text-[#EF4444]'
        }
      `}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.agentActif ? 'bg-[#C8F135] animate-pulse' : 'bg-[#EF4444]'}`} />
        {config.agentActif
          ? "L'agent IA est actif. Il répond automatiquement aux nouveaux messages et qualifie les leads."
          : "L'agent IA est inactif. Les messages ne seront pas traités automatiquement."
        }
        <Zap size={14} className="ml-auto flex-shrink-0" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#1A2235] border border-[#232D3F] p-1 rounded-xl w-fit">
        {(['config', 'stats', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
              ${activeTab === tab
                ? 'bg-[#232D3F] text-white'
                : 'text-[#8896AB] hover:text-white'
              }
            `}
          >
            {tab === 'config' ? 'Configuration' : tab === 'stats' ? 'Statistiques' : 'Logs récents'}
          </button>
        ))}
      </div>

      {/* ── CONFIG TAB ── */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-[1fr_340px] gap-5">

          {/* Left: Prompt system */}
          <div className="flex flex-col gap-5">
            <div className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Prompt système</h2>
                <span className="text-[10px] text-[#3D4F6B] bg-[#232D3F] px-2 py-0.5 rounded-full">
                  {config.systemPrompt.length} caractères
                </span>
              </div>
              <textarea
                value={config.systemPrompt}
                onChange={e => setConfig(c => ({ ...c, systemPrompt: e.target.value }))}
                rows={12}
                className="w-full bg-[#121721] border border-[#232D3F] rounded-xl px-4 py-3 text-sm text-[#D1D9E6] placeholder-[#3D4F6B] outline-none resize-none focus:border-[#3462EE] transition-colors leading-relaxed font-mono"
              />
              <div className="flex items-start gap-2 mt-3 p-3 bg-[#EFE347]/5 border border-[#EFE347]/20 rounded-lg">
                <AlertCircle size={13} className="text-[#EFE347] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-[#EFE347]/80">
                  Ce prompt est envoyé à Claude avant chaque conversation. Soyez précis sur le contexte et les critères de qualification.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Critères + Config */}
          <div className="flex flex-col gap-4">

            {/* Budget minimum */}
            <div className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Critères de qualification</h2>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-[#8896AB] mb-2">Budget minimum (€)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1000"
                      max="50000"
                      step="500"
                      value={config.budgetMin}
                      onChange={e => setConfig(c => ({ ...c, budgetMin: parseInt(e.target.value) }))}
                      className="flex-1 accent-[#3462EE]"
                    />
                    <span className="text-sm font-bold text-white w-20 text-right">
                      {config.budgetMin.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#8896AB] mb-2">Délai maximum (mois)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="24"
                      step="1"
                      value={config.delaiMaxMois}
                      onChange={e => setConfig(c => ({ ...c, delaiMaxMois: parseInt(e.target.value) }))}
                      className="flex-1 accent-[#3462EE]"
                    />
                    <span className="text-sm font-bold text-white w-20 text-right">
                      {config.delaiMaxMois} mois
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Types de travaux */}
            <div className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Types de travaux acceptés</h2>
              <div className="flex flex-wrap gap-2">
                {TYPES_TRAVAUX.map(type => {
                  const active = config.typesTravauxActifs.includes(type)
                  return (
                    <button
                      key={type}
                      onClick={() => toggleTravaux(type)}
                      className={`
                        text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all
                        ${active
                          ? 'bg-[#3462EE]/20 border-[#3462EE]/40 text-[#3462EE]'
                          : 'bg-transparent border-[#232D3F] text-[#8896AB] hover:border-[#3D4F6B] hover:text-white'
                        }
                      `}
                    >
                      {type}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-[#3D4F6B] mt-3">
                {config.typesTravauxActifs.length} type(s) sélectionné(s)
              </p>
            </div>

            {/* Model info */}
            <div className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Modèle IA</h2>
              <div className="flex items-center justify-between py-2 border-b border-[#232D3F]">
                <span className="text-xs text-[#8896AB]">Modèle</span>
                <span className="text-xs font-semibold text-white">Claude Opus 4.6</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#232D3F]">
                <span className="text-xs text-[#8896AB]">Fournisseur</span>
                <span className="text-xs font-semibold text-white">Anthropic</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-[#8896AB]">Contexte</span>
                <span className="text-xs font-semibold text-white">200K tokens</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STATS TAB ── */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-5">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {STATS.map(stat => (
              <div key={stat.label} className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[#8896AB]">{stat.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: stat.color + '20' }}>
                    <stat.icon size={14} style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-[#3D4F6B] mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Recent qualifications */}
          <div className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Qualifications récentes</h2>
            <div className="flex flex-col gap-2">
              {RECENT_QUALIFICATIONS.map((q, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-[#232D3F] last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {q.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{q.name}</p>
                    <p className="text-xs text-[#8896AB]">{q.company}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">€{q.budget.toLocaleString('fr-FR')}</p>
                  </div>
                  {/* Score bar */}
                  <div className="w-24 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#3D4F6B]">Score</span>
                      <span className="text-[10px] font-bold" style={{ color: q.score > 60 ? '#C8F135' : '#EF4444' }}>{q.score}%</span>
                    </div>
                    <div className="h-1.5 bg-[#232D3F] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${q.score}%`,
                        background: q.score > 60 ? '#C8F135' : '#EF4444',
                      }} />
                    </div>
                  </div>
                  <span className={`
                    text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0
                    ${q.status === 'qualifié'
                      ? 'bg-[#C8F135]/10 text-[#C8F135]'
                      : 'bg-[#EF4444]/10 text-[#EF4444]'
                    }
                  `}>
                    {q.status}
                  </span>
                  <ChevronRight size={14} className="text-[#3D4F6B] flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {activeTab === 'logs' && (
        <div className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Activité récente</h2>
          <div className="flex flex-col gap-2 font-mono text-xs">
            {[
              { time: '14:32:01', level: 'info',    msg: 'Nouveau lead entrant — Thomas Mercier (Bouygues Immo)' },
              { time: '14:32:03', level: 'info',    msg: 'Conversation initiée — canal: email' },
              { time: '14:32:05', level: 'success', msg: 'Lead qualifié — budget: 87 000€, délai: 2 mois → RDV proposé' },
              { time: '14:28:44', level: 'info',    msg: 'Nouveau lead entrant — Lucas Girard (Girard Immo)' },
              { time: '14:28:46', level: 'warn',    msg: 'Lead non qualifié — budget estimé < 5 000€' },
              { time: '14:28:47', level: 'info',    msg: 'Réponse courtoise envoyée — lead archivé' },
              { time: '13:15:22', level: 'success', msg: 'Lead qualifié — Sophie Laurent (Vinci) — 234 000€' },
              { time: '13:15:20', level: 'info',    msg: 'Historique chargé — 4 messages précédents' },
              { time: '12:03:11', level: 'info',    msg: 'Agent démarré — modèle: claude-opus-4-6' },
            ].map((log, i) => {
              const color = log.level === 'success' ? '#C8F135' : log.level === 'warn' ? '#EFE347' : log.level === 'error' ? '#EF4444' : '#8896AB'
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-[#232D3F]/50 last:border-0">
                  <span className="text-[#3D4F6B] flex-shrink-0">{log.time}</span>
                  <span className="font-bold flex-shrink-0 w-14" style={{ color }}>{log.level.toUpperCase()}</span>
                  <span className="text-[#D1D9E6]">{log.msg}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

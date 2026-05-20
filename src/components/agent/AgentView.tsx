'use client'

import { useState, useRef, useEffect } from 'react'
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
  { label: 'Leads qualifiés', value: '18', sub: 'ce mois', icon: Target, color: '#22c55e' },
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
  const [config, setConfig] = useState<AgentConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_AGENT_CONFIG
    try {
      const saved = localStorage.getItem('soren_agent_config')
      return saved ? { ...DEFAULT_AGENT_CONFIG, ...JSON.parse(saved) } : DEFAULT_AGENT_CONFIG
    } catch { return DEFAULT_AGENT_CONFIG }
  })
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'logs'>('config')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }, [])

  function handleSave() {
    try { localStorage.setItem('soren_agent_config', JSON.stringify(config)) } catch {}
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
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
            <h1 className="text-2xl font-black text-soren-text leading-none">Agent IA</h1>
            <p className="text-xs text-soren-muted">Qualification automatique des leads — Claude Opus 4.6</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle agent */}
          <button
            onClick={() => setConfig(c => ({ ...c, agentActif: !c.agentActif }))}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all
              ${config.agentActif
                ? 'bg-soren-sidebar border-[#111111] text-white'
                : 'bg-soren-card border-soren-border text-soren-muted'
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
          ? 'bg-[#22c55e]/12 border-[#22c55e]/30 text-[#16a34a]'
          : 'bg-[#EF4444]/8 border-[#EF4444]/30 text-[#dc2626]'
        }
      `}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.agentActif ? 'bg-[#22c55e] animate-pulse' : 'bg-[#EF4444]'}`} />
        {config.agentActif
          ? "L'agent IA est actif. Il répond automatiquement aux nouveaux messages et qualifie les leads."
          : "L'agent IA est inactif. Les messages ne seront pas traités automatiquement."
        }
        <Zap size={14} className="ml-auto flex-shrink-0" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-soren-card border border-soren-border p-1 rounded-xl w-fit">
        {(['config', 'stats', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
              ${activeTab === tab
                ? 'bg-soren-app text-soren-text'
                : 'text-soren-muted hover:text-soren-text'
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
            <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-soren-text">Prompt système</h2>
                <span className="text-[10px] text-soren-subtle bg-soren-app px-2 py-0.5 rounded-full">
                  {config.systemPrompt.length} caractères
                </span>
              </div>
              <textarea
                value={config.systemPrompt}
                onChange={e => setConfig(c => ({ ...c, systemPrompt: e.target.value }))}
                rows={12}
                className="w-full bg-soren-app border border-soren-border rounded-xl px-4 py-3 text-sm text-[#374151] placeholder-[#3D4F6B] outline-none resize-none focus:border-[#3462EE] transition-colors leading-relaxed font-mono"
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
            <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-soren-text mb-4">Critères de qualification</h2>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-soren-muted mb-2">Budget minimum (€)</label>
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
                    <span className="text-sm font-bold text-soren-text w-20 text-right">
                      {config.budgetMin.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-soren-muted mb-2">Délai maximum (mois)</label>
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
                    <span className="text-sm font-bold text-soren-text w-20 text-right">
                      {config.delaiMaxMois} mois
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Types de travaux */}
            <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-soren-text mb-3">Types de travaux acceptés</h2>
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
                          : 'bg-transparent border-soren-border text-soren-muted hover:border-[#3D4F6B] hover:text-soren-text'
                        }
                      `}
                    >
                      {type}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-soren-subtle mt-3">
                {config.typesTravauxActifs.length} type(s) sélectionné(s)
              </p>
            </div>

            {/* Model info */}
            <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-soren-text mb-3">Modèle IA</h2>
              <div className="flex items-center justify-between py-2 border-b border-soren-border">
                <span className="text-xs text-soren-muted">Modèle</span>
                <span className="text-xs font-semibold text-soren-text">Claude Opus 4.6</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-soren-border">
                <span className="text-xs text-soren-muted">Fournisseur</span>
                <span className="text-xs font-semibold text-soren-text">Anthropic</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-soren-muted">Contexte</span>
                <span className="text-xs font-semibold text-soren-text">200K tokens</span>
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
              <div key={stat.label} className="bg-soren-card border border-soren-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-soren-muted">{stat.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: stat.color + '20' }}>
                    <stat.icon size={14} style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-soren-text">{stat.value}</p>
                <p className="text-xs text-soren-subtle mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Recent qualifications */}
          <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-soren-text mb-4">Qualifications récentes</h2>
            <div className="flex flex-col gap-2">
              {RECENT_QUALIFICATIONS.map((q, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-soren-border last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {q.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-soren-text">{q.name}</p>
                    <p className="text-xs text-soren-muted">{q.company}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-soren-text">€{q.budget.toLocaleString('fr-FR')}</p>
                  </div>
                  {/* Score bar */}
                  <div className="w-24 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-soren-subtle">Score</span>
                      <span className="text-[10px] font-bold" style={{ color: q.score > 60 ? '#16a34a' : '#EF4444' }}>{q.score}%</span>
                    </div>
                    <div className="h-1.5 bg-soren-app rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${q.score}%`,
                        background: q.score > 60 ? '#22c55e' : '#EF4444',
                      }} />
                    </div>
                  </div>
                  <span className={`
                    text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0
                    ${q.status === 'qualifié'
                      ? 'bg-[#22c55e]/12 text-[#16a34a]'
                      : 'bg-[#EF4444]/10 text-[#EF4444]'
                    }
                  `}>
                    {q.status}
                  </span>
                  <ChevronRight size={14} className="text-soren-subtle flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {activeTab === 'logs' && (
        <div className="bg-soren-card border border-soren-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-soren-text mb-4">Activité récente</h2>
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
              const color = log.level === 'success' ? '#16a34a' : log.level === 'warn' ? '#ca8a04' : log.level === 'error' ? '#EF4444' : '#8896AB'
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-soren-border/50 last:border-0">
                  <span className="text-soren-subtle flex-shrink-0">{log.time}</span>
                  <span className="font-bold flex-shrink-0 w-14" style={{ color }}>{log.level.toUpperCase()}</span>
                  <span className="text-[#374151]">{log.msg}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

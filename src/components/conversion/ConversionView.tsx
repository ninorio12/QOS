'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, MessageSquare, Bot, CheckCircle, XCircle, Save, ExternalLink, FlaskConical } from 'lucide-react'
import dynamic from 'next/dynamic'

const TestTab = dynamic(() => import('./TestTab'), { ssr: false })

type Tab = 'vocal' | 'whatsapp' | 'chatbot' | 'test'

// ─── Shared primitives ────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <p className="text-[9px] font-bold uppercase tracking-widest text-soren-subtle mb-3">{label}</p>
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl px-4 py-3.5 flex-1">
      <p className="text-xs text-soren-subtle mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-soren-subtle mt-0.5">{sub}</p>}
    </div>
  )
}

function StatusCard({
  name, subtitle, connected, meta,
}: { name: string; subtitle: string; connected: boolean; meta?: string }) {
  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-4 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-soren-text">{name}</p>
          {connected
            ? <CheckCircle size={13} className="text-[#22c55e]" />
            : <XCircle size={13} className="text-soren-subtle" />
          }
        </div>
        <p className="text-xs text-soren-subtle">{subtitle}</p>
      </div>
      <div className="text-right">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
          connected ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#3D4F6B]/20 text-soren-subtle'
        }`}>
          {connected ? 'CONNECTÉ' : 'EN ATTENTE'}
        </span>
        {meta && <p className="text-[10px] text-soren-subtle mt-1">{meta}</p>}
      </div>
    </div>
  )
}

// ─── Tab 1 : Agent vocal ──────────────────────────────────────
const CALL_HISTORY = [
  { contact: 'Martin Dupont',   date: '31 mars, 10:42', duration: '4min 32s', result: 'Répondu'     },
  { contact: 'Xavier Lambert',  date: '29 mars, 14:15', duration: '8min 03s', result: 'Répondu'     },
  { contact: 'Inès Duprez',     date: '29 mars, 11:30', duration: '0min 45s', result: 'Non répondu' },
  { contact: 'Didier Fabre',    date: '28 mars, 09:00', duration: '1min 45s', result: 'Répondu'     },
  { contact: 'Sophie Renard',   date: '27 mars, 16:20', duration: '0min 00s', result: 'Voicemail'   },
]

const RESULT_STYLE: Record<string, { color: string; bg: string }> = {
  'Répondu':     { color: '#22c55e', bg: '#22c55e15' },
  'Non répondu': { color: '#EF4444', bg: '#EF444415' },
  'Voicemail':   { color: '#EFE347', bg: '#EFE34715' },
}

function AgentVocalTab() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Vapi status */}
      <div>
        <SectionLabel label="Statut Vapi" />
        <StatusCard
          name="Vapi Voice AI"
          subtitle='Assistant "Kai" · Appels sortants BTP'
          connected
          meta="Assistant ID : asst_kai_btp_v1"
        />
      </div>

      {/* Config */}
      <div>
        <SectionLabel label="Configuration" />
        <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
          {[
            { label: "Nom de l'assistant", value: 'Kai' },
            { label: 'Description',        value: 'Kai prend en charge les appels sortants pour qualifier les leads BTP' },
            { label: 'Voix utilisée',      value: 'Eleven Labs — fr-FR Neural' },
            { label: 'Modèle',             value: 'claude-haiku-4-5-20251001' },
          ].map((row, i, arr) => (
            <div key={row.label} className={`flex items-start justify-between px-5 py-3.5 gap-4 ${i < arr.length - 1 ? 'border-b border-soren-border' : ''}`}>
              <span className="text-xs text-soren-subtle flex-shrink-0 w-36">{row.label}</span>
              <span className="text-xs font-semibold text-soren-text text-right">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div>
        <SectionLabel label="Activité aujourd'hui" />
        <div className="flex gap-3">
          <KpiCard label="Appels aujourd'hui" value="2"      sub="sur 5 planifiés"          color="#3462EE" />
          <KpiCard label="Taux de réponse"    value="67%"    sub="2/3 appels aboutis"       color="#22c55e" />
          <KpiCard label="Durée moyenne"      value="3min"   sub="par conversation réussie" color="#4A91A8" />
        </div>
      </div>

      {/* Call history */}
      <div>
        <SectionLabel label="Historique des appels" />
        <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 px-4 py-2.5 border-b border-soren-border">
            {['Contact', 'Date', 'Durée', 'Résultat'].map(h => (
              <p key={h} className="text-[9px] font-bold uppercase tracking-wider text-soren-subtle">{h}</p>
            ))}
          </div>
          {CALL_HISTORY.map((row, i) => {
            const style = RESULT_STYLE[row.result] ?? { color: '#8896AB', bg: '#8896AB15' }
            return (
              <div
                key={i}
                className={`grid grid-cols-4 px-4 py-3 items-center ${i < CALL_HISTORY.length - 1 ? 'border-b border-soren-border' : ''}`}
              >
                <p className="text-xs font-semibold text-soren-text">{row.contact}</p>
                <p className="text-xs text-soren-subtle">{row.date}</p>
                <p className="text-xs text-soren-muted">{row.duration}</p>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full w-fit"
                  style={{ color: style.color, background: style.bg }}
                >
                  {row.result}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Tab 2 : WhatsApp ─────────────────────────────────────────
type Template = { stage: string; message: string; active: boolean }

const INITIAL_TEMPLATES: Template[] = [
  {
    stage: 'Nouveau Lead',
    message: "Bonjour {{prénom}} ! Je suis Kai, assistant de l'équipe Qorpo BTP. Vous avez manifesté de l'intérêt pour nos services — je serais ravi d'en discuter avec vous. Quel est votre projet ?",
    active: true,
  },
  {
    stage: 'Qualifié',
    message: "Bonjour {{prénom}}, suite à notre échange, je vous propose un rendez-vous pour finaliser votre devis. Êtes-vous disponible cette semaine ? Je peux m'adapter à vos créneaux.",
    active: true,
  },
  {
    stage: 'Sans réponse 24h',
    message: "Bonjour {{prénom}}, je me permets de vous relancer car votre projet nous tient à cœur. Avez-vous eu le temps de consulter notre proposition ? N'hésitez pas à me poser vos questions.",
    active: false,
  },
]

function WhatsAppTab() {
  const [templates, setTemplates] = useState<Template[]>(() => {
    if (typeof window === 'undefined') return INITIAL_TEMPLATES
    try {
      const stored = localStorage.getItem('soren_wa_templates')
      return stored ? JSON.parse(stored) : INITIAL_TEMPLATES
    } catch { return INITIAL_TEMPLATES }
  })
  const [saved, setSaved] = useState<Record<number, boolean>>({})

  function saveTemplate(i: number) {
    try { localStorage.setItem('soren_wa_templates', JSON.stringify(templates)) } catch {}
    setSaved(s => ({ ...s, [i]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [i]: false })), 2000)
  }

  function toggleActive(i: number) {
    setTemplates(ts => ts.map((t, idx) => idx === i ? { ...t, active: !t.active } : t))
  }

  function setMessage(i: number, msg: string) {
    setTemplates(ts => ts.map((t, idx) => idx === i ? { ...t, message: msg } : t))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Twilio status */}
      <div>
        <SectionLabel label="Statut Twilio" />
        <StatusCard
          name="Twilio WhatsApp"
          subtitle="SMS & messages sortants"
          connected={false}
          meta="Connexion requise"
        />
      </div>

      {/* Templates */}
      <div>
        <SectionLabel label="Séquences automatiques par stage" />
        <div className="space-y-4">
          {templates.map((t, i) => (
            <div key={t.stage} className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
              {/* header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-soren-border">
                <div className="flex items-center gap-2">
                  <MessageSquare size={12} className="text-soren-subtle" />
                  <span className="text-xs font-bold text-soren-text">{t.stage}</span>
                </div>
                <button
                  onClick={() => toggleActive(i)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                    t.active
                      ? 'bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/25'
                      : 'bg-[#3D4F6B]/20 text-soren-subtle hover:bg-[#3D4F6B]/30'
                  }`}
                >
                  {t.active ? 'ACTIF' : 'INACTIF'}
                </button>
              </div>

              {/* textarea */}
              <textarea
                value={t.message}
                onChange={e => setMessage(i, e.target.value)}
                rows={3}
                className="w-full bg-transparent text-xs text-[#374151] px-4 py-3 outline-none resize-none leading-5 placeholder-[#3D4F6B]"
              />

              {/* save */}
              <div className="flex justify-end px-4 pb-3">
                <button
                  onClick={() => saveTemplate(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    saved[i]
                      ? 'bg-[#22c55e]/20 text-[#22c55e]'
                      : 'bg-soren-sidebar text-white hover:bg-[#2a2a2a]'
                  }`}
                >
                  <Save size={11} />
                  {saved[i] ? 'Sauvegardé' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab 3 : Chatbot ──────────────────────────────────────────
const CHATBOT_CONVS = [
  { contact: 'Nouveau visiteur',  date: '31 mars, 15:20', result: 'Lead qualifié',   color: '#22c55e' },
  { contact: 'Jean-Paul Martin',  date: '31 mars, 11:05', result: 'Devis demandé',   color: '#E2FF8D' },
  { contact: 'Visiteur anonyme',  date: '30 mars, 18:40', result: 'Non converti',    color: '#3D4F6B' },
]

function ChatbotTab() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* CRM status */}
      <div>
        <SectionLabel label="Statut Chatbot" />
        <StatusCard
          name="Chatbot CRM"
          subtitle="Widget web + landing pages"
          connected
          meta="Widget ID : wgt_ghl_btp_01"
        />
      </div>

      {/* KPIs */}
      <div>
        <SectionLabel label="Performance" />
        <div className="flex gap-3">
          <KpiCard label="Messages traités"  value="47"  sub="ce mois"             color="#3462EE" />
          <KpiCard label="Taux de résolution" value="78%" sub="sans intervention"   color="#22c55e" />
          <KpiCard label="Leads convertis"   value="8"   sub="via chatbot ce mois" color="#4A91A8" />
        </div>
      </div>

      {/* CRM link */}
      <div>
        <SectionLabel label="Configuration avancée" />
        <div className="bg-soren-card border border-soren-border rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-soren-text">Configurer le chatbot</p>
            <p className="text-xs text-soren-subtle mt-0.5">Scénarios, réponses et intégration</p>
          </div>
          <a
            href="#"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-soren-border text-xs font-medium text-soren-muted hover:text-soren-text hover:border-[#3D4F6B] transition-colors"
          >
            Configurer dans le CRM
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Recent conversations */}
      <div>
        <SectionLabel label="Dernières conversations" />
        <div className="bg-soren-card border border-soren-border rounded-2xl overflow-hidden">
          {CHATBOT_CONVS.map((c, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 ${i < CHATBOT_CONVS.length - 1 ? 'border-b border-soren-border' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-soren-app flex items-center justify-center">
                  <Bot size={12} className="text-soren-subtle" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-soren-text">{c.contact}</p>
                  <p className="text-[10px] text-soren-subtle">{c.date}</p>
                </div>
              </div>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ color: c.color, background: c.color + '18' }}
              >
                {c.result}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'vocal',    label: 'Agent vocal', icon: Phone },
  { id: 'whatsapp', label: 'WhatsApp',    icon: MessageSquare },
  { id: 'chatbot',  label: 'Chatbot',     icon: Bot },
  { id: 'test',     label: 'Test',        icon: FlaskConical },
]

export default function ConversionView() {
  const [activeTab, setActiveTab] = useState<Tab>('vocal')

  return (
    <div className="p-6 bg-soren-app min-h-[calc(100vh-56px)]">
      {/* Module tabs */}
      <div className="flex items-center gap-1 bg-soren-card border border-soren-border rounded-xl p-1 self-start w-fit mb-6">
        <Link href="/conversations" className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-soren-muted hover:text-soren-text transition-all">
          Conversations
        </Link>
        <Link href="/conversion" className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-soren-sidebar text-white transition-all">
          Conversion IA
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-soren-text">Conversion</h1>
        <p className="text-xs text-soren-muted mt-0.5">Canaux de conversion automatisés</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-soren-border pb-0">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-[#3462EE] text-[#3462EE] font-semibold'
                  : 'border-transparent text-soren-muted hover:text-soren-text hover:border-[#D1D5DB]'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'vocal'    && <AgentVocalTab />}
      {activeTab === 'whatsapp' && <WhatsAppTab />}
      {activeTab === 'chatbot'  && <ChatbotTab />}
      {activeTab === 'test'     && <TestTab />}
    </div>
  )
}

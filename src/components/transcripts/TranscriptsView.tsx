'use client'

import { useState } from 'react'
import { Phone, MessageSquare, Send, Clock, CheckSquare } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type Canal = 'vapi' | 'whatsapp' | 'telegram'

type Message = { speaker: 'Agent' | 'Client'; text: string }

type Transcript = {
  id: string
  contact: string
  date: string
  duration: string
  canal: Canal
  summary: string
  actions: string[]
  messages: Message[]
}

// ─── Canal meta ───────────────────────────────────────────────
const CANAL_META: Record<Canal, { label: string; color: string; icon: React.ElementType }> = {
  vapi:      { label: 'Vapi',      color: '#3462EE', icon: Phone },
  whatsapp:  { label: 'WhatsApp',  color: '#22c55e', icon: MessageSquare },
  telegram:  { label: 'Telegram',  color: '#4A91A8', icon: Send },
}

// ─── Mock data ────────────────────────────────────────────────
const MOCK_TRANSCRIPTS: Transcript[] = [
  {
    id: 'tr1',
    contact: 'Martin Dupont',
    date: '31 mars 2026',
    duration: '4min 32s',
    canal: 'vapi',
    summary:
      "Martin Dupont, gérant de Réno Pro Île-de-France, est intéressé par une rénovation complète de façade pour un immeuble de 6 étages. Budget estimé à 45 000 €. Il souhaite un devis détaillé avant le 5 avril. Rappel planifié.",
    actions: [
      'Envoyer devis façade avant le 5 avril',
      'Créer opportunité dans le CRM — stade Qualifié',
      'Relancer si pas de réponse sous 48h',
    ],
    messages: [
      { speaker: 'Agent', text: "Bonjour, je suis Kai de l'agence Qorpo. Est-ce que vous êtes bien Martin Dupont ?" },
      { speaker: 'Client', text: "Oui c'est moi, bonjour." },
      { speaker: 'Agent', text: "Parfait. Vous avez rempli un formulaire concernant un projet de ravalement. Pouvez-vous m'en dire plus ?" },
      { speaker: 'Client', text: "Oui, j'ai un immeuble de 6 étages à Nantes. La façade est en très mauvais état, il faudrait un ravalement complet avec isolation." },
      { speaker: 'Agent', text: "Très bien. Quelle est la surface approximative à traiter ?" },
      { speaker: 'Client', text: "À peu près 800 m², façade principale et pignon." },
      { speaker: 'Agent', text: "Parfait. Et avez-vous déjà un budget en tête pour ce projet ?" },
      { speaker: 'Client', text: "On s'est dit autour de 40 à 50 000 €, mais on est ouvert si ça se justifie." },
      { speaker: 'Agent', text: "Compris. Je vous prépare un devis détaillé sous 48h. Bonne journée !" },
    ],
  },
  {
    id: 'tr2',
    contact: 'Inès Duprez',
    date: '30 mars 2026',
    duration: '2min 15s',
    canal: 'whatsapp',
    summary:
      "Confirmation du RDV du 2 avril à 14h pour visite technique appartement 75m² à Lyon. Inès Duprez confirme sa disponibilité et demande à recevoir un rappel la veille.",
    actions: [
      'Envoyer rappel RDV le 1er avril',
      'Préparer fiche visite technique',
    ],
    messages: [
      { speaker: 'Agent', text: "Bonjour Inès, je vous confirme votre RDV du 2 avril à 14h pour la visite technique." },
      { speaker: 'Client', text: "Parfait, je serai disponible. Pouvez-vous m'envoyer un rappel la veille ?" },
      { speaker: 'Agent', text: "Bien sûr, je programme un rappel pour le 1er avril en début de soirée." },
      { speaker: 'Client', text: "Merci beaucoup !" },
    ],
  },
  {
    id: 'tr3',
    contact: 'Xavier Lambert',
    date: '29 mars 2026',
    duration: '8min 03s',
    canal: 'vapi',
    summary:
      "Xavier Lambert dirige XL BTP, une PME de gros œuvre. Il a 3 chantiers en cours et cherche un partenaire pour les lots électricité et plomberie. Volume estimé à 180 000 € sur 12 mois. Très qualifié.",
    actions: [
      'Envoyer proposition de partenariat',
      'Monter dans pipeline stade RDV Booké',
      'Planifier réunion de présentation',
    ],
    messages: [
      { speaker: 'Agent', text: "Bonjour Xavier, Kai de chez Qorpo. Vous avez sollicité notre agence pour un partenariat chantier." },
      { speaker: 'Client', text: "Exactement. On a 3 résidences en cours de construction, je cherche des sous-traitants fiables." },
      { speaker: 'Agent', text: "Quels sont les lots que vous souhaitez externaliser en priorité ?" },
      { speaker: 'Client', text: "Électricité et plomberie essentiellement. Parfois second œuvre si vos équipes sont dispo." },
      { speaker: 'Agent', text: "Très bien. Pouvez-vous m'indiquer le calendrier approximatif de vos chantiers ?" },
      { speaker: 'Client', text: "Le premier chantier démarre en mai, les deux autres en septembre." },
      { speaker: 'Agent', text: "Quel volume d'heures estimez-vous sur la totalité ?" },
      { speaker: 'Client', text: "Difficile à dire précisément, mais on parle de 150 à 200 000 euros de sous-traitance au total." },
    ],
  },
  {
    id: 'tr4',
    contact: 'Didier Fabre',
    date: '28 mars 2026',
    duration: '1min 45s',
    canal: 'telegram',
    summary:
      "Didier Fabre (Fabre Électricité) demande un devis pour la pose de carrelage dans une maison individuelle (85m²). Projet prévu pour juin. Fiche contact créée dans le CRM.",
    actions: [
      'Créer opportunité CRM — stade Nouveau Lead',
      'Envoyer questionnaire projet',
    ],
    messages: [
      { speaker: 'Client', text: "Bonjour, je cherche un artisan pour poser du carrelage dans ma maison, environ 85m²." },
      { speaker: 'Agent', text: "Bonjour Didier ! Quand souhaitez-vous réaliser ce chantier ?" },
      { speaker: 'Client', text: "Idéalement en juin, la maison sera disponible à ce moment-là." },
      { speaker: 'Agent', text: "Parfait. Je vous envoie un questionnaire pour affiner le devis. Bonne journée !" },
    ],
  },
  {
    id: 'tr5',
    contact: 'Sophie Renard',
    date: '27 mars 2026',
    duration: '6min 20s',
    canal: 'vapi',
    summary:
      "Sophie Renard (BatiSud SARL) travaille sur un projet de réhabilitation d'un bâtiment industriel en logements. Elle cherche une entreprise générale pour le gros œuvre. Budget : 320 000 €. Très forte opportunité.",
    actions: [
      'Envoyer dossier de présentation entreprise',
      'Monter au stade Qualifié dans le CRM',
      'Planifier visite du bâtiment',
    ],
    messages: [
      { speaker: 'Agent', text: "Bonjour Sophie, c'est Kai de Qorpo. Vous cherchez une entreprise pour un projet de réhabilitation ?" },
      { speaker: 'Client', text: "Oui, j'ai un bâtiment industriel de 1200m² à transformer en 12 logements à Bordeaux." },
      { speaker: 'Agent', text: "C'est un beau projet. C'est pour quelle échéance ?" },
      { speaker: 'Client', text: "Dépôt de PC en mai, démarrage travaux idéalement en septembre." },
      { speaker: 'Agent', text: "Avez-vous des entreprises en concurrence sur ce dossier ?" },
      { speaker: 'Client', text: "Oui, j'ai deux autres devis en cours. Mais je privilégie la réactivité et la qualité de suivi." },
      { speaker: 'Agent', text: "Je comprends. Je vous envoie notre book de références ce soir. Puis-je vous appeler vendredi ?" },
      { speaker: 'Client', text: "Oui, vendredi 10h c'est parfait pour moi." },
    ],
  },
]

// ─── Canal badge ──────────────────────────────────────────────
function CanalBadge({ canal }: { canal: Canal }) {
  const meta = CANAL_META[canal]
  const Icon = meta.icon
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: meta.color, background: meta.color + '20' }}
    >
      <Icon size={9} />
      {meta.label}
    </span>
  )
}

// ─── List item ────────────────────────────────────────────────
function TranscriptRow({
  t, isSelected, onClick,
}: { t: Transcript; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-soren-border last:border-0 ${
        isSelected ? 'bg-soren-card shadow-sm border-l-2 border-l-[#3462EE]' : 'hover:bg-soren-elevated'
      }`}
    >
      {/* avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {t.contact.split(' ').map(w => w[0]).join('').slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-soren-text truncate">{t.contact}</p>
          <div className="flex items-center gap-1 text-[10px] text-soren-subtle flex-shrink-0">
            <Clock size={9} />
            {t.duration}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-soren-subtle">{t.date}</p>
          <CanalBadge canal={t.canal} />
        </div>
      </div>
    </button>
  )
}

// ─── Detail panel ─────────────────────────────────────────────
function TranscriptDetail({ t }: { t: Transcript }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-soren-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-soren-text">{t.contact}</h2>
          <CanalBadge canal={t.canal} />
        </div>
        <div className="flex items-center gap-3 text-xs text-soren-subtle">
          <span>{t.date}</span>
          <span>·</span>
          <Clock size={11} className="inline" />
          <span>{t.duration}</span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6 flex-1">
        {/* Summary */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-soren-subtle mb-2">Résumé IA</p>
          <p className="text-sm text-soren-muted leading-6 bg-soren-card border border-soren-border rounded-xl p-4">
            {t.summary}
          </p>
        </div>

        {/* Actions */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-soren-subtle mb-2">Actions détectées</p>
          <div className="space-y-2">
            {t.actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-soren-card border border-soren-border rounded-xl px-4 py-3">
                <CheckSquare size={13} className="text-[#FF4D00] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#374151]">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-soren-subtle mb-2">Transcription</p>
          <div className="space-y-3">
            {t.messages.map((m, i) => {
              const isAgent = m.speaker === 'Agent'
              return (
                <div key={i} className={`flex gap-2 ${isAgent ? '' : 'flex-row-reverse'}`}>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                      isAgent ? 'bg-[#3462EE] text-white' : 'bg-soren-app text-soren-muted'
                    }`}
                  >
                    {isAgent ? 'IA' : t.contact[0]}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                      isAgent
                        ? 'bg-[#EEF3FF] border border-[#DBEAFE] text-[#1e3a8a] rounded-tl-sm'
                        : 'bg-soren-card border border-soren-border text-[#374151] rounded-tr-sm shadow-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────
export default function TranscriptsView() {
  const [selected, setSelected] = useState<Transcript>(MOCK_TRANSCRIPTS[0])

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-soren-app">

      {/* Left list */}
      <div className="flex flex-col w-[300px] flex-shrink-0 bg-soren-card border-r border-soren-border">
        <div className="px-4 pt-5 pb-4 border-b border-soren-border">
          <p className="text-xs text-soren-muted mt-0.5">{MOCK_TRANSCRIPTS.length} conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {MOCK_TRANSCRIPTS.map(t => (
            <TranscriptRow
              key={t.id}
              t={t}
              isSelected={selected.id === t.id}
              onClick={() => setSelected(t)}
            />
          ))}
        </div>
      </div>

      {/* Right detail */}
      <div className="flex-1 overflow-hidden">
        <TranscriptDetail t={selected} />
      </div>
    </div>
  )
}

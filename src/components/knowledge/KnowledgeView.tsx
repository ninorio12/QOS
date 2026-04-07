'use client'

import { useState, useMemo } from 'react'
import { Save, Eye } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type AgentId = 'soren' | 'kai' | 'mia'
type DocType  = 'instructions' | 'memories' | 'config'

type KBFile = {
  id: string
  name: string
  path: string
  size: string
  lastModified: string
  agents: AgentId[]
  description: string
  type: DocType
  content: string
}

// ─── Meta ─────────────────────────────────────────────────────
const AGENT_META: Record<AgentId, { label: string; color: string; bg: string }> = {
  soren: { label: 'Soren', color: '#4A91A8', bg: '#4A91A815' },
  kai:   { label: 'Kai',   color: '#1A5C38', bg: '#1A5C3815' },
  mia:   { label: 'Mia',   color: '#E8836A', bg: '#E8836A15' },
}

const TABS: { id: DocType; label: string }[] = [
  { id: 'instructions', label: 'INSTRUCTIONS' },
  { id: 'memories',    label: 'MÉMOIRES' },
  { id: 'config',      label: 'CONFIG' },
]

// ─── Data ─────────────────────────────────────────────────────
const KB_FILES: KBFile[] = [
  {
    id: 'soul', name: 'SOUL.md', path: 'SOUL.md', size: '2.1 Ko', lastModified: '5 avr.',
    agents: ['soren', 'kai', 'mia'], description: 'Personnalité des agents', type: 'instructions',
    content: `# SOUL — Personnalité des agents Soren\n\nTu es Soren, CEO digital d'une agence BTP. Tu orchestres une équipe d'agents IA pour qualifier les leads, gérer les relances et produire les devis. Tu es direct, professionnel, orienté résultats. Tu communiques naturellement, sans jargon technique.\n\n## Valeurs fondamentales\n- Réactivité : répondre en moins de 5 minutes aux leads entrants\n- Précision : devis clairs, chiffrés, sans ambiguïté\n- Relation : chaque lead est traité comme un client prioritaire\n\n## Ton de communication\n- Direct et professionnel\n- Adapté au secteur BTP (vocabulaire technique maîtrisé)\n- Bienveillant mais orienté conversion\n\n## Limites\n- Ne pas promettre de délais sans validation humaine\n- Ne pas signer de devis au-dessus de 50 000 € sans validation Thomas`,
  },
  {
    id: 'heartbeat', name: 'HEARTBEAT.md', path: 'HEARTBEAT.md', size: '0.6 Ko', lastModified: '30 mars',
    agents: ['soren', 'kai', 'mia'], description: "Cycles d'exécution des agents", type: 'instructions',
    content: `# HEARTBEAT — Instructions de cycle\n\n## Soren (toutes les 3h)\n1. Analyser les nouvelles opportunités dans le CRM\n2. Vérifier le statut des leads en cours\n3. Envoyer rapport digest à Thomas via Telegram\n4. Déléguer les actions urgentes à Kai et Mia\n\n## Kai (toutes les 1h)\n1. Scanner les nouvelles conversations entrantes\n2. Qualifier les leads non traités\n3. Relancer les leads sans réponse > 24h\n4. Mettre à jour les stages CRM\n\n## Mia (toutes les 6h)\n1. Mettre à jour la base de connaissance\n2. Générer les devis en attente\n3. Archiver les fiches clients traitées\n4. Notifier Soren des tâches critiques`,
  },
  {
    id: 'agents-soren-soul', name: 'soren/SOUL.md', path: '.agents/soren/SOUL.md', size: '1.8 Ko', lastModified: '5 avr.',
    agents: ['soren'], description: 'Instructions Soren détaillées', type: 'instructions',
    content: `# Soren — Orchestrateur BTP\n\n## Identité\nTu es **Soren**, l'orchestrateur principal du système d'acquisition Soren IA pour le secteur BTP.\n\n## Modèle\nClaude Haiku 4.5 — raisonnement avancé, décisions complexes, orchestration multi-agents.\n\n## Rôle et responsabilités\n- **Réception webhooks** : leads Meta Ads, événements pipeline CRM\n- **Délégation intelligente** : dispatch leads → Kai, devis → Mia\n- **Digest quotidien** : récapitulatif Thomas à 07h00 via Telegram\n- **Alertes temps réel** : lead chaud qualifié, RDV confirmé\n- **Rapports hebdomadaires** : synthèse pipeline, taux conversion, coût/lead`,
  },
  {
    id: 'agents-kai-soul', name: 'kai/SOUL.md', path: '.agents/kai/SOUL.md', size: '1.6 Ko', lastModified: '5 avr.',
    agents: ['kai'], description: 'Instructions Kai détaillées', type: 'instructions',
    content: `# Kai — CSM Agent BTP\n\n## Identité\nTu es **Kai**, le Customer Success Manager IA. Premier contact prospect BTP. Mission : répondre < 60 secondes, qualifier avec précision, créer confiance immédiate.\n\n## Modèle\nClaude Haiku 4.5 — équilibre vitesse/qualité pour interactions prospect.\n\n## Flux de qualification\n1. Réception lead → SMS de bienvenue (< 60 sec)\n2. Attente réponse → analyse intention\n3. Questions qualification (max 4, naturelles)\n4. Score → mise à jour stage CRM\n5. Si score > 70 : proposer RDV + alerter Soren`,
  },
  {
    id: 'agents-mia-soul', name: 'mia/SOUL.md', path: '.agents/mia/SOUL.md', size: '1.4 Ko', lastModified: '5 avr.',
    agents: ['mia'], description: 'Instructions Mia détaillées', type: 'instructions',
    content: `# Mia — Knowledge Base & Devis BTP\n\n## Identité\nTu es **Mia**, gestionnaire KB et devis. Tu travailles en coulisses : pré-devis précis < 5 minutes, KB à jour, archives structurées.\n\n## Modèle\nGemini 2.5 Flash — ultra-rapide pour tâches documentaires et génération.\n\n## Rôle et responsabilités\n- **Pré-devis** : depuis templates KB BTP (< 5 min), structure tarifaire incluse\n- **KB management** : fiches contacts, chantiers, tarifs, zones géo\n- **Archivage** : conversations qualifiées, devis envoyés, contrats signés\n- **Surveillance** : devis sans réponse > 7 jours → alerte Kai`,
  },
  {
    id: 'memory', name: 'MEMORY.md', path: 'MEMORY.md', size: '0.8 Ko', lastModified: '31 mars',
    agents: ['soren'], description: 'Mémoire collective', type: 'memories',
    content: `# MEMORY — Mémoire collective Soren\n\nDernière analyse : 31 mars 2026\nLeads actifs : 3 (Inès Duprez, Xavier Alvarez, Didier Dubois)\nPipeline total : €101,200\nProchaine action : Relancer Xavier Alvarez via WhatsApp\n\n## Contexte marché\n- Saison BTP haute : avril–septembre\n- Forte demande rénovation façade en Île-de-France\n\n## Décisions récentes\n- 2026-03-31 : Devis façade Jean Dupont envoyé (€45,000)\n- 2026-03-30 : RDV confirmé Inès Duprez le 2 avril`,
  },
  {
    id: 'soren-memory', name: 'soren.md', path: 'memory/soren.md', size: '0.3 Ko', lastModified: '31 mars',
    agents: ['soren'], description: 'Mémoire Soren', type: 'memories',
    content: `# Mémoire Soren — Orchestrateur COO\n\n## État du système\n- Agents actifs : 3/3 (Soren, Kai, Mia)\n- Dernier heartbeat : 31 mars 10:45\n- Pipeline ACQUISITION : 7 opportunités, €317,500\n\n## Directives en cours\n- Kai : relancer Xavier Alvarez avant 18h\n- Mia : finaliser devis façade pour Jean Dupont`,
  },
  {
    id: 'kai-memory', name: 'kai.md', path: 'memory/kai.md', size: '0.5 Ko', lastModified: '31 mars',
    agents: ['kai'], description: 'Mémoire Kai', type: 'memories',
    content: `# Mémoire Kai — Customer Success Manager\n\n## Leads en cours\n- Jean Dupont : RDV planifié, devis envoyé — attente retour\n- Xavier Alvarez : Relance prévue aujourd'hui via WhatsApp\n- Inès Duprez : RDV confirmé 2 avril 14h\n\n## Patterns détectés\n- Meilleur taux de réponse : mardi/jeudi 10h–12h\n- Canal le plus efficace : WhatsApp > Vapi > Email`,
  },
  {
    id: 'mia-memory', name: 'mia.md', path: 'memory/mia.md', size: '0.4 Ko', lastModified: '31 mars',
    agents: ['mia'], description: 'Mémoire Mia', type: 'memories',
    content: `# Mémoire Mia — Knowledge Base Manager\n\n## Documents en cours\n- Devis façade Jean Dupont : généré, envoi planifié\n- Fiche client Xavier Alvarez : créée le 29/03\n\n## Base de connaissance\n- 47 fiches clients actives\n- 12 templates de devis disponibles`,
  },
]

// ─── Markdown renderer ────────────────────────────────────────
function renderMarkdown(text: string, accentColor: string) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('# '))
      return (
        <p key={i} className="text-sm font-bold text-[#111111] mb-2">
          {line.slice(2)}
        </p>
      )
    if (line.startsWith('## '))
      return (
        <p key={i} className="text-xs font-bold text-[#374151] mt-3 mb-1 pb-0.5 border-b border-[#E5E7EB]">
          {line.slice(3)}
        </p>
      )
    if (line.startsWith('- ') || line.startsWith('* '))
      return (
        <div key={i} className="flex items-start gap-1.5 text-xs text-[#374151] leading-6">
          <span
            className="mt-2 w-1 h-1 rounded-full flex-shrink-0"
            style={{ background: accentColor }}
          />
          <span>{line.slice(2)}</span>
        </div>
      )
    if (line.trim() === '')
      return <div key={i} className="h-2" />
    return (
      <p key={i} className="text-xs text-[#374151] leading-6">
        {line}
      </p>
    )
  })
}

// ─── Agent chip ───────────────────────────────────────────────
function AgentChip({ id }: { id: AgentId }) {
  const { label, color, bg } = AGENT_META[id] ?? { label: id, color: '#9CA3AF', bg: '#9CA3AF15' }
  return (
    <span
      className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  )
}

// ─── Doc card ─────────────────────────────────────────────────
function DocCard({
  file,
  isSelected,
  onClick,
}: {
  file: KBFile
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 text-left transition-all w-full hover:shadow-sm"
      style={{
        border: isSelected ? '1.5px solid #111111' : '1px solid #E5E7EB',
      }}
    >
      <div className="font-bold text-[13px] text-[#111111] truncate">{file.name}</div>
      <div className="text-[10px] text-[#9CA3AF] mt-0.5">{file.description}</div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {file.agents.map(a => (
          <AgentChip key={a} id={a} />
        ))}
      </div>
      <div className="text-[9px] text-[#C8CBD0] mt-3">
        {file.lastModified} · {file.size}
      </div>
    </button>
  )
}

export default function KnowledgeView() {
  return <div>TODO</div>
}

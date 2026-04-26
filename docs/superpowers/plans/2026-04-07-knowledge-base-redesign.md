# Knowledge Base Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réécrire `KnowledgeView.tsx` pour remplacer le layout fichiers/éditeur VSCode-style par une interface onglets-type + grille de cartes + éditeur intégré, dans le thème visuel de l'app.

**Architecture:** Un seul composant React réécrit (`KnowledgeView.tsx`). Organisé en : types + constantes → sous-composants (AgentChip, DocCard, renderMarkdown) → composant principal avec state (activeTab, selected, content, preview, saved). Sauvegarde en localStorage identique à l'implémentation actuelle.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, lucide-react

---

## File Structure

- **Modify:** `src/components/knowledge/KnowledgeView.tsx` — réécriture complète
- **No change:** `src/app/knowledge/layout.tsx`, `src/app/knowledge/page.tsx`

---

### Task 1 : Types, constantes et données

**Files:**
- Modify: `src/components/knowledge/KnowledgeView.tsx`

- [ ] **Step 1 : Remplacer entièrement le fichier par le bloc types + constantes + données**

```tsx
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

export default function KnowledgeView() {
  return <div>TODO</div>
}
```

- [ ] **Step 2 : Vérifier que TypeScript compile sans erreur**

```bash
cd /c/Users/thoma/qos && rtk tsc --noEmit
```

Expected : 0 erreurs

- [ ] **Step 3 : Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/knowledge/KnowledgeView.tsx && rtk git commit -m "refactor(knowledge): types, constantes et données pour le redesign"
```

---

### Task 2 : Sous-composants — AgentChip, DocCard, renderMarkdown

**Files:**
- Modify: `src/components/knowledge/KnowledgeView.tsx`

- [ ] **Step 1 : Ajouter les trois sous-composants après le bloc de données, avant le `export default`**

Remplacer `export default function KnowledgeView() { return <div>TODO</div> }` par :

```tsx
// ─── Markdown renderer ────────────────────────────────────────
function renderMarkdown(text: string, accentColor: string) {
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
  const { label, color, bg } = AGENT_META[id]
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
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /c/Users/thoma/qos && rtk tsc --noEmit
```

Expected : 0 erreurs

- [ ] **Step 3 : Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/knowledge/KnowledgeView.tsx && rtk git commit -m "refactor(knowledge): sous-composants AgentChip, DocCard, renderMarkdown"
```

---

### Task 3 : Composant principal — layout, onglets, grille de cartes

**Files:**
- Modify: `src/components/knowledge/KnowledgeView.tsx`

- [ ] **Step 1 : Remplacer `export default function KnowledgeView()` par l'implémentation complète du composant principal**

```tsx
export default function KnowledgeView() {
  const [activeTab, setActiveTab] = useState<DocType>('instructions')
  const [selected, setSelected]   = useState<KBFile | null>(null)
  const [content, setContent]     = useState('')
  const [preview, setPreview]     = useState(false)
  const [saved, setSaved]         = useState(false)

  const filtered = useMemo(
    () => KB_FILES.filter(f => f.type === activeTab),
    [activeTab],
  )

  function handleSelect(file: KBFile) {
    setSelected(file)
    setPreview(false)
    setSaved(false)
    try {
      setContent(localStorage.getItem(`kb_${file.id}`) ?? file.content)
    } catch {
      setContent(file.content)
    }
  }

  function handleSave() {
    if (!selected) return
    try {
      localStorage.setItem(`kb_${selected.id}`, content)
    } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const accentColor = selected ? AGENT_META[selected.agents[0]].color : '#111111'

  return (
    <div
      className="flex flex-col bg-[#EEF0EB] px-8 py-5 overflow-hidden"
      style={{ height: 'calc(100vh - 56px)' }}
    >
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-sm font-bold text-[#111111]">Base de connaissance</h1>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">
            Instructions et mémoire de vos agents
          </p>
        </div>
        <button
          disabled
          className="text-[11px] font-bold bg-[#111111] text-white px-3 py-1.5 rounded-xl opacity-40 cursor-not-allowed"
        >
          + Nouveau
        </button>
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-2 mb-5 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setSelected(null)
            }}
            className="text-[9px] font-bold tracking-wide px-4 py-1.5 rounded-full transition-colors"
            style={
              activeTab === tab.id
                ? { background: '#111111', color: '#fff' }
                : { background: '#fff', color: '#9CA3AF', border: '1px solid #E5E7EB' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Grille de cartes ── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 mb-5 flex-shrink-0">
          {filtered.map(file => (
            <DocCard
              key={file.id}
              file={file}
              isSelected={selected?.id === file.id}
              onClick={() => handleSelect(file)}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 text-[11px] text-[#C8CBD0] mb-5 flex-shrink-0">
          Aucune configuration disponible
        </div>
      )}

      {/* ── Éditeur (placeholder) ── */}
      {selected && (
        <div className="flex-1 bg-white rounded-2xl border border-[#E5E7EB] min-h-0 flex items-center justify-center text-[11px] text-[#9CA3AF]">
          Éditeur — {selected.path}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /c/Users/thoma/qos && rtk tsc --noEmit
```

Expected : 0 erreurs

- [ ] **Step 3 : Ouvrir http://localhost:3000/knowledge dans le navigateur**

Vérifier :
- Fond `#EEF0EB`, pas de scroll de page
- En-tête "Base de connaissance" + sous-titre + bouton "+ Nouveau" grisé à droite
- 3 onglets pills : INSTRUCTIONS actif (noir), MÉMOIRES et CONFIG en blanc
- 5 cartes affichées pour l'onglet INSTRUCTIONS (SOUL.md, HEARTBEAT.md, soren/SOUL.md, kai/SOUL.md, mia/SOUL.md)
- Clic sur MÉMOIRES → 4 cartes (MEMORY.md, soren.md, kai.md, mia.md)
- Clic sur CONFIG → message "Aucune configuration disponible"
- Clic sur une carte → placeholder éditeur apparaît en bas, carte sélectionnée a une border noire

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/knowledge/KnowledgeView.tsx && rtk git commit -m "feat(knowledge): layout, onglets et grille de cartes"
```

---

### Task 4 : Zone éditeur — textarea, aperçu markdown, sauvegarde

**Files:**
- Modify: `src/components/knowledge/KnowledgeView.tsx`

- [ ] **Step 1 : Remplacer le placeholder éditeur par l'implémentation complète**

Localiser ce bloc dans `KnowledgeView`:

```tsx
      {/* ── Éditeur (placeholder) ── */}
      {selected && (
        <div className="flex-1 bg-white rounded-2xl border border-[#E5E7EB] min-h-0 flex items-center justify-center text-[11px] text-[#9CA3AF]">
          Éditeur — {selected.path}
        </div>
      )}
```

Le remplacer par :

```tsx
      {/* ── Éditeur ── */}
      {selected && (
        <div className="flex-1 bg-white rounded-2xl overflow-hidden flex flex-col border border-[#E5E7EB] min-h-0">
          {/* Header éditeur */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F6] flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#111111]">{selected.path}</span>
              <div className="flex gap-1.5">
                {selected.agents.map(a => (
                  <AgentChip key={a} id={a} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreview(p => !p)}
                className="flex items-center gap-1.5 text-[10px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={
                  preview
                    ? { background: '#111111', color: '#fff' }
                    : { background: '#F3F4F6', color: '#9CA3AF' }
                }
              >
                <Eye size={11} />
                Aperçu
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg text-white transition-colors"
                style={{ background: saved ? '#22c55e' : accentColor }}
              >
                <Save size={11} />
                {saved ? 'Sauvegardé' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          {/* Corps éditeur */}
          {preview ? (
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {renderMarkdown(content, accentColor)}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={e => {
                setContent(e.target.value)
                setSaved(false)
              }}
              className="flex-1 bg-[#FAFAF8] text-sm text-[#374151] font-mono leading-7 px-5 py-4 outline-none resize-none"
              spellCheck={false}
            />
          )}
        </div>
      )}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /c/Users/thoma/qos && rtk tsc --noEmit
```

Expected : 0 erreurs

- [ ] **Step 3 : Vérifier visuellement dans le navigateur http://localhost:3000/knowledge**

Vérifier :
- Clic sur une carte → éditeur apparaît en bas avec le chemin du fichier et les chips agents
- Le textarea est éditable, fond `#FAFAF8`, police monospace
- Bouton "Aperçu" (gris par défaut) → clic toggle → fond noir, rendu markdown visible
  - `# Titre` → texte gras `text-sm`
  - `## Section` → texte gras avec border-bottom
  - `- item` → liste avec dot coloré de la couleur accent du premier agent
- Bouton "Sauvegarder" est de la couleur accent du premier agent du fichier (ex. `#4A91A8` pour SOUL.md)
- Après clic "Sauvegarder" → bouton passe en vert pendant ~2s
- Éditer du texte, sauvegarder, rechanger de fichier puis revenir → contenu persisté (localStorage)
- Changer d'onglet → sélection réinitialisée, éditeur masqué

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/knowledge/KnowledgeView.tsx && rtk git commit -m "feat(knowledge): éditeur intégré avec toggle aperçu markdown et sauvegarde"
```

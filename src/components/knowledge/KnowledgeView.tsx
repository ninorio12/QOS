'use client'

import { useState, useEffect } from 'react'
import { Cpu, Users, Database, Globe, Save, RefreshCw, ChevronRight, Zap, Brain, Sparkles, FileText, Pencil } from 'lucide-react'

// ─── Agents ──────────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id: 'soren',
    name: 'Soren',
    role: 'COO · Orchestrateur',
    model: 'claude-haiku-4-5',
    color: '#4A91A8',
    Icon: Cpu,
    soul: `# Soren — Orchestrateur BTP

Tu es **Soren**, le COO Digital. Tu orchestres tous les agents, gères les priorités, et communiques avec le CEO via Telegram.

## Valeurs fondamentales
- Réactivité : répondre en moins de 5 minutes aux leads entrants
- Précision : devis clairs, chiffrés, sans ambiguïté
- Relation : chaque lead est traité comme un client prioritaire

## Ton de communication
- Direct et professionnel
- Adapté au secteur BTP
- Bienveillant mais orienté conversion

## Limites
- Ne pas promettre de délais sans validation humaine
- Ne pas signer de devis au-dessus de 50 000 € sans validation Thomas`,
    memory: `# Mémoire Soren

Dernière analyse : 31 mars 2026
Leads actifs : 3 (Inès Duprez, Xavier Alvarez, Didier Dubois)
Pipeline total : 101 200 €

## Décisions récentes
- 2026-03-31 : Devis façade Jean Dupont envoyé (45 000 €)
- 2026-03-30 : RDV confirmé Inès Duprez le 2 avril

## Directives actives
- Kai : relancer Xavier Alvarez avant 18h
- Mia : finaliser devis façade pour Jean Dupont`,
    skills: ['read_leads', 'send_telegram', 'delegate_kai', 'delegate_mia', 'analyze_pipeline'],
  },
  {
    id: 'kai',
    name: 'Kai',
    role: 'CSM · Customer Success',
    model: 'claude-haiku-4-5',
    color: '#1A5C38',
    Icon: Users,
    soul: `# Kai — Customer Success Manager BTP

Tu es **Kai**, le premier contact prospect. Mission : répondre < 60 secondes, qualifier avec précision, créer confiance immédiate.

## Flux de qualification
1. Réception lead → SMS de bienvenue (< 60 sec)
2. Analyse intention client
3. Questions qualification (max 4, naturelles)
4. Score → mise à jour stage CRM
5. Si score > 70 : proposer RDV + alerter Soren

## Canaux
- WhatsApp (prioritaire)
- Vapi voice calls
- Email`,
    memory: `# Mémoire Kai

## Leads en cours
- Jean Dupont : RDV planifié, devis envoyé — attente retour
- Xavier Alvarez : Relance prévue aujourd'hui via WhatsApp
- Inès Duprez : RDV confirmé 2 avril 14h

## Patterns détectés
- Meilleur taux de réponse : mardi/jeudi 10h–12h
- Canal le plus efficace : WhatsApp > Vapi > Email`,
    skills: ['send_whatsapp', 'update_opportunity', 'send_telegram', 'contact_lookup', 'book_appointment'],
  },
  {
    id: 'mia',
    name: 'Mia',
    role: 'KB · Knowledge Manager',
    model: 'gemini-2.5-flash',
    color: '#E8836A',
    Icon: Database,
    soul: `# Mia — Knowledge Base & Devis BTP

Tu es **Mia**, gestionnaire KB et devis. Tu travailles en coulisses : pré-devis précis < 5 minutes, KB à jour, archives structurées.

## Rôle principal
Tu lis le document entreprise, extrais les informations clés (tarifs, services, zones d'intervention) et les distribues à Soren et Kai.

## Responsabilités
- Pré-devis depuis templates KB BTP (< 5 min)
- Scraping et mise à jour du document entreprise
- Archivage conversations qualifiées
- Surveillance : devis sans réponse > 7 jours → alerte Kai`,
    memory: `# Mémoire Mia

## Documents en cours
- Devis façade Jean Dupont : généré, envoi planifié
- Fiche client Xavier Alvarez : créée le 29/03

## Base de connaissance
- 47 fiches clients actives
- 12 templates de devis disponibles
- Dernière synchro site web : jamais`,
    skills: ['generate_devis', 'update_kb', 'scrape_website', 'archive_document', 'notify_soren'],
  },
]

const DEFAULT_COMPANY_DOC = `# Document entreprise

## À propos
Renseignez ici les informations clés de votre entreprise. Mia lira ce document pour alimenter les autres agents.

## Services proposés
- Rénovation complète (intérieur/extérieur)
- Construction neuve
- Aménagement intérieur

## Grille tarifaire
| Prestation | Tarif HT |
|---|---|
| Rénovation façade | 80–120 €/m² |
| Peinture intérieure | 25–40 €/m² |
| Carrelage | 40–60 €/m² |

## Zones d'intervention
Hérault (34), Gard (30), Aveyron (12)

## Délais moyens
- Devis : sous 48h
- Démarrage chantier : 2–4 semaines après signature`

// ─── Skill badges ─────────────────────────────────────────────────────────────

const SKILL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  read_leads:         { label: 'Lire les leads',    icon: FileText,     color: '#3462EE' },
  send_telegram:      { label: 'Telegram',           icon: Zap,          color: '#229ED9' },
  delegate_kai:       { label: 'Déléguer → Kai',     icon: ChevronRight, color: '#1A5C38' },
  delegate_mia:       { label: 'Déléguer → Mia',     icon: ChevronRight, color: '#E8836A' },
  analyze_pipeline:   { label: 'Analyser pipeline',  icon: Brain,        color: '#8B5CF6' },
  send_whatsapp:      { label: 'WhatsApp',           icon: Zap,          color: '#25D366' },
  update_opportunity: { label: 'MAJ opportunité',    icon: RefreshCw,    color: '#F59E0B' },
  contact_lookup:     { label: 'Recherche contact',  icon: Users,        color: '#6B7280' },
  book_appointment:   { label: 'Réserver RDV',       icon: Sparkles,     color: '#EC4899' },
  generate_devis:     { label: 'Générer devis',      icon: FileText,     color: '#8B5CF6' },
  update_kb:          { label: 'MAJ base de conn.',  icon: Database,     color: '#E8836A' },
  scrape_website:     { label: 'Scraper site web',   icon: Globe,        color: '#14B8A6' },
  archive_document:   { label: 'Archiver doc',       icon: Save,         color: '#9CA3AF' },
  notify_soren:       { label: 'Notifier Soren',     icon: Zap,          color: '#4A91A8' },
}

function SkillBadge({ skill }: { skill: string }) {
  const meta = SKILL_META[skill] ?? { label: skill, icon: Zap, color: '#9CA3AF' }
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-2 bg-[#F5F6F3] rounded-xl px-3 py-2">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.color + '18' }}>
        <Icon size={12} style={{ color: meta.color }} />
      </div>
      <span className="text-xs font-medium text-[#374151]">{meta.label}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = 'soul' | 'memoire' | 'skills'
type Selection = { type: 'agent'; id: string } | { type: 'commun' }

export default function KnowledgeView() {
  const [selection, setSelection] = useState<Selection>({ type: 'agent', id: 'soren' })
  const [tab, setTab] = useState<Tab>('soul')
  const [editing, setEditing] = useState(false)
  const [contents, setContents] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(AGENTS.map(a => [a.id, { soul: a.soul, memoire: a.memory }]))
  )
  const [companyDoc, setCompanyDoc] = useState(DEFAULT_COMPANY_DOC)
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)

  // Fetch company settings to get website_url and company_doc
  useEffect(() => {
    fetch('/api/settings/company')
      .then(r => r.json())
      .then(d => {
        if (d.company?.website_url) setWebsiteUrl(d.company.website_url)
        if (d.company?.company_doc) setCompanyDoc(d.company.company_doc)
      })
  }, [])

  const agent = selection.type === 'agent' ? AGENTS.find(a => a.id === selection.id) : null

  function save() {
    if (selection.type === 'commun') {
      fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_doc: companyDoc }),
      })
    }
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function scrape() {
    setScrapeError(null)
    if (!websiteUrl) {
      setScrapeError('Ajoutez l\'URL du site dans Paramètres → Coordonnées avant de scraper.')
      return
    }
    setScraping(true)
    try {
      const res = await fetch('/api/knowledge/scrape', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setCompanyDoc(data.company_doc)
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : 'Erreur lors du scraping')
    } finally {
      setScraping(false)
    }
  }

  function selectAgent(id: string) {
    setSelection({ type: 'agent', id })
    setTab('soul')
    setEditing(false)
    setSaved(false)
    setScrapeError(null)
  }

  function selectCommun() {
    setSelection({ type: 'commun' })
    setEditing(false)
    setSaved(false)
    setScrapeError(null)
  }

  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#EEF0EB]">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 flex flex-col p-3 gap-1 border-r border-[#E5E7EB] bg-white">
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest px-2 pt-1 pb-2">Agents</p>

        {AGENTS.map(a => {
          const active = selection.type === 'agent' && selection.id === a.id
          return (
            <button
              key={a.id}
              onClick={() => selectAgent(a.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${active ? 'bg-[#F5F6F3]' : 'hover:bg-[#F9FAF8]'}`}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: a.color + '18' }}>
                <a.Icon size={15} style={{ color: a.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111111] leading-none">{a.name}</p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5 truncate">{a.role.split('·')[0].trim()}</p>
              </div>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#111111] flex-shrink-0" />}
            </button>
          )
        })}

        <div className="border-t border-[#F3F4F6] my-2" />
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest px-2 pb-1">Commun</p>

        <button
          onClick={selectCommun}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${selection.type === 'commun' ? 'bg-[#F5F6F3]' : 'hover:bg-[#F9FAF8]'}`}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#E2FF8D]/60">
            <FileText size={15} className="text-[#5C7A00]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111111] leading-none">Entreprise</p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">Tous les agents</p>
          </div>
          {selection.type === 'commun' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#111111] flex-shrink-0" />}
        </button>
      </div>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">

        {/* ── AGENT ── */}
        {agent && (
          <>
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: agent.color + '18' }}>
                  <agent.Icon size={20} style={{ color: agent.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#111111]">{agent.name}</h2>
                    <span className="text-[10px] font-mono text-[#9CA3AF] bg-[#F5F6F3] px-2 py-0.5 rounded-full">{agent.model}</span>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">{agent.role}</p>
                </div>
              </div>

              {tab !== 'skills' && (
                <div className="flex items-center gap-2">
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-[#111111] text-white hover:bg-[#333] transition-colors"
                    >
                      <Pencil size={12} />
                      Modifier
                    </button>
                  ) : (
                    <button
                      onClick={save}
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                      style={{ background: saved ? '#22c55e' : '#E2FF8D', color: '#111111' }}
                    >
                      <Save size={12} />
                      {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 flex-shrink-0">
              {([
                { id: 'soul',    label: 'Soul',    icon: Sparkles },
                { id: 'memoire', label: 'Mémoire', icon: Brain },
                { id: 'skills',  label: 'Skills',  icon: Zap },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setEditing(false) }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    tab === t.id ? 'bg-[#111111] text-white' : 'bg-white text-[#6B7280] hover:text-[#111111]'
                  }`}
                >
                  <t.icon size={12} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 bg-white rounded-2xl overflow-hidden min-h-0">
              {tab === 'skills' ? (
                <div className="h-full p-5 overflow-y-auto">
                  <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Capacités de {agent.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {agent.skills.map(s => <SkillBadge key={s} skill={s} />)}
                  </div>
                </div>
              ) : editing ? (
                <textarea
                  value={contents[agent.id]?.[tab] ?? ''}
                  onChange={e => setContents(prev => ({
                    ...prev,
                    [agent.id]: { ...prev[agent.id], [tab]: e.target.value },
                  }))}
                  className="w-full h-full bg-white text-xs text-[#374151] font-mono leading-6 p-5 outline-none resize-none border-2 border-[#E2FF8D] rounded-2xl"
                  spellCheck={false}
                  autoFocus
                />
              ) : (
                <div className="h-full p-5 overflow-y-auto">
                  <pre className="text-xs text-[#374151] font-mono leading-6 whitespace-pre-wrap">
                    {contents[agent.id]?.[tab] ?? ''}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── COMMUN ── */}
        {selection.type === 'commun' && (
          <>
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#E2FF8D]/60 flex items-center justify-center">
                  <FileText size={20} className="text-[#5C7A00]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#111111]">Document entreprise</h2>
                  <p className="text-xs text-[#9CA3AF]">Partagé avec tous les agents · Mia maintient ce document à jour</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={scrape}
                  disabled={scraping}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#9CA3AF] transition-colors disabled:opacity-50"
                >
                  <Globe size={12} className={scraping ? 'animate-spin' : ''} />
                  {scraping ? 'Scraping...' : 'Scraper le site'}
                </button>

                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-[#111111] text-white hover:bg-[#333] transition-colors"
                  >
                    <Pencil size={12} />
                    Modifier
                  </button>
                ) : (
                  <button
                    onClick={save}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                    style={{ background: saved ? '#22c55e' : '#E2FF8D', color: '#111111' }}
                  >
                    <Save size={12} />
                    {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
                  </button>
                )}
              </div>
            </div>

            {/* Warning si pas d'URL */}
            {scrapeError && (
              <div className="flex-shrink-0 flex items-center gap-2 bg-[#FFF3CD] border border-[#F59E0B]/30 rounded-xl px-4 py-2.5">
                <Globe size={13} className="text-[#F59E0B] flex-shrink-0" />
                <p className="text-xs text-[#92400E]">{scrapeError}</p>
                <button onClick={() => setScrapeError(null)} className="ml-auto text-[#92400E]/50 hover:text-[#92400E] text-lg leading-none">×</button>
              </div>
            )}

            {/* Agents qui lisent ce doc */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] text-[#9CA3AF]">Lu par</span>
              {AGENTS.map(a => (
                <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: a.color + '18', color: a.color }}>
                  <a.Icon size={10} />
                  {a.name}
                </div>
              ))}
            </div>

            {/* Editor / Viewer */}
            <div className="flex-1 bg-white rounded-2xl overflow-hidden min-h-0">
              {editing ? (
                <textarea
                  value={companyDoc}
                  onChange={e => setCompanyDoc(e.target.value)}
                  className="w-full h-full bg-white text-xs text-[#374151] font-mono leading-6 p-5 outline-none resize-none border-2 border-[#E2FF8D] rounded-2xl"
                  spellCheck={false}
                  autoFocus
                />
              ) : (
                <div className="h-full p-5 overflow-y-auto">
                  <pre className="text-xs text-[#374151] font-mono leading-6 whitespace-pre-wrap">{companyDoc}</pre>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}

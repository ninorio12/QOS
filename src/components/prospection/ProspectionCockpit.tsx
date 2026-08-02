'use client'

import { useSearchParams } from 'next/navigation'
import { configById, FUNNEL_CONFIGS, FAMILIES, BRAND_PATHS, type FunnelConfig } from '@/lib/funnelConfigs'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Modal } from '@/components/ui/Modal'
import { Target, Calendar, Eye, DollarSign, TrendingUp, Users, CalendarCheck, Phone, Trophy, Banknote, BarChart3, Megaphone, PhoneCall, Handshake, Sparkles, ArrowUpRight, X, Mail, Send, MessageSquare, Pencil, Link as LinkIcon } from 'lucide-react'

// ── Période ───────────────────────────────────────────────────────────────
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// 3 périodes fixes (plus de calendrier libre). « Depuis le début » = tous les contacts jamais acquis,
// pour réconcilier le total de leads avec la pipeline actuelle (les convertis/perdus ont quitté la pipeline).
type Preset = '7j' | '30j' | 'all'
// Icônes des étapes, référencées par nom depuis les configurations de parcours.
const STEP_ICONS = { users: Users, message: Send, chat: MessageSquare, calendar: CalendarCheck, phone: Phone, trophy: Trophy } as const

const PERIODS: { key: Preset; label: string }[] = [
  { key: '7j',  label: '7 jours' },
  { key: '30j', label: '30 jours' },
  { key: 'all', label: 'Tout' },
]
function rangeForPreset(p: Preset) {
  const to = new Date()
  if (p === 'all') return { from: '2000-01-01', to: isoDay(to) }
  const from = new Date(); from.setDate(to.getDate() - (p === '7j' ? 6 : 29))
  return { from: isoDay(from), to: isoDay(to) }
}
const TZ = -new Date().getTimezoneOffset()

// Garde la dernière valeur définie d'une query Convex pendant un refetch (changement de période) :
// évite que les cartes retombent à 0/skeleton (effet « ça saute »). Keep-previous-data.
function useKeep<T>(v: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(v)
  if (v !== undefined) ref.current = v
  return v !== undefined ? v : ref.current
}
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
const pct1 = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

// Chaque nature de taux a son icône et sa couleur (avant : tout bleu, même logo).
// La règle lit le libellé : show → œil, closing → trophée, réponse/DM → bulle,
// R2 → calendrier, conversion → tendance.
function rateStyle(label: string): { icon: Lucide; color: string } {
  const l = label.toLowerCase()
  if (/show r2/.test(l)) return { icon: Eye, color: '#0891B2' }
  if (/show/.test(l)) return { icon: Eye, color: '#7C3AED' }
  if (/closing|close/.test(l)) return { icon: Trophy, color: '#D97706' }
  if (/call/.test(l)) return { icon: PhoneCall, color: '#4F46E5' }
  if (/abonné/.test(l)) return { icon: Send, color: '#DB2777' }
  if (/réponse|conversation/.test(l)) return { icon: MessageSquare, color: '#16A34A' }
  if (/r2/.test(l)) return { icon: CalendarCheck, color: '#3462EE' }
  if (/dm/.test(l)) return { icon: Send, color: '#DB2777' }
  return { icon: TrendingUp, color: '#FF4D00' }
}

type Tone = 'bon' | 'surveillance' | 'critique' | 'vide'
const DOT: Record<Tone, string> = { bon: '#16A34A', surveillance: '#D97706', critique: '#DC2626', vide: '#9CA3AF' }
type Lucide = React.ElementType

// ── Card KPI (épurée : label + valeur + variant vs objectif, sans icône ni obj orange) ──
function KpiCard({ label, value, suffix, gap, gapOk, icon: Icon, color = '#FF4D00', info }: {
  label: string; value: string; suffix?: string; gap?: string; gapOk?: boolean; icon?: Lucide; color?: string; info?: string
}) {
  const [infoOpen, setInfoOpen] = useState(false)
  return (
    // L'icône descend EN BAS À DROITE : la carte se lit par son titre puis son
    // chiffre, l'icône n'est qu'un repère de couleur, pas un en-tête.
    <div className="relative bg-soren-card border border-soren-border/60 rounded-xl p-3 flex flex-col gap-1.5 shadow-sm">
      <span className="flex items-start justify-between gap-1 text-[12px] font-semibold tracking-wide text-soren-muted leading-tight">
        {label}
        {info && (
          <button onClick={() => setInfoOpen(v => !v)} onBlur={() => setInfoOpen(false)} aria-label="Explication"
            className="w-[15px] h-[15px] rounded-full border border-soren-border text-[9px] font-bold text-soren-subtle hover:text-soren-text flex items-center justify-center flex-shrink-0 leading-none">i</button>
        )}
      </span>
      {info && infoOpen && (
        <div className="absolute top-8 right-2 left-2 z-20 bg-soren-sidebar text-white text-[10.5px] leading-relaxed rounded-lg px-3 py-2 shadow-xl">{info}</div>
      )}
      <div className="flex-1 flex items-end justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-[17px] md:text-[19px] font-bold text-soren-text leading-none tabular-nums">{value}{suffix && <span className="text-[11px] text-soren-muted font-semibold ml-0.5">{suffix}</span>}</span>
          {gap && <span className="text-[10.5px] font-semibold leading-none whitespace-nowrap" style={{ color: gapOk ? '#059669' : '#DC2626' }}>{gap}</span>}
        </div>
        {Icon && <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg flex-shrink-0" style={{ background: color + '14', color }}><Icon size={14} strokeWidth={2.1} /></span>}
      </div>
    </div>
  )
}

function RoleCard({ title, score, rows, onExpand }: { title: string; score?: TeamScore; rows: [string, string, string?][]; onExpand?: () => void }) {
  const tone = score?.tone ?? 'vide'
  return (
    <div className="bg-soren-card border border-soren-border/60 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-soren-text">{title}</p>
          {onExpand && <button onClick={onExpand} aria-label="Voir le détail" className="text-soren-muted hover:text-soren-accent transition-colors"><ArrowUpRight size={14} /></button>}
        </div>
        {score && <ScoreRing score={score.score} color={DOT[tone]} />}
      </div>
      <div className="flex flex-col">
        {rows.map(([k, val, c], i) => (
          <div key={k} className={`flex justify-between py-2 ${i < rows.length - 1 ? 'border-b border-soren-border/60' : ''}`}>
            <span className="text-[12.5px] text-soren-muted">{k}</span>
            <span className="text-[13px] font-semibold tabular-nums" style={c ? { color: c } : { color: 'var(--text)' }}>{val}</span>
          </div>
        ))}
      </div>
      {score && (
        <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-soren-border/60">
          <Sparkles size={12} className="flex-shrink-0 mt-0.5" style={{ color: DOT[tone] }} />
          <p className="text-[10.5px] leading-relaxed text-soren-muted">{score.diagnostic}</p>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ─────────────────────────────────────────────────────
export default function ProspectionCockpit() {
  const [preset, setPreset] = useState<Preset>('30j')
  const range = rangeForPreset(preset)
  const qa = { from: range.from, to: range.to, tzOffset: TZ }

  // Configuration du parcours : le squelette ne change pas, seuls les noms suivent.
  const searchParams = useSearchParams()
  const [cfgId, setCfgId] = useState(() => searchParams?.get('funnel') ?? 'vsl')
  const cfg = configById(cfgId)
  const pickConfig = (id: string) => {
    setCfgId(id)
    const url = new URL(window.location.href)
    if (id === 'vsl') url.searchParams.delete('funnel'); else url.searchParams.set('funnel', id)
    window.history.replaceState(null, '', url.toString())
  }

  // Chaque onglet filtre sa propre cohorte : VSL = inbound sans autre étiquette,
  // Quiz/LinkedIn/Instagram = leur étiquette, Emailing = source outbound.
  // Le MÊME parcours scope l'entonnoir, le setting (événements des leads de la
  // cohorte), le media buying (campagnes rattachées) et les scores des cartes.
  const FILTERED_FUNNELS = ['vsl', 'quizz', 'linkedin', 'instagram', 'emailing']
  const serverFunnel = FILTERED_FUNNELS.includes(cfgId) ? (cfgId === 'quizz' ? 'quiz' : cfgId) : undefined

  const obj     = useQuery(api.prospectionObjectives.get, { funnel: cfgId }) as Obj | undefined
  const scorecards = useKeep(useQuery(api.prospectionCockpit.teamScorecards, { ...qa, funnel: serverFunnel }) as Scorecards | undefined)
  const outbound = useKeep(useQuery(api.outboundEmailing.summary, qa) as OutboundSum | undefined)
  const outboundList = useQuery(api.outboundLeads.list, {}) as OutboundLead[] | undefined
  const setObj  = useMutation(api.prospectionObjectives.set)

  // Le trait sous l'onglet actif glisse : on mesure la position du bouton courant.
  const famRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [ind, setInd] = useState({ left: 0, width: 0 })
  useEffect(() => {
    const el = famRefs.current[cfg.family]
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth })
  }, [cfg.family])

  const funnelRaw = useQuery(api.performance.funnel, serverFunnel ? { ...qa, funnel: serverFunnel } : qa) as Funnel | undefined
  const funnel  = useKeep(funnelRaw)
  // En cours de rechargement (on a déjà d'anciennes données) → léger fondu, pas de saut.
  const refreshing = funnelRaw === undefined && funnel !== undefined
  const summary = useKeep(useQuery(api.performance.summary, serverFunnel ? { ...qa, funnel: serverFunnel } : qa) as Summary | undefined)
  const media   = useKeep(useQuery(api.mediaBuyer.dashboard, { from: range.from, to: range.to, level: 'adset', funnel: serverFunnel }) as Media | undefined)
  const pay     = useKeep(useQuery(api.paiement.overview, { from: range.from, to: range.to, tzOffset: TZ }) as Pay | undefined)
  // Compte social du parcours Profil (photo, nom, abonnés) : lu dans le cache
  // os_social_profiles, rafraîchi par cron. Non connecté = état honnête.
  const social = useKeep(useQuery(api.socialProfileCache.get,
    cfg.family === 'social' ? { platform: cfg.id } : 'skip') as SocialInfo | null | undefined) ?? null

  const [objOpen, setObjOpen] = useState(false)
  const [objScope, setObjScope] = useState<'commerciale' | 'globale' | 'all'>('all')
  const [repliesOpen, setRepliesOpen] = useState(false)

  // ── Dérivations ──
  const spend = media?.kpis?.spend?.value ?? 0
  // Encaissé DU PARCOURS : paiements des contacts de la cohorte (décision
  // Jonathan 2026-08-02). Sans parcours filtré : le global (paiement.overview).
  const ca    = (serverFunnel ? funnel?.encaisse : undefined) ?? pay?.encaisse ?? 0
  // Levier « vide » = score N/A (null) côté back → on neutralise le vert trompeur et on affiche N/A sur ses taux.
  const pubEmpty   = (scorecards?.publicite?.score ?? null) === null
  const setEmpty   = (scorecards?.setters?.score ?? null) === null
  const closeEmpty = (scorecards?.closers?.score ?? null) === null
  const o = obj ?? { leadsR1: 50, leadsR2: 25, tauxShow: 75, tauxShowR2: 75, tauxClose: 30, tauxReponse: 30, cpl: 30, ca: 30000, roi: 5, coutParVente: 500, ventes: 30, cashContracte: 30000, panierMoyen: 2000 }
  const f = funnel ?? { leadsATraiter: 0, leadsTotal: 0, leadsInbound: 0, leadsOutbound: 0, r1Booked: 0, noShows: 0, shows: 0, ventes: 0, tauxLeadsR1: 0, tauxShow: 0, tauxClose: 0, r2Booked: 0, showsR1: 0, showsR2: 0, noShowsR1: 0, noShowsR2: 0, tauxShowR1: 0, tauxShowR2: 0, tauxR1R2: 0, tauxLeadsR2: 0, tauxR1ToR2: 0, encaisse: 0, rdvDirects: null }
  const ptsGap = (val: number, target: number) => `${val >= target ? '▲' : '▼'} ${pct1(Math.abs(val - target))}%`
  const pctGap = (val: number, target: number) => `${val >= target ? '▲' : '▼'} ${target > 0 ? Math.round(val / target * 100) : 0}%`
  const stepColor = (val: number, target: number) => val >= target ? '#16A34A' : val >= target * 0.8 ? '#D97706' : '#DC2626'
  // « Leads » (haut du funnel) = TOUS les leads actifs du Data OS, tous canaux (inbound + outbound). (déf. Thomas 2026-06-22)
  // 100% Data OS : on ne compte JAMAIS une source externe (Meta) ni un Google Sheet — uniquement crm_leads.
  const leadsATraiterTotal = f.leadsTotal ?? 0

  // Toutes les valeurs du parcours à plat : les étapes, les taux et les cartes
  // de rôles y puisent. `abonnes` reste null tant que personne ne l'enregistre :
  // le cockpit affiche N/A plutôt qu'un nombre emprunté à une autre étape.
  const D: Record<string, number | null> = {
    leads: leadsATraiterTotal,
    contactes: summary?.contactes ?? 0,
    reponses: summary?.reponses ?? 0,
    r1: f.r1Booked, showsR1: f.showsR1, noShowsR1: f.noShowsR1,
    r2: f.r2Booked, showsR2: f.showsR2, noShowsR2: f.noShowsR2,
    ventes: f.ventes,
    // Abonnés = gagnés sur la période (insights Meta, fenêtre max 30 j). Sans compte : N/A.
    abonnes: cfg.family === 'social' ? ((preset === '7j' ? social?.gained7 : social?.gained30) ?? null) : null,
    abonnesOrganiques: null, coutParAbonne: null,
    spend, impressions: media?.kpis?.impressions?.value ?? 0, clicks: media?.kpis?.clicks?.value ?? 0,
    metaLeads: media?.kpis?.leads?.value ?? 0, cpl: media?.kpis?.cpl?.value ?? 0,
    tauxReponse: summary?.tauxReponse ?? 0, conversionR1: summary?.conversionR1 ?? 0,
    tauxClose: f.tauxClose,
    // Outbound : « Leads sourcés » = le total de la cohorte outbound (décision
    // Jonathan 2026-08-02), pas le fichier de sourcing. RDV directs = bookés
    // seuls via le deck, calculés côté serveur.
    sources: cfg.id === 'emailing' ? leadsATraiterTotal : (outbound?.sourced ?? 0),
    decks: outbound?.decks ?? 0,
    envois: outbound?.envois ?? 0, reponsesOut: outbound?.reponses ?? 0,
    tauxReponseOut: outbound?.tauxReponse ?? 0,
    rdvDirects: f.rdvDirects ?? null,
  }
  // Taux de réponse par mail = RDV directs ÷ leads sourcés.
  D.tauxReponseMail = D.sources && D.rdvDirects != null ? Math.round((D.rdvDirects / D.sources) * 1000) / 10 : null
  // Un taux se recalcule à partir des deux étapes qu'il relie : si l'une manque, il manque aussi.
  const rateOf = (from: string, to: string): number | null => {
    const a = D[from], b = D[to]
    if (a == null || b == null || a === 0) return null
    return Math.round((b / a) * 1000) / 10
  }
  // Format d'une ligne de carte de rôle : monnaie, pourcentage ou nombre.
  const roleValue = (key: string): string => {
    const val = D[key]
    if (val == null) return 'N/A'
    if (key === 'spend' || key === 'cpl' || key === 'coutParAbonne') return `${fmt(val)} CHF`
    if (key.startsWith('taux') || key === 'conversionR1') return `${pct1(val)}%`
    return fmt(val)
  }
  const tauxLeadsR1Total = leadsATraiterTotal > 0 ? Math.round((f.r1Booked / leadsATraiterTotal) * 1000) / 10 : 0

  return (
    <div className="flex-1 overflow-y-auto bg-soren-app px-6 py-6">
      <div className="max-w-[1180px] mx-auto">

        {/* ===== Performance (fusionné) ===== */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
          <h2 className="text-[15px] font-bold tracking-tight text-soren-text">Performance Équipe</h2>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 bg-soren-card border border-soren-border rounded-full p-0.5">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPreset(p.key)}
                  className={`text-[11.5px] font-semibold px-3 py-1 rounded-full transition-colors ${preset === p.key ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:text-soren-text'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setObjScope('all'); setObjOpen(true) }} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white bg-[#FF4D00] px-3 py-1.5 rounded-full shadow-sm"><Target size={12} /> Objectif</button>
          </div>
        </div>

        {/* Deux étages : la famille en onglets soulignés, le détail en pastilles.
            Le trait glisse d'un onglet à l'autre, la rangée de pastilles se déplie. */}
        <div className="relative flex items-center gap-6 flex-wrap border-b border-soren-border/60">
          {FAMILIES.map((fam) => {
            const active = cfg.family === fam.id
            return (
              <button key={fam.id} ref={(el) => { famRefs.current[fam.id] = el }}
                onClick={() => pickConfig(fam.defaultConfig)}
                className={`text-[12.5px] pb-2.5 transition-colors duration-200 ${
                  active ? 'font-bold text-soren-text' : 'font-medium text-soren-subtle hover:text-soren-muted'
                }`}>
                {fam.label}
              </button>
            )
          })}
          <span
            className="absolute bottom-[-1px] h-[2px] bg-soren-text rounded-full transition-all duration-300 ease-out"
            style={{ left: ind.left, width: ind.width, opacity: ind.width ? 1 : 0 }}
          />
        </div>

        <div className={`overflow-hidden transition-all duration-300 ease-out ${
          FUNNEL_CONFIGS.filter((c) => c.family === cfg.family).length > 1 ? 'max-h-16 opacity-100 mt-3 mb-4' : 'max-h-0 opacity-0 mt-0 mb-4'
        }`}>
          <div className="flex items-center gap-1.5">
            {FUNNEL_CONFIGS.filter((c) => c.family === cfg.family).map((c) => {
              const on = c.id === cfg.id
              return (
                <button key={c.id} onClick={() => pickConfig(c.id)} title={c.tagline}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-all duration-200 ease-out ${
                    on
                      ? 'bg-soren-sidebar text-white border-transparent shadow-sm'
                      : 'bg-soren-elevated text-soren-muted border-soren-border hover:text-soren-text hover:border-soren-border'
                  }`}>
                  {c.brand && (
                    <svg width="11" height="11" viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden="true">
                      <path fill="currentColor" d={BRAND_PATHS[c.brand].d} />
                    </svg>
                  )}
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Ligne 1 : Funnel (grand) + 6 cards 2×2 */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 items-stretch transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          <div className="lg:col-span-7 bg-soren-card border border-soren-border/60 rounded-2xl p-3.5 shadow-sm flex flex-col">
            <h3 className="text-[10.5px] uppercase tracking-wide text-soren-muted font-semibold mb-2">Funnel de conversion</h3>
            <div className="flex flex-col items-center gap-0 flex-1 justify-center">
              {cfg.steps.map((st, i) => {
                const rate = i > 0 ? cfg.rates.find(r => r.to === st.key) : null
                const target = rate ? (o[rate.obj] as number) : 0
                const val = rateOf(rate?.from ?? '', st.key)
                const w = 100 - i * (58 / Math.max(1, cfg.steps.length - 1))
                return (
                  <div key={st.key} className="w-full flex flex-col items-center">
                    {rate && <FunnelConv pct={val ?? 0} note={rate.label} ok={(val ?? 0) >= target} />}
                    <FunnelStep
                      Icon={STEP_ICONS[st.icon]} label={st.label}
                      val={D[st.key] ?? 0} w={w}
                      color={D[st.key] == null ? '#9CA3AF' : rate ? stepColor(val ?? 0, target) : '#6B7280'}
                      sub={D[st.key] == null
                        ? <span className="text-soren-subtle">Pas encore mesuré</span>
                        : undefined}
                    />
                  </div>
                )
              })}
              <div className="mt-3 text-center text-[11px] text-soren-subtle">Résultat : <span className="font-bold text-soren-text">{fmt(ca)}</span> <span className="text-[9px] text-soren-muted font-semibold">CHF</span></div>
            </div>
          </div>
          <div className="lg:col-span-5 flex flex-col gap-2">
            {/* Parcours Profil : le compte social connecté (photo + nom + abonnés). */}
            {cfg.family === 'social' && <SocialConnectCard info={social} label={cfg.label} brand={cfg.brand} />}
            {/* Zone du lien de redirection : la page qui reçoit le trafic de ce parcours. */}
            <FunnelLink
              url={(obj as unknown as { link?: string | null } | undefined)?.link ?? null}
              label={cfg.label}
              onSave={(url) => void setObj({ funnel: cfgId, link: url })}
            />
            <div className="grid grid-cols-2 auto-rows-fr gap-2 flex-1">
            {cfg.rates.filter((r) => r.card !== false).map((r) => {
              const val = rateOf(r.from, r.to)
              const target = o[r.obj] as number
              const st = rateStyle(r.label)
              return (
                <KpiCard key={r.label} label={r.label}
                  value={val == null ? 'N/A' : pct1(val)} suffix={val == null ? undefined : '%'}
                  gap={val == null ? '—' : ptsGap(val, target)} gapOk={(val ?? 0) >= target}
                  icon={st.icon} color={st.color} info={r.info} />
              )
            })}
            <KpiCard label="Encaissé" value={fmt(ca)} suffix="CHF" gap={pctGap(ca, o.ca)} gapOk={ca >= o.ca} icon={Banknote} color="#16A34A" />
            </div>
          </div>
        </div>

        {/* Ligne 2 : métiers (anneau de score + diagnostic) */}
        {/* La grille suit le NOMBRE de cartes du parcours : deux en outbound
            (Emailing + Closing), trois ailleurs. Sinon une colonne reste vide. */}
        <div className={`grid md:grid-cols-2 gap-4 mb-5 ${cfg.roles.setting ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
          <RoleCard title={cfg.roles.media.title}
            score={cfg.family === 'outbound'
              ? (outbound ? { score: outbound.score, tone: outbound.tone, diagnostic: outbound.diagnostic, charge: null, metrics: [] } : undefined)
              : scorecards?.publicite}
            onExpand={cfg.family === 'outbound' ? () => setRepliesOpen(true) : undefined}
            rows={cfg.roles.media.rows.map(r => [r.label, pubEmpty && (r.key === 'cpl' || r.key === 'coutParAbonne') ? 'N/A' : roleValue(r.key)] as [string, string])} />
          {cfg.roles.setting && (
          <RoleCard title={cfg.roles.setting.title} score={scorecards?.setters}
            rows={cfg.roles.setting.rows.map(r => [r.label, setEmpty && r.key.startsWith('taux') ? 'N/A' : roleValue(r.key)] as [string, string])} />
          )}
          <RoleCard title={cfg.roles.closing.title} score={scorecards?.closers}
            rows={cfg.roles.closing.rows.map(r => [r.label, closeEmpty && r.key.startsWith('taux') ? 'N/A' : roleValue(r.key)] as [string, string])} />
        </div>


      </div>

      {objOpen && <ObjModal obj={o} cfg={cfg} onClose={() => setObjOpen(false)} onSave={async (vals) => { await setObj({ ...vals, funnel: cfgId }); setObjOpen(false) }} />}

      {repliesOpen && (
        <Modal onClose={() => setRepliesOpen(false)}>
          <div className="relative bg-soren-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-soren-border flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-soren-text flex items-center gap-2"><Mail size={16} style={{ color: '#16A34A' }} /> Suivi des réponses outbound</h2>
                <p className="text-xs text-soren-subtle mt-0.5">{outbound?.envois ?? 0} email(s) envoyé(s) · {outbound?.reponses ?? 0} réponse(s) · {outbound?.tauxReponse ?? 0}% de réponse</p>
              </div>
              <button onClick={() => setRepliesOpen(false)} aria-label="Fermer" className="w-8 h-8 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-soren-border transition-colors"><X size={14} className="text-soren-muted" /></button>
            </div>
            <div className="overflow-y-auto px-2 py-2">
              {(() => {
                const sent = (outboundList ?? []).filter(l => ['email_envoye', 'relance', 'importe'].includes(l.etape))
                  .sort((a, b) => (b.repondu_le ?? '').localeCompare(a.repondu_le ?? ''))
                if (sent.length === 0) return <p className="text-center text-[13px] text-soren-subtle py-10">Aucun email envoyé pour l&apos;instant.</p>
                return (
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-[10px] uppercase tracking-wide text-soren-subtle">
                      <th className="text-left font-semibold px-3 py-2">Contact</th>
                      <th className="text-left font-semibold px-3 py-2">Email</th>
                      <th className="text-left font-semibold px-3 py-2">Réponse</th>
                    </tr></thead>
                    <tbody>
                      {sent.map(l => (
                        <tr key={l.id} className="border-t border-soren-border/60">
                          <td className="px-3 py-2"><span className="font-semibold text-soren-text">{[l.firstName, l.lastName].filter(Boolean).join(' ') || '—'}</span>{l.company && <span className="text-soren-subtle"> · {l.company}</span>}</td>
                          <td className="px-3 py-2 text-soren-muted">{l.email ?? '—'}</td>
                          <td className="px-3 py-2">
                            {l.repondu_le
                              ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Répondu · {new Date(l.repondu_le).toLocaleDateString('fr-FR')}</span>
                              : <span className="text-[11px] text-soren-subtle">En attente</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Sous-composants ─────────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 42 }: { score: number | null; color: string; size?: number }) {
  const sw = size >= 60 ? 6 : 4
  const c = size / 2, r = c - sw / 2 - 1, circ = 2 * Math.PI * r
  const na = score === null || score === undefined
  const off = circ * (1 - Math.max(0, Math.min(100, na ? 0 : score)) / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-soren-elevated" />
      {!na && <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${c} ${c})`} style={{ transition: 'stroke-dashoffset .6s ease' }} />}
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize={size * (na ? 0.24 : 0.3)} fontWeight="700" fill={color}>{na ? 'N/A' : Math.round(score)}</text>
    </svg>
  )
}
function TeamCard({ name, color, card }: { name: string; color: string; card?: TeamScore }) {
  const tone = card?.tone ?? 'vide'
  return (
    <div className="bg-soren-card border border-soren-border/60 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-soren-text">{name}</p>
        <ScoreRing score={card?.score ?? null} color={DOT[tone]} />
      </div>
      <div className="flex flex-col gap-1.5">
        {(card?.metrics ?? []).map(mt => (
          <div key={mt.label} className="flex items-center justify-between text-[11.5px]">
            <span className="text-soren-muted">{mt.label}</span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold tabular-nums text-soren-text">{mt.value}</span>
              {mt.delta && <span className="text-[9.5px] font-semibold" style={{ color: mt.deltaGood ? '#059669' : '#DC2626' }}>{mt.delta}</span>}
            </span>
          </div>
        ))}
      </div>
      {card?.charge != null && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-soren-subtle">
          <span>Charge obj.</span>
          <span className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < Math.round((card.charge ?? 0) * 5) ? color : '#D1D5DB' }} />)}
          </span>
        </div>
      )}
      <p className="text-[10.5px] mt-2 pt-2 border-t border-soren-border/60 font-medium" style={{ color: DOT[tone] }}>→ {card?.diagnostic ?? '…'}</p>
    </div>
  )
}
// Compte social du parcours Profil : photo, nom, @, abonnés (comme Brvndlab
// Analytics). Non connecté : invite à connecter, aucun chiffre inventé.
type SocialInfo = { connected: boolean; platform: string; username?: string | null; displayName?: string | null; profilePicture?: string | null; profileUrl?: string | null; followersCount?: number | null; gained7?: number | null; gained30?: number | null }
function SocialConnectCard({ info, label, brand }: { info: SocialInfo | null; label: string; brand?: 'linkedin' | 'instagram' }) {
  const path = brand ? BRAND_PATHS[brand] : null
  if (!info || !info.connected) {
    return (
      <div className="flex items-center gap-2.5 bg-soren-card border border-dashed border-soren-border rounded-xl px-3 py-2.5">
        {path && (
          <span className="w-8 h-8 rounded-full bg-soren-elevated border border-soren-border flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill={path.color} d={path.d} /></svg>
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-soren-text">Compte {label} non connecté</p>
          <p className="text-[10.5px] text-soren-subtle">
            {brand === 'linkedin' ? 'Connexion via l’API LinkedIn à venir' : 'Connecter le compte dans Zernio pour afficher photo, nom et abonnés'}
          </p>
        </div>
      </div>
    )
  }
  return (
    <a href={info.profileUrl ?? undefined} target="_blank" rel="noreferrer"
      className="flex items-center gap-2.5 bg-soren-card border border-soren-border/60 rounded-xl px-3 py-2.5 shadow-sm hover:border-soren-border transition-colors">
      {info.profilePicture
        ? <img src={info.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-soren-border" />
        : path && <span className="w-9 h-9 rounded-full bg-soren-elevated flex items-center justify-center flex-shrink-0"><svg width="16" height="16" viewBox="0 0 24 24"><path fill={path.color} d={path.d} /></svg></span>}
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-soren-text truncate">{info.displayName ?? info.username}</p>
        <p className="text-[10.5px] text-soren-subtle truncate">@{info.username}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[14px] font-bold tabular-nums text-soren-text leading-none">{info.followersCount != null ? fmt(info.followersCount) : 'N/A'}</p>
        <p className="text-[9.5px] text-soren-subtle mt-0.5">{brand === 'linkedin' ? 'connexions' : 'abonnés'}</p>
      </div>
      {path && <svg width="13" height="13" viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden="true"><path fill={path.color} d={path.d} /></svg>}
    </a>
  )
}

// Lien de redirection du parcours : la page qui reçoit le trafic (quiz, VSL…).
// Cliquer l'ouvre, le crayon permet de le coller ou de le corriger.
function FunnelLink({ url, label, onSave }: { url: string | null; label: string; onSave: (url: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(url ?? '')
  useEffect(() => { setDraft(url ?? '') }, [url])

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 bg-soren-card border border-soren-border rounded-xl px-2.5 py-2">
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onSave(draft.trim()); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
          placeholder="https://…"
          className="flex-1 min-w-0 text-[11.5px] bg-transparent text-soren-text outline-none" />
        <button onClick={() => { onSave(draft.trim()); setEditing(false) }} className="text-[11px] font-semibold text-soren-accent flex-shrink-0">Enregistrer</button>
      </div>
    )
  }
  if (!url) {
    return (
      <button onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-[11px] text-soren-subtle hover:text-soren-muted border border-dashed border-soren-border rounded-xl px-2.5 py-2 transition-colors">
        <LinkIcon size={11} /> Ajouter le lien de redirection du parcours {label}
      </button>
    )
  }
  return (
    <div className="group flex items-center gap-2 bg-soren-card border border-soren-border rounded-xl px-2.5 py-2">
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 flex-1">
        <span className="w-5 h-5 rounded-md bg-soren-elevated border border-soren-border flex items-center justify-center flex-shrink-0">
          <ArrowUpRight size={11} className="text-soren-accent" />
        </span>
        <span className="text-[11.5px] text-soren-muted truncate group-hover:text-soren-text transition-colors">{url.replace(/^https?:\/\//, '')}</span>
      </a>
      <button onClick={() => setEditing(true)} title="Modifier le lien"
        className="text-soren-subtle hover:text-soren-text opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Pencil size={11} />
      </button>
    </div>
  )
}

function FunnelStep({ Icon, label, val, w, color, sub, subTitle }: { Icon: Lucide; label: string; val: number; w: number; color: string; sub?: ReactNode; subTitle?: string }) {
  return (
    <div className="rounded-xl flex items-center justify-between px-3 py-1.5 border" style={{ width: `${w}%`, background: color + '0d', borderColor: color + '33' }}>
      <span className="flex items-center gap-2 text-[11px] font-medium text-soren-text">
        <Icon size={13} style={{ color }} />
        <span className="flex flex-col leading-tight">
          <span>{label}</span>
          {sub && <span className="text-[9px] font-normal text-soren-subtle" title={subTitle}>{sub}</span>}
        </span>
      </span>
      <span className="text-[14px] font-bold tabular-nums" style={{ color }}>{fmt(val)}</span>
    </div>
  )
}
function FunnelConv({ pct, note, ok }: { pct: number; note: string; ok: boolean }) {
  const c = ok ? '#059669' : '#D97706'
  return <div className="flex items-center gap-1.5 py-0.5"><span style={{ color: c, fontSize: 10 }}>{ok ? '▲' : '▼'}</span><span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full" style={{ color: c, background: c + '14' }}>{pct1(pct)}%</span><span className="text-[10px] text-soren-subtle">{note}</span></div>
}
function SalesKpi({ label, value, dot }: { label: string; value: string; dot: string }) {
  const isChf = value.endsWith(' CHF')
  const num = isChf ? value.slice(0, -4) : value
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
        <p className="text-[10px] font-medium text-soren-muted uppercase tracking-wide leading-none truncate">{label}</p>
      </div>
      <p className="flex items-baseline gap-1 leading-none">
        <span className="text-[15px] font-bold tabular-nums text-soren-text">{num}</span>
        {isChf && <span className="text-[10px] font-semibold text-soren-muted">CHF</span>}
      </p>
    </div>
  )
}
function FinCard({ label, Icon, color, value, obj, ok, gap, unit }: { label: string; Icon: Lucide; color: string; value: string; obj: string; ok: boolean; gap: string; unit?: string }) {
  return (
    <div className="rounded-2xl p-4 pb-5 border relative shadow-sm" style={{ background: color + '0d', borderColor: color + '26' }}>
      <div className="flex items-start justify-between mb-1"><span className="text-[10px] font-bold tracking-wide" style={{ color }}>{label}</span><span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '18', color }}><Icon size={13} /></span></div>
      <div className="flex items-baseline gap-1.5"><p className="text-[20px] font-bold tabular-nums text-soren-text">{value}</p><span className="text-[9px] font-semibold" style={{ color: ok ? '#059669' : '#DC2626' }}>{gap}</span></div>
      {unit && <p className="text-[11px] text-soren-subtle mt-0.5">{unit}</p>}
      <span className="absolute bottom-2 right-3 text-[9px] font-semibold flex items-center gap-0.5" style={{ color: '#FF4D00' }}><Target size={9} />{obj}</span>
    </div>
  )
}

type Obj = { leadsR1: number; leadsR2: number; tauxShow: number; tauxShowR2: number; tauxClose: number; tauxReponse: number; cpl: number; ca: number; roi: number; coutParVente: number; ventes: number; cashContracte: number; panierMoyen: number }
function ObjModal({ obj, cfg, onClose, onSave }: { obj: Obj; cfg: FunnelConfig; onClose: () => void; onSave: (v: Partial<Obj>) => void }) {
  const [v, setV] = useState<Obj>(obj)
  const field = (key: keyof Obj, label: string, unit: string) => (
    <div key={key}><p className="text-[11px] text-soren-muted mb-1">{label} ({unit})</p>
      <input value={v[key]} inputMode="decimal" onChange={e => setV({ ...v, [key]: parseFloat(e.target.value.replace(',', '.').replace(/[^\d.]/g, '')) || 0 })}
        className="w-full bg-soren-elevated border border-soren-border rounded-lg px-3 py-2 text-[14px] font-semibold tabular-nums text-soren-text outline-none focus:border-[#FF4D00]" /></div>
  )
  return (
    <Modal onClose={onClose}>
      <div className="relative bg-soren-card rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[88vh] overflow-y-auto p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-7 h-7 rounded-lg bg-[#FF4D00]/10 flex items-center justify-center"><Target size={15} className="text-[#FF4D00]" /></span>
          <p className="text-[15px] font-bold text-soren-text">Mes objectifs · {cfg.label}</p>
        </div>
        <p className="text-[11px] text-soren-subtle mb-4">Définit les seuils vert, orange et rouge de ce parcours.</p>
        <div className="grid grid-cols-2 gap-3">
          {cfg.objectives.map(ob => field(ob.key as keyof Obj, ob.label, ob.unit))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-[13px] font-semibold text-soren-muted border border-soren-border rounded-xl px-4 py-2 hover:bg-soren-elevated">Annuler</button>
          <button
            onClick={() => {
              // On ne renvoie que les objectifs affichés : renvoyer l'objet entier
              // faisait remonter des champs que le serveur refuse (le lien, notamment)
              // et l'enregistrement échouait sans rien dire.
              const only = Object.fromEntries(cfg.objectives.map(ob => [ob.key, v[ob.key as keyof Obj]])) as Partial<Obj>
              onSave(only)
            }}
            className="text-[13px] font-semibold text-white bg-[#FF4D00] rounded-xl px-4 py-2 shadow-sm">Appliquer →</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Types des queries ───────────────────────────────────────────────────────
type Funnel = { leadsATraiter: number; leadsTotal: number; leadsInbound: number; leadsOutbound: number; r1Booked: number; noShows: number; shows: number; ventes: number; tauxLeadsR1: number; tauxShow: number; tauxClose: number; r2Booked: number; showsR1: number; showsR2: number; noShowsR1: number; noShowsR2: number; tauxShowR1: number; tauxShowR2: number; tauxR1R2: number; tauxLeadsR2: number; tauxR1ToR2: number; encaisse: number; rdvDirects: number | null }
type Summary = { contactes: number; reponses: number; tauxReponse: number; r1Booked: number; conversionR1: number }
type Media = { kpis?: { spend?: { value: number }; impressions?: { value: number }; clicks?: { value: number }; leads?: { value: number }; cpl?: { value: number } } }
type Pay = { encaisse: number; attente: number; enRetard: number; caTotal: number; clientsCount: number; transactions?: { contactId: string; type: string; status: string }[] }
type Health = { score: number; ev7: number | null; ev30: number | null }
type TeamMetric = { label: string; value: string; delta: string | null; deltaGood: boolean }
type TeamScore = { score: number | null; tone: Tone; charge: number | null; metrics: TeamMetric[]; diagnostic: string }
type Scorecards = { setters: TeamScore; closers: TeamScore; publicite: TeamScore }
type OutboundSum = { sourced: number; validated: number; decks: number; envois: number; reponses: number; aCorriger: number; rejetes: number; r1: number; tauxValideEnvoi: number; tauxReponse: number; score: number | null; tone: Tone; diagnostic: string }
type OutboundLead = { id: string; firstName: string; lastName: string | null; email: string | null; company: string | null; etape: string; repondu_le: string | null; lastActivity: string }

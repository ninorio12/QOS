import { v } from "convex/values"
import { query } from "./_generated/server"
import { localDay } from "./timeLib"
import { reconcileMoney } from "./moneyReconciliation"

const COLORS = ['#FF4D00','#3462EE','#22c55e','#EFE347','#4A91A8','#EC4899','#8896AB','#F97316']

// KPI à zéro — renvoyé tel quel à un compte qui n'a pas le module /dashboard (les
// métriques exposent CA/leads → sensibles). Aucune donnée métier n'est divulguée.
const EMPTY_METRICS = {
  clientsCount: 0, caEncaisse: 0, caACollecter: 0, rembourse: 0, leadsCount: 0, r1Count: 0, r2Count: 0,
  metiersCount: 0, nichesCount: 0,
  clientTimeline: [] as { date: string; value: number; ca: number }[],
  metierBreakdown: [] as never[], nicheBreakdown: [] as never[], recentLeads: [] as never[],
  totalContactsCount: 0,
}

export const getMetrics = query({
  // clerkUserId : résout le rôle/les modules côté serveur (même pattern que processes.list).
  // - admin OU aucun clerkUserId (appel serveur-à-serveur de confiance) → accès complet.
  // - compte restreint sans /dashboard dans allowedModules → KPI vides (données protégées).
  args: { from: v.string(), to: v.string(), tzOffset: v.optional(v.number()), cumulative: v.optional(v.boolean()), cumulativeTimeline: v.optional(v.boolean()), clerkUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { from, to, clerkUserId } = args

    // ─── Autorisation par module ────────────────────────────────
    let role: string | null = null
    let allowedModules: string[] | undefined
    if (clerkUserId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk", (q) => q.eq("clerkUserId", clerkUserId))
        .unique()
      role = user?.role ?? null
      allowedModules = user?.allowedModules
    }
    const isAdmin = role === "admin" || !clerkUserId
    // allowedModules ABSENT/non-tableau = ligne héritée sans restriction. Un tableau (même
    // vide) = liste blanche exhaustive (cf. ModuleGuard).
    const restricted = Array.isArray(allowedModules)
    if (!isAdmin && restricted && !allowedModules!.includes('/dashboard')) {
      return EMPTY_METRICS
    }
    const dateOf = (isoOrDate: string) => localDay(isoOrDate, args.tzOffset)
    // Modèle (Thomas 2026-06-21) : les CARTES Clients/Leads = total ACTUEL (cohérent avec le clic) ;
    // le calendrier [from,to] pilote l'ARGENT (encaissé/à collecter) et le GRAPHIQUE « clients sur la période ».
    void args.cumulative // l'ancien flag démo n'a plus d'effet

    // ─── Source of truth: contacts ──────────────────────────────
    const allContacts = await ctx.db.query("crm_contacts").collect()
    const contactById = new Map(allContacts.map(c => [c._id.toString(), c]))
    // statut lookup: crm_contacts._id(string) → statut
    const contactStatut = new Map(allContacts.map(c => [c._id.toString(), c.statut]))

    // ─── Clients = pipeline_clients whose linked contact has statut='client'
    //     AND the client was created within [from,to] (intersection + flux) ──
    const allClients   = await ctx.db.query("pipeline_clients").collect()
    // Clé de jointure : contactId (Convex, source unique) avec repli sur ghl_contact_id
    // le temps de la migration Vague 2. Les deux valeurs sont identiques après backfill.
    // periodClients = clients créés DANS la fenêtre → alimente UNIQUEMENT le graphique « Clients sur la période ».
    const periodClients = allClients.filter(c => {
      const key = c.contactId ?? c.ghl_contact_id
      return key != null &&
        contactStatut.get(key) === 'client' &&
        dateOf(c.createdAt) >= from && dateOf(c.createdAt) <= to
    })
    // currentClients = TOTAL ACTUEL de clients (statut='client'), indépendant de la période —
    // alimente la carte + le breakdown métier ; cohérent avec le clic qui ouvre la liste actuelle.
    const isClient = (c: typeof allClients[number]) => { const key = c.contactId ?? c.ghl_contact_id; return key != null && contactStatut.get(key) === 'client' }
    const currentClients = allClients.filter(isClient)
    const clientsCount  = currentClients.length

    // Leads (carte) = TOTAL ACTUEL de leads ouverts, indépendant de la période.
    const allLeads    = await ctx.db.query("crm_leads").collect()
    const leadsCount  = allLeads.filter(l => l.status === 'open').length

    // ─── R1 / R2 = LIVE count of open leads currently in those stages
    //     (no period filter — current column state) ──
    const r1Count = allLeads.filter(l => l.status === 'open' && l.stageId === 'r1').length
    const r2Count = allLeads.filter(l => l.status === 'open' && l.stageId === 'r2').length

    // ─── Argent (helper partagé avec paiement.overview, Stripe-aware) ───
    const obs = await ctx.db.query("onboarding").collect()
    const stripePayments = await ctx.db.query("stripe_payments").withIndex("by_created").collect()
    const externalPayments = await ctx.db.query("external_payments").collect()
    const fxRows = await ctx.db.query("fx_rates").collect()
    const fxToChf: Record<string, number> = { chf: 1 }; for (const r of fxRows) fxToChf[r.currency] = r.rate
    const args0 = { obs, clients: allClients, contacts: allContacts, stripePayments, externalPayments, tzOffset: args.tzOffset, fxToChf }
    // CARTES = TOTAUX à vie (indépendants de la période) : encaissé total + à collecter total.
    const todayStr = new Date().toISOString().slice(0, 10)
    const moneyTotal  = reconcileMoney({ ...args0, from: '2000-01-01', to: todayStr })
    const caEncaisse = moneyTotal.encaisse, caACollecter = moneyTotal.attente, rembourse = moneyTotal.rembourse
    // GRAPHIQUE = encaissé sur la PÉRIODE choisie (sert au tracé encaissé/jour).
    const moneyPeriod = reconcileMoney({ ...args0, from, to })

    // ─── Client timeline (per day within the window, count + CA) ──
    // Aligned to the new Client definition (intersection: statut='client' + in window).
    const dayCount = new Map<string, number>()
    const dayCA    = new Map<string, number>()
    // clients créés / jour
    for (const c of periodClients) {
      const key = dateOf(c.createdAt)
      dayCount.set(key, (dayCount.get(key) ?? 0) + 1)
    }
    // encaissé réel / jour (paiements reçus sur la période)
    for (const t of moneyPeriod.transactions) {
      if (t.type === 'payment' && t.status === 'encaissé' && t.date) dayCA.set(t.date, (dayCA.get(t.date) ?? 0) + t.amount)
    }
    // cumulativeTimeline=true (démo) → courbe CUMULÉE (ne fait que monter). Sinon → flux.
    // Granularité ADAPTATIVE selon l'amplitude : jour (≤70j), semaine (≤210j), sinon mois.
    // → un graphe lisible quelle que soit la période (pas 365 points pour un an).
    const cumTl = args.cumulativeTimeline === true
    const spanDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
    const gran: 'day' | 'week' | 'month' = spanDays <= 70 ? 'day' : spanDays <= 210 ? 'week' : 'month'
    const bucketKeyOf = (ds: string) => {
      if (gran === 'month') return ds.slice(0, 7)
      if (gran === 'week') { const dd = new Date(ds + 'T00:00:00Z'); dd.setUTCDate(dd.getUTCDate() - ((dd.getUTCDay() + 6) % 7)); return dd.toISOString().slice(0, 10) }
      return ds
    }
    const clientTimeline: { date: string; value: number; ca: number }[] = []
    let runCount = 0, runCA = 0
    let curKey: string | null = null, bucCount = 0, bucCA = 0, bucDate = ''
    const flush = () => { if (curKey !== null) clientTimeline.push({ date: bucDate, value: cumTl ? runCount : bucCount, ca: cumTl ? runCA : bucCA }) }
    for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
      const key = localDay(d.toISOString(), args.tzOffset)
      const dc = dayCount.get(key) ?? 0, dca = dayCA.get(key) ?? 0
      const bk = bucketKeyOf(key)
      if (bk !== curKey) { flush(); curKey = bk; bucCount = 0; bucCA = 0; bucDate = key }
      bucCount += dc; bucCA += dca
      runCount += dc; runCA += dca
    }
    flush()

    // ─── Métier / Niche breakdown — SAME set as clientsCount ────
    // For each period client, resolve its contact's métier/niche (coherent with the count above)
    const metierMap = new Map<string, { count: number; niche: string; contacts: { name: string; company: string }[] }>()
    const nicheMap  = new Map<string, Map<string, { count: number; contacts: { name: string; company: string }[] }>>()
    for (const client of currentClients) {
      const ckey = (client.contactId ?? client.ghl_contact_id)?.toString()
      const contact = ckey ? contactById.get(ckey) : undefined
      const metier  = contact?.metier || 'Non renseigné'
      const niche   = contact?.niche  || 'Autre'
      const name    = client.name || (contact ? `${contact.firstName} ${contact.lastName ?? ''}`.trim() : '—')
      const company = client.company || contact?.companyName || ''

      // métier breakdown
      if (!metierMap.has(metier)) metierMap.set(metier, { count: 0, niche, contacts: [] })
      const me = metierMap.get(metier)!
      me.count++; me.contacts.push({ name, company })

      // niche → métiers breakdown (for modal)
      if (!nicheMap.has(niche)) nicheMap.set(niche, new Map())
      const nm = nicheMap.get(niche)!
      if (!nm.has(metier)) nm.set(metier, { count: 0, contacts: [] })
      const nme = nm.get(metier)!
      nme.count++; nme.contacts.push({ name, company })
    }
    const total = currentClients.length || 1  // breakdown sur le total actuel de clients (indépendant de la période)
    const metierBreakdown = [...metierMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([label, d], i) => ({
        label, niche: d.niche, count: d.count,
        pct: Math.round((d.count / total) * 100),
        color: COLORS[i % COLORS.length],
        contacts: d.contacts,
      }))
    const nicheBreakdown = [...nicheMap.entries()].map(([niche, metiers]) => ({
      niche,
      metiers: [...metiers.entries()].map(([metier, md]) => ({ metier, count: md.count, contacts: md.contacts })),
    }))

    // ─── Distinct non-empty niche count among period clients ──
    const nichesSet  = new Set<string>()
    for (const client of currentClients) {
      const ckey = (client.contactId ?? client.ghl_contact_id)?.toString()
      const contact = ckey ? contactById.get(ckey) : undefined
      const n = (contact?.niche  ?? '').trim()
      if (n) nichesSet.add(n)
    }
    // Centre du donut = nombre de segments réellement affichés (inclut 'Non renseigné'),
    // pour concorder avec la légende (avant : metiersSet excluait le vide → centre 0 vs légende 1).
    const metiersCount = metierBreakdown.length
    const nichesCount  = nichesSet.size

    // ─── Recent activity = latest leads created (open + lost) ───
    const recentLeads = [...allLeads]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map(l => ({ id: l._id, name: l.name, stageId: l.status === 'lost' ? 'perdu' : l.stageId, createdAt: dateOf(l.createdAt), value: l.value, source: l.source ?? null }))

    return {
      clientsCount, caEncaisse, caACollecter, rembourse, leadsCount, r1Count, r2Count,
      metiersCount, nichesCount,
      clientTimeline, metierBreakdown, nicheBreakdown, recentLeads,
      totalContactsCount: allContacts.length,
    }
  },
})

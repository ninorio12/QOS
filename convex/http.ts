import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { api, internal } from "./_generated/api"

const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"])
const toMajor = (amount: number, currency: string) => ZERO_DECIMAL.has((currency || "").toLowerCase()) ? amount : amount / 100
const iso = (unixSec: number) => new Date(unixSec * 1000).toISOString()

// Vérification de signature Stripe (sans SDK) — HMAC-SHA256 de `${t}.${payload}`.
async function verifyStripeSignature(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false
  let t = ""
  const v1: string[] = []
  for (const part of header.split(",")) {
    const [k, val] = part.trim().split("=")
    if (k === "t") t = val
    else if (k === "v1" && val) v1.push(val)
  }
  if (!t || v1.length === 0) return false
  const age = Math.abs(Date.now() / 1000 - Number(t))
  if (!Number.isFinite(age) || age > 300) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`))
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("")
  return v1.includes(expected)
}

const http = httpRouter()

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const raw = await request.text()
    const conn = await ctx.runQuery(internal.stripe._connection, {})
    if (!conn?.webhookSecret) return new Response("Stripe non configuré", { status: 400 })

    const ok = await verifyStripeSignature(raw, request.headers.get("stripe-signature"), conn.webhookSecret)
    if (!ok) return new Response("Signature invalide", { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any
    try { event = JSON.parse(raw) } catch { return new Response("Bad payload", { status: 400 }) }

    try {
      if (event.type === "charge.succeeded") {
        const c = event.data.object
        await ctx.runMutation(internal.stripePayments.upsertFromStripe, {
          stripeId: c.id, type: "payment", status: "succeeded",
          amount: toMajor(c.amount, c.currency), currency: c.currency,
          customerId: typeof c.customer === "string" ? c.customer : undefined,
          customerEmail: c.billing_details?.email ?? c.receipt_email ?? undefined,
          description: c.description ?? undefined, created: iso(c.created),
          paymentIntentId: typeof c.payment_intent === "string" ? c.payment_intent : undefined,
          livemode: c.livemode, source: "webhook",
        })
      } else if (event.type === "charge.refunded") {
        const c = event.data.object
        for (const r of c.refunds?.data ?? []) {
          await ctx.runMutation(internal.stripePayments.upsertFromStripe, {
            stripeId: r.id, type: "refund", status: r.status === "succeeded" ? "succeeded" : (r.status ?? "pending"),
            amount: toMajor(r.amount, r.currency), currency: r.currency,
            customerId: typeof c.customer === "string" ? c.customer : undefined,
            customerEmail: c.billing_details?.email ?? c.receipt_email ?? undefined,
            description: r.reason ?? "Remboursement", created: iso(r.created),
            paymentIntentId: typeof c.payment_intent === "string" ? c.payment_intent : undefined,
            livemode: c.livemode, source: "webhook",
          })
        }
      } else if (event.type === "charge.pending") {
        // Paiement en cours (prélèvement bancaire qui met quelques jours…) → status 'pending'.
        const c = event.data.object
        await ctx.runMutation(internal.stripePayments.upsertFromStripe, {
          stripeId: c.id, type: "payment", status: "pending",
          amount: toMajor(c.amount, c.currency), currency: c.currency,
          customerId: typeof c.customer === "string" ? c.customer : undefined,
          customerEmail: c.billing_details?.email ?? c.receipt_email ?? undefined,
          description: c.description ?? "Paiement en cours", created: iso(c.created),
          paymentIntentId: typeof c.payment_intent === "string" ? c.payment_intent : undefined,
          livemode: c.livemode, source: "webhook",
        })
      } else if (event.type === "charge.failed") {
        // Paiement échoué (carte refusée…) → enregistré en status 'failed' (relances possibles).
        const c = event.data.object
        await ctx.runMutation(internal.stripePayments.upsertFromStripe, {
          stripeId: c.id, type: "payment", status: "failed",
          amount: toMajor(c.amount, c.currency), currency: c.currency,
          customerId: typeof c.customer === "string" ? c.customer : undefined,
          customerEmail: c.billing_details?.email ?? c.receipt_email ?? undefined,
          description: c.failure_message ?? c.description ?? "Paiement échoué", created: iso(c.created),
          paymentIntentId: typeof c.payment_intent === "string" ? c.payment_intent : undefined,
          livemode: c.livemode, source: "webhook",
        })
      } else if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
        // Litige / chargeback → type 'dispute', status open|won|lost (argent à risque).
        const d = event.data.object
        await ctx.runMutation(internal.stripePayments.upsertFromStripe, {
          stripeId: d.id, type: "dispute",
          status: event.type === "charge.dispute.created" ? "open" : (d.status ?? "closed"),
          amount: toMajor(d.amount, d.currency), currency: d.currency,
          description: `Litige${d.reason ? " · " + d.reason : ""}`, created: iso(d.created),
          paymentIntentId: typeof d.payment_intent === "string" ? d.payment_intent : undefined,
          livemode: d.livemode, source: "webhook",
        })
      }
      return new Response("OK", { status: 200 })
    } catch (err) {
      console.error("[Stripe] webhook erreur:", err)
      return new Response("Erreur", { status: 500 })
    }
  }),
})

// ─── Webhook iClosed (temps réel) ───────────────────────────────────────────
// iClosed signe ses payloads mais sans schéma public documenté → on n'exploite PAS le corps.
// Le webhook n'est qu'un DÉCLENCHEUR : on re-synchronise la donnée autoritaire via l'API eventCalls
// (api.iclosed.syncRecent). Conséquence sécu : un appel forgé ne peut au pire que relancer un sync
// d'un vrai RDV iClosed (aucune donnée fabriquée ne peut être injectée). Défense en profondeur :
// secret partagé requis (env ICLOSED_WEBHOOK_SECRET) via header `x-iclosed-secret` ou query `?secret=`.
http.route({
  path: "/iclosed/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.ICLOSED_WEBHOOK_SECRET
    if (!secret) return new Response("iClosed webhook non configuré", { status: 400 })
    const provided = request.headers.get("x-iclosed-secret") ?? new URL(request.url).searchParams.get("secret")
    if (provided !== secret) return new Response("Non autorisé", { status: 401 })
    // Trace d'appel : sans elle, impossible de savoir si iClosed déclenche
    // vraiment le temps réel ou si seul le filet périodique fait le travail.
    try { await ctx.runMutation(api.iclosed.recordWebhookPing, {}) } catch { /* la trace ne doit rien bloquer */ }
    try {
      const brut = await request.clone().text()
      await ctx.runMutation(internal.iclosed._trace, { source: "iclosed", payload: brut })
    } catch { /* le diagnostic ne doit rien bloquer non plus */ }
    try {
      // 1) Ingestion DIRECTE du payload du webhook : le RDV est créé même si la clé API
      //    iClosed est révoquée (vécu le 28/07/2026 : plus aucun RDV ne remontait alors que
      //    les bookings continuaient). Le webhook porte déjà tout ce dont on a besoin.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ingested: any = null
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = await request.clone().json()
        const c = body?.data?.eventCall ?? body?.eventCall ?? body?.data ?? body
        const ev = c?.event ?? {}
        const externalId = String(c?.id ?? c?.callId ?? "")
        const email = c?.inviteeEmail ?? c?.invitee?.email
        const startRaw = c?.dateTimeUTC ?? c?.dateTime ?? c?.startTime
        const evName = String(ev?.name ?? "").toLowerCase()
        const evSlug = String(ev?.linkPrefix ?? "").toLowerCase()
        // Jeton de parcours : le quiz l'ajoute à l'URL iClosed (?vf=…), iClosed le
        // recopie dans ses utm. On le pêche n'importe où dans le payload : c'est
        // le rattachement RDV↔lead qui tient même si l'email de réservation diffère.
        const vfToken = JSON.stringify(body).match(/vf=([a-z2-9]{10})\b/)?.[1]
        if (externalId && (email || c?.inviteeName)) {
          if (c?.cancelReason) {
            ingested = await ctx.runMutation(api.closing.cancelCallByExternalId, { externalId })
          } else if (!evName.includes("kick") && !evSlug.includes("kick") && startRaw) {
            // Un rendez-vous pris DEPUIS LE SITE n'est passé par aucun formulaire :
            // personne ne l'a jamais créé dans le Data OS. Il existait donc un appel
            // dans Closing sans aucune fiche derrière. On crée le lead ici, en
            // INBOUND, avant de poser le rendez-vous. Idempotent par l'identifiant
            // iClosed, et dédoublonné : quelqu'un venu du quiz garde sa fiche.
            const versSite = /d-mo|demo|d\u00e9mo/.test(`${evSlug} ${evName}`)
            try {
              const cree = await ctx.runMutation(internal.leadIngest.fromLeadForm, {
                leadgenId: `iclosed:${externalId}`,
                formName: `Rendez-vous iClosed · ${ev?.name ?? "sans nom"}`,
                isOrganic: true,
                fields: {
                  full_name: c?.inviteeName ?? undefined,
                  email: email ?? undefined,
                  phone_number: c?.inviteePhone ?? c?.phone ?? undefined,
                },
                funnel: versSite ? "site" : "quiz",
                origin: versSite ? "site" : "direct",
              })
              if (cree?.contactId) c.__contactId = cree.contactId
            } catch (e) {
              console.error("[iClosed] création du lead impossible:", e)
            }
            ingested = await ctx.runMutation(api.closing.scheduleCall, {
              contactId: c.__contactId ?? undefined,
              title: `R1 · ${c?.inviteeName ?? email}`,
              email: email ?? undefined,
              stage: "R1",
              date: new Date(String(startRaw)).toISOString(),
              externalId,
              meetLink: c?.meetingUrl ?? c?.location ?? undefined,
              calendarLabel: ev?.name ?? undefined,
              calendarSlug: ev?.linkPrefix ?? undefined,
              vfToken,
            })
          }
        }
      } catch (e) {
        console.error("[iClosed] ingestion directe impossible:", e)
      }
      // 2) Puis le sync complet en filet (rattrape les kickoffs, annulations, reschedules).
      //    S'il échoue (clé révoquée), l'ingestion directe a déjà fait le travail.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // 1 bis) Meta : le rendez-vous est RÉELLEMENT pris. La page de confirmation
      //   l'envoie déjà côté navigateur, mais elle n'est pas toujours atteinte
      //   (fermeture immédiate, bloqueur de pub). Même `eventId` des deux côtés
      //   — préfixe, email et heure du RDV — pour que Meta n'en compte qu'un.
      if (ingested?.created) {
        try {
          const body2: any = await request.clone().json()
          const c2 = body2?.data?.eventCall ?? body2?.eventCall ?? body2?.data ?? body2
          const mail = String(c2?.inviteeEmail ?? c2?.invitee?.email ?? "").trim().toLowerCase()
          const debut = c2?.dateTimeUTC ?? c2?.dateTime ?? c2?.startTime
          if (mail && debut) {
            const quand = new Date(String(debut)).toISOString()
            await ctx.scheduler.runAfter(0, internal.metaCapi.sendEvent, {
              eventName: "Schedule",
              // Reproduit à l'identique la règle de la page : le préfixe reste
              // HORS du nettoyage, sinon un email contenant « _ » donnerait deux
              // identifiants différents et la conversion compterait double.
              eventId: "rdv_" + (mail + "|" + quand).replace(/[^a-zA-Z0-9|:@.-]/g, ""),
              email: mail,
              phone: c2?.inviteePhone ?? c2?.invitee?.phone ?? undefined,
              name: c2?.inviteeName ?? undefined,
              eventSourceUrl: "https://go.vividflow.co/confirmation",
            })
          }
        } catch (e) { console.error("[iClosed] relais Meta impossible:", e) }
      }
      let sync: any = null
      try { sync = await ctx.runAction(api.iclosed.syncRecent, {}) } catch (e) { sync = { ok: false, error: String(e).slice(0, 200) } }
      return new Response(JSON.stringify({ ingested, sync }), { status: 200, headers: { "content-type": "application/json" } })
    } catch (err) {
      console.error("[iClosed] webhook erreur:", err)
      return new Response("Erreur", { status: 500 })
    }
  }),
})

/**
 * Leads de formulaire Facebook, poussés par Zernio (événement `lead.received`).
 *
 * Zernio est abonné au webhook `leadgen` de la page Meta : chaque soumission
 * arrive ici en temps réel. On vérifie la signature quand un secret est posé,
 * puis on crée contact, lead et parcours. Toujours répondre 200 après
 * validation : un 500 ferait retenter Zernio et, au bout de dix échecs, il
 * désactiverait le webhook.
 */
// Pont VPS -> Data OS : haut d'entonnoir LinkedIn (lemlist) + creation des leads
// issus des conversations. Protege par LINKEDIN_INGEST_SECRET.
http.route({
  path: "/linkedin/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.LINKEDIN_INGEST_SECRET
    const donne = request.headers.get("x-linkedin-secret") ?? ""
    if (!secret || donne !== secret) return new Response("unauthorized", { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try { body = await request.json() } catch { return new Response("Bad payload", { status: 400 }) }

    const res: Record<string, unknown> = {}
    if (body?.daily?.day) {
      const d = body.daily
      res.daily = await ctx.runMutation(internal.linkedinOutbound.ingest, {
        day: String(d.day),
        connexions: Number(d.connexions ?? 0),
        dmsEnvoyes: Number(d.dmsEnvoyes ?? 0),
        conversations: Number(d.conversations ?? 0),
        invitations: Number(d.invitations ?? 0),
        campaignId: d.campaignId ? String(d.campaignId) : undefined,
      })
    }
    if (Array.isArray(body?.conversations)) {
      const faits = []
      for (const c of body.conversations) {
        if (!c?.firstName || !c?.linkedinUrl) continue
        faits.push(await ctx.runMutation(internal.linkedinOutbound.contactFromConversation, {
          firstName: String(c.firstName),
          lastName: c.lastName ? String(c.lastName) : undefined,
          companyName: c.companyName ? String(c.companyName) : undefined,
          linkedinUrl: String(c.linkedinUrl),
          jobTitle: c.jobTitle ? String(c.jobTitle) : undefined,
          city: c.city ? String(c.city) : undefined,
          website: c.website ? String(c.website) : undefined,
          niche: c.niche ? String(c.niche) : undefined,
          repliedAt: c.repliedAt ? String(c.repliedAt) : undefined,
        }))
      }
      res.conversations = faits
    }
    return new Response(JSON.stringify({ ok: true, ...res }), {
      status: 200, headers: { "Content-Type": "application/json" },
    })
  }),
})

http.route({
  path: "/zernio/leads",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const raw = await request.text()
    const secret = process.env.ZERNIO_WEBHOOK_SECRET
    if (secret) {
      const sig = request.headers.get("x-zernio-signature") ?? request.headers.get("x-signature") ?? ""
      const enc = new TextEncoder()
      const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
      const mac = await crypto.subtle.sign("HMAC", key, enc.encode(raw))
      const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")
      if (!sig.toLowerCase().includes(expected)) return new Response("Signature invalide", { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let evt: any
    try { evt = JSON.parse(raw) } catch { return new Response("Bad payload", { status: 400 }) }
    if (evt?.event !== "lead.received" || !evt?.lead?.leadgenId) return new Response("ok", { status: 200 })

    try {
      const l = evt.lead
      await ctx.runMutation(internal.leadIngest.fromLeadForm, {
        leadgenId: String(l.leadgenId),
        formId: l.formId ? String(l.formId) : undefined,
        formName: l.formName ?? undefined,
        adId: l.adId ?? undefined,
        adsetId: l.adsetId ?? undefined,
        campaignId: l.campaignId ?? undefined,
        isOrganic: Boolean(l.isOrganic),
        fields: l.fields ?? {},
        createdAt: l.createdAt ?? undefined,
        // Ni funnel ni origin imposés ici : l'ingestion les déduit de la
        // correspondance du formulaire, puis de son nom.
      })
    } catch (err) {
      console.error("[zernio/leads] erreur:", err)
    }
    return new Response("ok", { status: 200 })
  }),
})

/**
 * Parcours lead, côté page publique du quiz (quiz.vividflow.co).
 *
 * Le jeton `vf` est une capacité : il est aléatoire et ne circule que dans les
 * liens du lead concerné, donc le posséder vaut autorisation. Deux gestes :
 * lire l'identité pour préremplir (GET /journey/lead) et marquer une étape
 * franchie (POST /journey/step). CORS ouvert : sans jeton valide, rien ne sort.
 */
const journeyCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}
const journeyPreflight = httpAction(async () => new Response(null, { status: 204, headers: journeyCors }))
http.route({ path: "/journey/lead", method: "OPTIONS", handler: journeyPreflight })
http.route({ path: "/journey/step", method: "OPTIONS", handler: journeyPreflight })

http.route({
  path: "/journey/lead",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const vf = new URL(request.url).searchParams.get("vf") ?? ""
    const row = vf ? await ctx.runQuery(internal.leadIngest.journey, { token: vf }) : null
    const body = row
      ? { found: true, nom: row.name ?? null, email: row.email ?? null, tel: row.phone ?? null }
      : { found: false }
    return new Response(JSON.stringify(body), { status: 200, headers: { ...journeyCors, "Content-Type": "application/json" } })
  }),
})

/**
 * Deck outbound généré (build SSG Hermes). Protégé par DECK_WEBHOOK_SECRET.
 * Rend le jeton + l'URL iClosed traçante à embarquer dans la page booking.
 */
http.route({
  path: "/deck/generated",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.DECK_WEBHOOK_SECRET
    if (!secret) return new Response("Webhook deck non configuré", { status: 400 })
    const provided = request.headers.get("x-deck-secret") ?? new URL(request.url).searchParams.get("secret")
    if (provided !== secret) return new Response("Non autorisé", { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let b: any
    try { b = await request.json() } catch { return new Response("Bad payload", { status: 400 }) }
    if (typeof b?.email !== "string" || !b.email.includes("@")) return new Response("email requis", { status: 400 })
    const r = await ctx.runMutation(internal.leadIngest.deckGenerated, {
      email: b.email, name: b.name ?? undefined, company: b.company ?? undefined,
      slug: b.slug ?? undefined, deckUrl: b.deckUrl ?? undefined,
    })
    return new Response(JSON.stringify({
      token: r.token,
      bookingUrl: `https://app.iclosed.io/e/vividflow/audit-out?vf=${r.token}`,
    }), { status: 200, headers: { "Content-Type": "application/json" } })
  }),
})

const JOURNEY_STEPS = new Set(["quiz_ouvert", "quiz_termine"])
http.route({
  path: "/journey/step",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let b: any
    try { b = await request.json() } catch { b = null }
    const vf = typeof b?.vf === "string" ? b.vf : ""
    const step = typeof b?.step === "string" ? b.step : ""
    // Liste blanche : la page publique ne peut pas écrire rdv_pris ou toute
    // étape réservée aux webhooks authentifiés.
    if (vf && JOURNEY_STEPS.has(step)) {
      await ctx.runMutation(internal.leadIngest.markStep, { token: vf, step })
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...journeyCors, "Content-Type": "application/json" } })
  }),
})

/**
 * Réponses du quiz de qualification (quiz.vividflow.co).
 *
 * Appelée SERVEUR À SERVEUR par les fonctions du projet quiz (`/api/lead-progress`
 * et `/api/ghl-webhook`), jamais par le navigateur : d'où le secret partagé et
 * l'absence de CORS. Deux formes de charge utile acceptées, celle de la capture
 * progressive et celle de la soumission finale, parce que la page publique les
 * envoie déjà telles quelles et qu'on ne touche pas à son code.
 */
http.route({
  path: "/quiz/progress",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.INTERNAL_API_SECRET
    const provided = request.headers.get("x-vf-secret") ?? ""
    if (!secret || provided !== secret) return new Response("Non autorisé", { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let b: any
    try { b = await request.json() } catch { return new Response("Bad payload", { status: 400 }) }

    const email = typeof b?.email === "string" ? b.email : ""
    const sid = typeof b?.sid === "string" ? b.sid : ""
    // Une réponse compte dès la première question, avant toute identité : la
    // session (`sid`) suffit. L'email, quand il arrive, recolle le tout.
    if (!email.includes("@") && !sid) {
      return new Response(JSON.stringify({ ok: false, reason: "email ou session requis" }), { status: 200, headers: { "Content-Type": "application/json" } })
    }

    // « submit » = la personne a atteint son diagnostic (soumission finale ou
    // capture progressive marquée qualifiée). Tout le reste est du progrès.
    const kind = b.kind === "submit" || b.reason === "qualified" || b.qualified !== undefined || b.answersText
      ? "submit"
      : "progress"

    const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : undefined)
    const asJson = (x: unknown) => {
      if (x === undefined || x === null) return undefined
      if (typeof x === "string") return x.trim() || undefined
      try { return JSON.stringify(x) } catch { return undefined }
    }

    const r = await ctx.runMutation(internal.quizIngest.record, {
      kind,
      email,
      sid,
      qi: typeof b.qi === "number" ? b.qi : undefined,
      qTotal: typeof b.qTotal === "number" ? b.qTotal : undefined,
      ecran: str(b.screen) ?? str(b.ecran),
      vf: str(b.vf),
      name: str(b.name) ?? str(b.fullName),
      phone: str(b.phone),
      company: str(b.company),
      metier: str(b.metier),
      secteur: str(b.secteur),
      qualified: typeof b.qualified === "boolean" ? b.qualified : undefined,
      score: typeof b.score === "number" ? b.score : undefined,
      tier: str(b.tier),
      answersJson: asJson(b.answers),
      answersText: str(b.answersText),
      attributionJson: asJson(b.attribution),
      pageUrl: str(b.pageUrl),
      variant: str(b.variant),
    })
    return new Response(JSON.stringify(r), { status: 200, headers: { "Content-Type": "application/json" } })
  }),
})

/**
 * Page 1 du quiz : identité du prospect (nom, prénom, téléphone, entreprise).
 *
 * C'est le NOUVEAU point d'entrée des leads : la publicité Meta n'a plus de
 * formulaire instantané, elle envoie directement sur le quiz. Dès que cette
 * page est validée, la fiche existe dans le Data OS, même si la personne
 * n'ouvre jamais le diagnostic derrière.
 *
 * On réutilise volontairement l'ingestion du formulaire Meta : contact, lead,
 * carte de prospection et parcours sortent identiques, avec les mêmes règles de
 * dédoublonnage. L'identifiant de soumission est fabriqué à partir de la
 * session ou de l'email, ce qui rend l'appel idempotent.
 */
http.route({
  path: "/quiz/lead",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.INTERNAL_API_SECRET
    if (!secret || (request.headers.get("x-vf-secret") ?? "") !== secret) {
      return new Response("Non autorisé", { status: 401 })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let b: any
    try { b = await request.json() } catch { return new Response("Bad payload", { status: 400 }) }

    const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : undefined)
    const email = (str(b.email) ?? "").toLowerCase()
    const prenom = str(b.prenom) ?? str(b.firstName)
    const nom = str(b.nom) ?? str(b.lastName)
    const complet = str(b.fullName) ?? [prenom, nom].filter(Boolean).join(" ")
    const phone = str(b.telephone) ?? str(b.phone)
    const company = str(b.entreprise) ?? str(b.company)
    const sid = str(b.sid)

    // Sans aucun moyen de reconnaître la personne, on n'écrit rien.
    if (!email && !phone) {
      return new Response(JSON.stringify({ ok: false, reason: "email ou téléphone requis" }), { status: 200, headers: { "Content-Type": "application/json" } })
    }

    const adId = str(b.adId) ?? str(b.ad_id)
    const r = await ctx.runMutation(internal.leadIngest.fromLeadForm, {
      // Clé stable : deux envois de la même page ne créent qu'une fiche.
      leadgenId: `quiz:${sid || email || phone}`,
      formName: "Quiz VividFlow · identité",
      adId,
      adsetId: str(b.adsetId) ?? str(b.adset_id),
      campaignId: str(b.campaignId) ?? str(b.campaign_id),
      isOrganic: !adId,
      fields: {
        full_name: complet || undefined,
        first_name: prenom,
        last_name: nom,
        email: email || undefined,
        phone_number: phone,
        company,
      },
      funnel: "quiz",
      origin: adId || str(b.utm_source) === "meta" ? "facebook" : "direct",
    })

    if (r?.contactId) {
      await ctx.runMutation(internal.quizIngest.attachLead, {
        contactId: r.contactId, leadId: r.leadId ?? undefined, token: r.token ?? undefined,
        email: email || undefined, sid, company,
      })
    }
    return new Response(JSON.stringify(r), { status: 200, headers: { "Content-Type": "application/json" } })
  }),
})

export default http

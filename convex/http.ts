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
    try {
      const r = await ctx.runAction(api.iclosed.syncRecent, {})
      return new Response(JSON.stringify(r), { status: 200, headers: { "content-type": "application/json" } })
    } catch (err) {
      console.error("[iClosed] webhook erreur:", err)
      return new Response("Erreur", { status: 500 })
    }
  }),
})

export default http

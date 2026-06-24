import { localDay } from "./timeLib"

// ── Source UNIQUE de vérité « argent » du Data OS ───────────────────────────
// Utilisée par paiement.overview ET dashboard.getMetrics pour garantir que
// l'encaissé / à collecter / remboursé / en retard sont IDENTIQUES partout.
// Règles (décisions Thomas 2026-06-21) :
//  • CA = encaissé (argent réellement reçu), borné à la période [from,to].
//  • Stripe = source de vérité dès qu'un paiement réel est ingéré (stripeMode),
//    sinon repli sur les échéances onboarding cochées à la main.
//  • À collecter = plan d'échéances (onboarding / valeur client) − déjà encaissé.
//  • En retard = échéances échues (dueDate ≤ aujourd'hui) non couvertes.

export type Txn = {
  contactId: string; client: string; company: string; label: string
  amount: number; date: string; type: 'payment' | 'refund'; status: 'encaissé' | 'attente'
  source?: 'stripe' | 'revolut' | 'manual'   // origine du paiement (colonne Source)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

export type MoneyResult = {
  encaisse: number; attente: number; rembourse: number; enRetard: number
  pending: number; failed: number; disputes: number
  stripeMode: boolean; transactions: Txn[]
}

export function reconcileMoney(opts: {
  obs: Row[]; clients: Row[]; contacts: Row[]; stripePayments: Row[]; externalPayments?: Row[]
  from: string; to: string; tzOffset?: number
}): MoneyResult {
  const { obs, clients, contacts, stripePayments, externalPayments = [], from, to, tzOffset } = opts
  const inWinDate = (s: string) => { const d = s.slice(0, 10); return d >= from && d <= to }

  // Joint par les DEUX clés (ghl_contact_id legacy + contactId typé Vague 2) → robuste à la migration.
  const clientByContact = new Map<string, Row>()
  for (const c of clients) {
    if (c.ghl_contact_id) clientByContact.set(c.ghl_contact_id, c)
    if (c.contactId) clientByContact.set(c.contactId.toString(), c)
  }
  const contactById = new Map(contacts.map(c => [c._id.toString(), c]))
  const nameOf = (contactId: string) => {
    const client = clientByContact.get(contactId)
    const contact = contactById.get(contactId)
    return {
      name: client?.name || (contact ? `${contact.firstName} ${contact.lastName ?? ''}`.trim() : '—'),
      company: client?.company || contact?.companyName || '',
    }
  }

  const transactions: Txn[] = []
  let encaisse = 0, attente = 0, rembourse = 0

  const stripeMode = stripePayments.length > 0
  const sumStripe = (type: string, status: string) =>
    stripePayments.filter(p => p.type === type && p.status === status && inWinDate(p.created)).reduce((s, p) => s + p.amount, 0)
  const pending = sumStripe('payment', 'pending')
  const failed = sumStripe('payment', 'failed')
  const disputes = stripePayments.filter(p => p.type === 'dispute' && p.status === 'open' && inWinDate(p.created)).reduce((s, p) => s + p.amount, 0)

  if (stripeMode) {
    const succeeded = stripePayments.filter(p => p.type === 'payment' && p.status === 'succeeded')
    const refunds = stripePayments.filter(p => p.type === 'refund')
    for (const p of succeeded) {
      if (!inWinDate(p.created)) continue
      const cid = p.contactId?.toString() ?? ''
      const { name, company } = cid ? nameOf(cid) : { name: p.customerEmail || 'Client Stripe', company: '' }
      encaisse += p.amount
      transactions.push({ contactId: cid, client: name, company, label: p.description || 'Paiement Stripe', amount: p.amount, date: p.created.slice(0, 10), type: 'payment', status: 'encaissé', source: 'stripe' })
    }
    for (const r of refunds) {
      if (!inWinDate(r.created)) continue
      const cid = r.contactId?.toString() ?? ''
      const { name, company } = cid ? nameOf(cid) : { name: r.customerEmail || 'Client Stripe', company: '' }
      rembourse += r.amount
      transactions.push({ contactId: cid, client: name, company, label: r.description || 'Remboursement', amount: -r.amount, date: r.created.slice(0, 10), type: 'refund', status: 'encaissé', source: 'stripe' })
    }
    const collectedBy = new Map<string, number>()
    for (const p of succeeded) { const k = p.contactId?.toString(); if (k) collectedBy.set(k, (collectedBy.get(k) ?? 0) + p.amount) }
    for (const ob of obs) {
      const client = clientByContact.get(ob.contactId)
      const planned = (ob.payment?.amounts ?? (client ? [client.value] : [])).reduce((s: number, a: number) => s + a, 0)
      const remaining = Math.max(0, planned - (collectedBy.get(ob.contactId) ?? 0))
      if (remaining > 0) {
        const { name, company } = nameOf(ob.contactId)
        attente += remaining
        transactions.push({ contactId: ob.contactId, client: name, company, label: 'À collecter', amount: remaining, date: '', type: 'payment', status: 'attente' })
      }
    }
    for (const cl of clients) {
      const cid = cl.contactId?.toString() ?? cl.ghl_contact_id ?? ''
      if (!obs.find(o => o.contactId === cid)) {
        const remaining = Math.max(0, (cl.value ?? 0) - (collectedBy.get(cid) ?? 0))
        if (remaining > 0) { attente += remaining; transactions.push({ contactId: cid, client: cl.name, company: cl.company ?? '', label: 'À collecter', amount: remaining, date: '', type: 'payment', status: 'attente' }) }
      }
    }
  } else {
    for (const ob of obs) {
      const { name, company } = nameOf(ob.contactId)
      const client = clientByContact.get(ob.contactId)
      const amounts = ob.payment?.amounts ?? (client ? [client.value] : [])
      const paid = ob.paidStatus ?? []
      const dates = ob.paidDates ?? []
      amounts.forEach((amt: number, i: number) => {
        const isPaid = paid[i] === true
        const pdate = dates[i] || ''
        if (isPaid) {
          if (pdate && inWinDate(pdate)) { encaisse += amt; transactions.push({ contactId: ob.contactId, client: name, company, label: amounts.length > 1 ? `Échéance ${i + 1}/${amounts.length}` : 'Paiement', amount: amt, date: pdate, type: 'payment', status: 'encaissé' }) }
        } else {
          attente += amt
          transactions.push({ contactId: ob.contactId, client: name, company, label: amounts.length > 1 ? `Échéance ${i + 1}/${amounts.length}` : 'Paiement', amount: amt, date: '', type: 'payment', status: 'attente' })
        }
      })
      for (const r of ob.refunds ?? []) {
        if (inWinDate(r.date)) { rembourse += r.amount; transactions.push({ contactId: ob.contactId, client: name, company, label: r.note || 'Remboursement', amount: -r.amount, date: r.date, type: 'refund', status: 'encaissé' }) }
      }
    }
    for (const cl of clients) {
      const cid = cl.contactId?.toString() ?? cl.ghl_contact_id ?? ''
      if (!obs.find(o => o.contactId === cid)) {
        attente += (cl.value ?? 0)
        transactions.push({ contactId: cid, client: cl.name, company: cl.company ?? '', label: 'Paiement', amount: (cl.value ?? 0), date: '', type: 'payment', status: 'attente' })
      }
    }
  }
  // Paiements externes (Revolut Pro / virements / saisie manuelle) : encaissés, comptés quel que soit stripeMode.
  for (const p of externalPayments) {
    const date = String(p.date || p.created || '').slice(0, 10)
    if (!inWinDate(date)) continue
    const cid = p.contactId?.toString() ?? ''
    const nm = cid ? nameOf(cid) : { name: p.counterparty || 'Virement', company: '' }
    const amt = p.amount ?? 0
    encaisse += amt
    transactions.push({
      contactId: cid, client: nm.name || p.counterparty || 'Virement', company: nm.company,
      label: p.reference || (p.method === 'revolut' ? 'Virement Revolut' : 'Virement reçu'),
      amount: amt, date, type: 'payment', status: 'encaissé', source: p.method === 'revolut' ? 'revolut' : 'manual',
    })
  }

  transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // En retard = échéances échues non couvertes (max entre cochées payées et Stripe réussi)
  const todayStr = new Date().toISOString().slice(0, 10)
  const paidByContact = new Map<string, number>()
  for (const p of stripePayments) {
    if (p.type === 'payment' && p.status === 'succeeded') {
      const k = p.contactId?.toString(); if (k) paidByContact.set(k, (paidByContact.get(k) ?? 0) + p.amount)
    }
  }
  for (const p of externalPayments) { const k = p.contactId?.toString(); if (k) paidByContact.set(k, (paidByContact.get(k) ?? 0) + (p.amount ?? 0)) }
  let enRetard = 0
  for (const ob of obs) {
    const amounts = ob.payment?.amounts ?? []
    const paid = ob.paidStatus ?? []
    const due = ob.dueDates ?? []
    let dueByNow = 0, manualPaid = 0
    amounts.forEach((amt: number, i: number) => {
      if (due[i] && due[i].slice(0, 10) <= todayStr) dueByNow += amt
      if (paid[i] === true) manualPaid += amt
    })
    if (dueByNow === 0) continue
    const collected = Math.max(manualPaid, paidByContact.get(ob.contactId) ?? 0)
    enRetard += Math.max(0, dueByNow - collected)
  }

  void localDay // tzOffset réservé aux extensions futures (dates Stripe déjà en UTC ISO)
  return { encaisse, attente, rembourse, enRetard, pending, failed, disputes, stripeMode, transactions }
}

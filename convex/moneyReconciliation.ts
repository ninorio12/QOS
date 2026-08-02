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
  from: string; to: string; tzOffset?: number; fxToChf?: Record<string, number>
}): MoneyResult {
  const { obs, clients, contacts, stripePayments, externalPayments = [], from, to, tzOffset, fxToChf = {} } = opts
  // Fenêtre : on date au JOUR LOCAL (Suisse) les horodatages avec heure (Stripe `created`, ISO),
  // et on garde tel quel les dates déjà saisies sans heure (paidDates onboarding = déjà locales).
  const inWinDate = (s: string) => {
    const d = /[T ]\d{2}:\d{2}/.test(s) ? localDay(s, tzOffset) : (s || '').slice(0, 10)
    return d >= from && d <= to
  }
  // Conversion en CHF : tout montant est ramené en CHF via son code devise (défaut CHF=1).
  // Les échéances onboarding / valeur client sont déjà en CHF. Si le taux manque, on garde 1 (pas de crash).
  const chf = (amt: number, cur?: string) => (amt ?? 0) * (fxToChf[(cur || 'chf').toLowerCase()] ?? 1)

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
    stripePayments.filter(p => p.type === type && p.status === status && inWinDate(p.created)).reduce((s, p) => s + chf(p.amount, p.currency), 0)
  const pending = sumStripe('payment', 'pending')
  const failed = sumStripe('payment', 'failed')
  const disputes = stripePayments.filter(p => p.type === 'dispute' && p.status === 'open' && inWinDate(p.created)).reduce((s, p) => s + chf(p.amount, p.currency), 0)

  // Encaissé externe (Revolut / virement / manuel) par contact, EN CHF : déduit du « à collecter » dans LES DEUX modes.
  const externalByContact = new Map<string, number>()
  // Ce que les échéances manuelles ont déjà compté comme encaissé, par contact.
  const manualPaidByContact = new Map<string, number>()
  for (const p of externalPayments) { const k = p.contactId?.toString(); if (k) externalByContact.set(k, (externalByContact.get(k) ?? 0) + chf(p.amount ?? 0, p.currency)) }

  if (stripeMode) {
    const succeeded = stripePayments.filter(p => p.type === 'payment' && p.status === 'succeeded')
    // Refunds : uniquement ceux réellement aboutis (un refund pending/failed ne réduit pas l'encaissé).
    const refunds = stripePayments.filter(p => p.type === 'refund' && p.status === 'succeeded')
    for (const p of succeeded) {
      if (!inWinDate(p.created)) continue
      const cid = p.contactId?.toString() ?? ''
      const { name, company } = cid ? nameOf(cid) : { name: p.customerEmail || 'Client Stripe', company: '' }
      const amtChf = chf(p.amount, p.currency)
      encaisse += amtChf
      transactions.push({ contactId: cid, client: name, company, label: p.description || 'Paiement Stripe', amount: amtChf, date: p.created.slice(0, 10), type: 'payment', status: 'encaissé', source: 'stripe' })
    }
    for (const r of refunds) {
      if (!inWinDate(r.created)) continue
      const cid = r.contactId?.toString() ?? ''
      const { name, company } = cid ? nameOf(cid) : { name: r.customerEmail || 'Client Stripe', company: '' }
      const amtChf = chf(r.amount, r.currency)
      rembourse += amtChf
      transactions.push({ contactId: cid, client: name, company, label: r.description || 'Remboursement', amount: -amtChf, date: r.created.slice(0, 10), type: 'refund', status: 'encaissé', source: 'stripe' })
    }
    // Chargebacks PERDUS (argent réellement repris) : comptés comme un remboursement, sinon le net est faussé.
    for (const d of stripePayments.filter(p => p.type === 'dispute' && p.status === 'lost')) {
      if (!inWinDate(d.created)) continue
      const cid = d.contactId?.toString() ?? ''
      const { name, company } = cid ? nameOf(cid) : { name: d.customerEmail || 'Litige', company: '' }
      const amtChf = chf(d.amount, d.currency)
      rembourse += amtChf
      transactions.push({ contactId: cid, client: name, company, label: d.description || 'Litige perdu (chargeback)', amount: -amtChf, date: d.created.slice(0, 10), type: 'refund', status: 'encaissé', source: 'stripe' })
    }
    const collectedBy = new Map<string, number>()
    for (const p of succeeded) { const k = p.contactId?.toString(); if (k) collectedBy.set(k, (collectedBy.get(k) ?? 0) + chf(p.amount, p.currency)) }
    // + virements externes déjà reçus → déduits aussi du « à collecter ».
    for (const [k, v] of externalByContact) collectedBy.set(k, (collectedBy.get(k) ?? 0) + v)

    // Cases Onboarding cochées « reçu » à la main : comptent comme encaissé MÊME en mode Stripe
    // (sinon une coche manuelle est invisible dès qu'un paiement Stripe existe ailleurs).
    // Par contact, on prend le MAX(manuel, stripe+externe) → jamais le même argent deux fois.
    const stripeWinByC = new Map<string, number>()
    for (const p of succeeded) { if (!inWinDate(p.created)) continue; const k = p.contactId?.toString(); if (k) stripeWinByC.set(k, (stripeWinByC.get(k) ?? 0) + chf(p.amount, p.currency)) }
    const extWinByC = new Map<string, number>()
    for (const p of externalPayments) { const dt = String(p.date || p.created || '').slice(0, 10); if (!inWinDate(dt)) continue; const k = p.contactId?.toString(); if (k) extWinByC.set(k, (extWinByC.get(k) ?? 0) + chf(p.amount ?? 0, p.currency)) }
    for (const ob of obs) {
      const cl = clientByContact.get(ob.contactId)
      const amounts: number[] = ob.payment?.amounts ?? (cl ? [cl.value ?? 0] : [])
      const paid: boolean[] = ob.paidStatus ?? []
      const dates: string[] = ob.paidDates ?? []
      let manualAll = 0, manualWin = 0
      amounts.forEach((amt, i) => { if (paid[i] === true) { manualAll += amt; if (dates[i] && inWinDate(dates[i])) manualWin += amt } })
      if (manualAll <= 0) continue
      collectedBy.set(ob.contactId, Math.max(collectedBy.get(ob.contactId) ?? 0, manualAll))   // à collecter : déduit le manuel
      const autoWin = (stripeWinByC.get(ob.contactId) ?? 0) + (extWinByC.get(ob.contactId) ?? 0)
      const extra = Math.max(0, manualWin - autoWin)                                            // encaissé (période) : part manuelle non déjà couverte
      if (extra > 0) {
        const { name, company } = nameOf(ob.contactId)
        encaisse += extra
        transactions.push({ contactId: ob.contactId, client: name, company, label: 'Encaissé (saisie manuelle)', amount: extra, date: dates.find((dd, i) => paid[i] && !!dd) || '', type: 'payment', status: 'encaissé', source: 'manual' })
      }
    }
    for (const ob of obs) {
      const client = clientByContact.get(ob.contactId)
      const planned = (ob.payment?.amounts ?? (client ? [client.value ?? 0] : [])).reduce((s: number, a: number) => s + a, 0)
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
    // Mode NON-Stripe : l'encaissé vient de DEUX sources qui décrivent souvent le
    // MÊME argent (une échéance cochée reçue + le virement correspondant ingéré).
    // On mémorise ce que les échéances ont déjà compté par contact, pour ne
    // compter ensuite que l'EXCÉDENT des virements externes (audit tribunal
    // 2026-08-02 : sans ça, un virement saisi ET coché comptait deux fois).
    for (const ob of obs) {
      const { name, company } = nameOf(ob.contactId)
      const client = clientByContact.get(ob.contactId)
      const amounts = ob.payment?.amounts ?? (client ? [client.value ?? 0] : [])
      const paid = ob.paidStatus ?? []
      const dates = ob.paidDates ?? []
      let unpaid = 0
      amounts.forEach((amt: number, i: number) => {
        const isPaid = paid[i] === true
        const pdate = dates[i] || ''
        if (isPaid) {
          if (pdate && inWinDate(pdate)) { encaisse += amt; manualPaidByContact.set(ob.contactId, (manualPaidByContact.get(ob.contactId) ?? 0) + amt); transactions.push({ contactId: ob.contactId, client: name, company, label: amounts.length > 1 ? `Échéance ${i + 1}/${amounts.length}` : 'Paiement', amount: amt, date: pdate, type: 'payment', status: 'encaissé' }) }
        } else {
          unpaid += amt
        }
      })
      // « À collecter » net : échéances non cochées MOINS les virements externes déjà reçus pour ce contact.
      const remaining = Math.max(0, unpaid - (externalByContact.get(ob.contactId) ?? 0))
      if (remaining > 0) {
        attente += remaining
        transactions.push({ contactId: ob.contactId, client: name, company, label: 'À collecter', amount: remaining, date: '', type: 'payment', status: 'attente' })
      }
      for (const r of ob.refunds ?? []) {
        if (inWinDate(r.date)) { rembourse += r.amount; transactions.push({ contactId: ob.contactId, client: name, company, label: r.note || 'Remboursement', amount: -r.amount, date: r.date, type: 'refund', status: 'encaissé' }) }
      }
    }
    for (const cl of clients) {
      const cid = cl.contactId?.toString() ?? cl.ghl_contact_id ?? ''
      if (!obs.find(o => o.contactId === cid)) {
        const remaining = Math.max(0, (cl.value ?? 0) - (externalByContact.get(cid) ?? 0))
        if (remaining > 0) {
          attente += remaining
          transactions.push({ contactId: cid, client: cl.name, company: cl.company ?? '', label: 'À collecter', amount: remaining, date: '', type: 'payment', status: 'attente' })
        }
      }
    }
  }
  // Paiements externes (Revolut Pro / virements / saisie manuelle) : encaissés, comptés quel que soit stripeMode.
  // Anti-double-comptage : si l'échéance du même contact a DÉJÀ été cochée reçue
  // dans la fenêtre, ce virement décrit le même argent ; on n'ajoute que l'excédent.
  for (const p of externalPayments) {
    const date = String(p.date || p.created || '').slice(0, 10)
    if (!inWinDate(date)) continue
    const cid = p.contactId?.toString() ?? ''
    const nm = cid ? nameOf(cid) : { name: p.counterparty || 'Virement', company: '' }
    const amtRaw = chf(p.amount ?? 0, p.currency)
    const alreadyManual = cid ? (manualPaidByContact.get(cid) ?? 0) : 0
    const absorbed = Math.min(alreadyManual, amtRaw)
    if (cid && absorbed > 0) manualPaidByContact.set(cid, alreadyManual - absorbed)
    const amt = amtRaw - absorbed
    if (amt <= 0) continue
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
      const k = p.contactId?.toString(); if (k) paidByContact.set(k, (paidByContact.get(k) ?? 0) + chf(p.amount, p.currency))
    }
  }
  for (const p of externalPayments) { const k = p.contactId?.toString(); if (k) paidByContact.set(k, (paidByContact.get(k) ?? 0) + chf(p.amount ?? 0, p.currency)) }
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

  return { encaisse, attente, rembourse, enRetard, pending, failed, disputes, stripeMode, transactions }
}

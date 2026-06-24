import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

// Endpoint public : reçoit les réponses du formulaire de confirmation (vividflow.co/confirmation),
// les enregistre dans confirmation_intake (auto-lié au contact par email), pour le module Closing.
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => ({})) as Record<string, unknown>
    const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
    if (!str(b.fullName) && !str(b.email)) {
      return NextResponse.json({ error: 'fullName ou email requis' }, { status: 400, headers: CORS })
    }
    // Questionnaire complet (toutes Q/R, libres comprises) : on normalise en [{q,a}].
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawAnswers = Array.isArray(b.answers) ? (b.answers as any[]) : []
    const answers = rawAnswers
      .map(x => ({ q: String(x?.q ?? x?.question ?? '').trim(), a: String(x?.a ?? x?.answer ?? '').trim() }))
      .filter(x => x.q && x.a)
    const answersJson = answers.length ? JSON.stringify(answers) : undefined
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return NextResponse.json({ error: 'config manquante' }, { status: 500, headers: CORS })
    const cx = new ConvexHttpClient(url)

    // 1) Créer (ou dédupliquer) la fiche contact : nouveau lead INBOUND (quiz = acquisition Meta).
    //    crm_contacts.create déduplique par email/téléphone, donc idempotent.
    const fullName = (str(b.fullName) || str(b.email) || 'Prospect').trim()
    const [firstName, ...rest] = fullName.split(/\s+/)
    try {
      await cx.mutation(api.crm_contacts.create, {
        firstName: firstName || 'Prospect',
        lastName: rest.join(' ') || undefined,
        email: str(b.email) || undefined,
        phone: str(b.phone) || undefined,
        companyName: str(b.company) || undefined,
        source: 'inbound',
        statut: 'lead',
      })
    } catch (e) {
      console.error('[confirmation/submit] contact create', e)
    }

    // 2) Enregistrer les réponses (auto-liées au contact par email).
    const id = await cx.mutation(api.confirmationIntake.create, {
      fullName:          str(b.fullName) || str(b.email) || 'Prospect',
      email:             str(b.email) || undefined,
      company:           str(b.company) || undefined,
      companyType:       str(b.companyType) || undefined,
      headcount:         str(b.headcount) || undefined,
      monthlyRevenue:    str(b.monthlyRevenue) || undefined,
      costliestFunction: str(b.costliestFunction) || undefined,
      repetitiveCost:    str(b.repetitiveCost) || undefined,
      whyNow:            str(b.whyNow) || undefined,
      timing:            str(b.timing) || undefined,
      budget:            str(b.budget) || undefined,
      answersJson,
      raw:               b,
    })
    return NextResponse.json({ ok: true, id }, { headers: CORS })
  } catch (err) {
    console.error('[confirmation/submit]', err)
    return NextResponse.json({ error: 'server' }, { status: 500, headers: CORS })
  }
}

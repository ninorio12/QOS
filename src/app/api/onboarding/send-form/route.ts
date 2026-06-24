import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'
import { sendOnboardingFormEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'

const ONBOARDING_FORM_URL = 'https://vividflow-onboarding.vercel.app/onboarding'

// Envoie au contact (par email) une invitation Resend à remplir son formulaire d'onboarding.
export async function POST(req: NextRequest) {
  try {
    const { contactId } = (await req.json().catch(() => ({}))) as { contactId?: string }
    if (!contactId) return NextResponse.json({ ok: false, error: 'contactId requis' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return NextResponse.json({ ok: false, error: 'Convex non configuré' }, { status: 500 })

    const convex = new ConvexHttpClient(url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = await convex.query(api.crm_contacts.get, { id: contactId as any }) as { email?: string; firstName?: string } | null
    if (!contact?.email) return NextResponse.json({ ok: false, error: "Ce contact n'a pas d'adresse email." }, { status: 400 })

    await sendOnboardingFormEmail({ to: contact.email, firstName: contact.firstName ?? null, formUrl: ONBOARDING_FORM_URL })
    return NextResponse.json({ ok: true, email: contact.email })
  } catch (err) {
    console.error('[onboarding/send-form] failed:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

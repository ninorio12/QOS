import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

// CAPTURE (étape 1 du flow public) : la fiche contact part dans le Data OS
// AVANT le calendrier. Si le prospect abandonne ensuite, le lead existe déjà
// (contact + lead + trace « à rappeler » avec funnel/UTM + parcours horodaté).
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  const secret = process.env.INTERNAL_API_SECRET
  if (!url || !secret) return NextResponse.json({ error: 'indisponible' }, { status: 503 })
  const cx = new ConvexHttpClient(url)

  let body: {
    firstName?: string; lastName?: string; email?: string; phone?: string
    answers?: { q: string; a: string }[]
    funnel?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'requête invalide' }, { status: 400 }) }

  const firstName = (body.firstName ?? '').trim()
  const email = (body.email ?? '').trim()
  if (!firstName || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: 'Prénom et email requis' }, { status: 400 })
  }

  try {
    const res = await cx.mutation(api.booking.capture, {
      slug: params.slug,
      firstName,
      lastName: (body.lastName ?? '').trim() || undefined,
      email,
      phone: (body.phone ?? '').trim() || undefined,
      answers: body.answers?.filter(x => x && x.q && x.a),
      funnel: (body.funnel ?? '').trim() || undefined,
      utmSource: (body.utmSource ?? '').trim() || undefined,
      utmMedium: (body.utmMedium ?? '').trim() || undefined,
      utmCampaign: (body.utmCampaign ?? '').trim() || undefined,
      secret,
    })
    return NextResponse.json({ ok: true, captureId: res.captureId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Échec de la capture' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getLinkConfig, getAvailableSlots } from '@/lib/bookingServer'
import { fmtTime } from '@/lib/booking'

export const dynamic = 'force-dynamic'

// Créneaux disponibles d'un lien de réservation sur une fenêtre [from, to].
// Public (pas de login) — n'expose jamais l'identité des hosts ni leurs agendas.
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const cfg = await getLinkConfig(params.slug)
  if (!cfg) return NextResponse.json({ error: 'introuvable' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const fromMs = Date.parse(searchParams.get('from') ?? '') || Date.now()
  const toMs = Date.parse(searchParams.get('to') ?? '') || (Date.now() + cfg.maxDaysAhead * 24 * 3600000)

  const slots = await getAvailableSlots(cfg, fromMs, toMs)

  // Regroupe par jour (dans le fuseau du lien) pour l'affichage.
  const byDay: Record<string, { start: string; label: string }[]> = {}
  for (const s of slots) {
    const dayKey = new Intl.DateTimeFormat('fr-CA', { timeZone: cfg.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(s.start))
    ;(byDay[dayKey] ??= []).push({ start: s.start, label: fmtTime(s.start, cfg.timezone) })
  }

  return NextResponse.json({
    timezone: cfg.timezone,
    durationMin: cfg.durationMin,
    days: Object.entries(byDay).map(([date, times]) => ({ date, times })).sort((a, b) => a.date.localeCompare(b.date)),
  })
}

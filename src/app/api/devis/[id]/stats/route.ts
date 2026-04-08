// src/app/api/devis/[id]/stats/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('devis')
    .select('montant_ht')
    .eq('id', params.id)
    .single()

  if (!current) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const ht = current.montant_ht ?? 0
  const min = ht * 0.5
  const max = ht * 1.5

  const { data: similaires } = await supabase
    .from('devis')
    .select('statut, montant_ht, created_at, envoye_le')
    .neq('id', params.id)
    .gte('montant_ht', min)
    .lte('montant_ht', max)

  const all = similaires ?? []
  const acceptes = all.filter(d => d.statut === 'accepté').length
  const refuses  = all.filter(d => d.statut === 'refusé').length
  const enCours  = all.filter(d => !['accepté', 'refusé'].includes(d.statut)).length
  const total    = acceptes + refuses

  const envoyes = all.filter(d => d.envoye_le && d.created_at)
  const delaiMoyen = envoyes.length > 0
    ? Math.round(
        envoyes.reduce((sum, d) => {
          const diff = new Date(d.envoye_le!).getTime() - new Date(d.created_at).getTime()
          return sum + diff / (1000 * 60 * 60 * 24)
        }, 0) / envoyes.length
      )
    : null

  const now = new Date()
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const thisMonth = all.filter(d => new Date(d.created_at) >= startThisMonth)
  const lastMonth = all.filter(d => {
    const d2 = new Date(d.created_at)
    return d2 >= startLastMonth && d2 < startThisMonth
  })

  function tauxAcceptation(list: typeof all) {
    const a = list.filter(d => d.statut === 'accepté').length
    const r = list.filter(d => d.statut === 'refusé').length
    return a + r > 0 ? Math.round((a / (a + r)) * 100) : null
  }

  const tauxCeMois   = tauxAcceptation(thisMonth)
  const tauxMoisPrec = tauxAcceptation(lastMonth)
  const evolution = (tauxCeMois !== null && tauxMoisPrec !== null)
    ? tauxCeMois - tauxMoisPrec
    : null

  return Response.json({
    taux_acceptation: total > 0 ? Math.round((acceptes / total) * 100) : null,
    delai_moyen_jours: delaiMoyen,
    evolution_pct: evolution,
    similaires: { acceptes, refuses, en_cours: enCours, total: all.length },
  })
}

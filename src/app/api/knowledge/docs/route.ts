import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MOCK_DOCS = [
  {
    id: 'mock-doc-1', slug: 'processus-de-vente', title: 'Processus de vente',
    content: '# Processus de vente VividFlow\n\n## Étapes\n1. Prise de contact et qualification\n2. Visite chantier et prise de mesures\n3. Génération du devis avec Kai\n4. Présentation et négociation\n5. Signature et acompte\n6. Planification des travaux\n\n## Points clés\n- Délai de réponse cible : < 2h\n- Taux de conversion visé : 35%\n- Panier moyen : 12 000 CHF',
    updated_at: new Date(Date.now() - 2 * 86_400_000).toISOString(), updated_by: 'thomas',
  },
  {
    id: 'mock-doc-2', slug: 'scripts-de-relance', title: 'Scripts de relance',
    content: '# Scripts de relance clients\n\n## Relance J+1 (SMS)\n"Bonjour [Prénom], suite à notre échange d\'hier, avez-vous des questions sur notre offre ? Je reste disponible. — VividFlow"\n\n## Relance J+3 (WhatsApp)\n"Bonjour [Prénom], je voulais m\'assurer que vous avez bien reçu notre devis. N\'hésitez pas à me contacter pour en discuter. Bonne journée !"\n\n## Relance J+7 (Appel)\nAborder : avancement décision, points bloquants, possibilité de révision du devis.',
    updated_at: new Date(Date.now() - 5 * 86_400_000).toISOString(), updated_by: 'thomas',
  },
  {
    id: 'mock-doc-3', slug: 'faq-clients', title: 'FAQ clients',
    content: '# FAQ Clients VividFlow\n\n**Q: Quels délais pour démarrer les travaux ?**\nR: Comptez 2 à 4 semaines après signature selon notre planning chantier.\n\n**Q: Proposez-vous des facilités de paiement ?**\nR: Oui — 30% à la commande, 40% à mi-chantier, 30% à réception.\n\n**Q: Intervenez-vous sur toute la Suisse romande ?**\nR: Principalement Genève, Vaud et Fribourg.\n\n**Q: Êtes-vous certifiés SIA ?**\nR: Oui, tous nos artisans sont certifiés et assurés RC professionnelle.',
    updated_at: new Date(Date.now() - 10 * 86_400_000).toISOString(), updated_by: 'thomas',
  },
  {
    id: 'mock-doc-4', slug: 'guide-devis', title: 'Guide devis',
    content: '# Guide de création des devis\n\n## Tarifs de référence (CHF/m²)\n- Ravalement façade enduit : 45–65 CHF/m²\n- Peinture extérieure : 25–40 CHF/m²\n- Isolation thermique (ITE) : 120–180 CHF/m²\n- Réfection balcons : 200–350 CHF/m²\n\n## Majorations\n- Hauteur > 6m : +15%\n- Accès difficile : +10–20%\n- Urgence < 2 semaines : +25%\n\n## Instructions pour Kai\nToujours inclure : description travaux, surface, prix unitaire, total HT, TVA 7.7%, total TTC, délai, garantie.',
    updated_at: new Date(Date.now() - 15 * 86_400_000).toISOString(), updated_by: 'thomas',
  },
]

// GET /api/knowledge/docs → list all
// GET /api/knowledge/docs?slug=xxx → get one
export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const slug = req.nextUrl.searchParams.get('slug')

  if (slug) {
    const { data, error } = await supabase
      .from('knowledge_docs')
      .select('*')
      .eq('slug', slug)
      .single()
    if (error) {
      const mock = MOCK_DOCS.find(d => d.slug === slug) ?? null
      return NextResponse.json({ doc: mock })
    }
    return NextResponse.json({ doc: data })
  }

  const { data, error } = await supabase
    .from('knowledge_docs')
    .select('id, slug, title, updated_at, updated_by')
    .order('updated_at', { ascending: false })

  if (error) {
    const mockList = MOCK_DOCS.map(({ id, slug, title, updated_at, updated_by }) => ({ id, slug, title, updated_at, updated_by }))
    return NextResponse.json({ docs: mockList })
  }
  return NextResponse.json({ docs: data ?? [] })
}

// POST /api/knowledge/docs → upsert { slug, title, content }
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json() as { slug: string; title: string; content: string; updated_by?: string }

  const { data, error } = await supabase
    .from('knowledge_docs')
    .upsert({
      slug:       body.slug,
      title:      body.title,
      content:    body.content,
      updated_by: body.updated_by ?? 'thomas',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ doc: data })
}

// DELETE /api/knowledge/docs → delete by slug in body
export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { slug } = await req.json() as { slug: string }
  if (!slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 })

  const { error } = await supabase.from('knowledge_docs').delete().eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: slug })
}

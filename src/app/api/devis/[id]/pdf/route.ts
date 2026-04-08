import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePdfFromHtml, buildDevisHtml } from '@/lib/apitemplate'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: devis } = await supabase.from('devis').select('*').eq('id', params.id).single()
  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const html = buildDevisHtml({
    titre:        devis.titre,
    contactName:  devis.contact_name ?? 'Client',
    contactEmail: devis.contact_email,
    contactPhone: devis.contact_phone,
    contenu:      devis.contenu,
    montantHt:    devis.montant_ht,
    date,
  })

  const pdfUrl = await generatePdfFromHtml(html)
  return Response.json({ pdf_url: pdfUrl })
}

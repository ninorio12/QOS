import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  try {
    // Récupérer les devis depuis Convex
    const devisList = await convex.query(api.devis.listDevis)
    
    // Formater les données pour l'interface existante
    const formattedDevis = devisList.map((devis: any) => ({
      id: devis.id,
      numero: devis.numero,
      contact_name: devis.contact_name,
      contact_email: devis.contact_email,
      contact_phone: devis.contact_phone || null,
      contact_id: null,
      conversation_id: null,
      titre: devis.titre,
      lignes: devis.lignes,
      montant_ht: devis.montant_ht,
      statut: devis.statut,
      created_at: devis.created_at,
      pdf_url: null,
      source: devis.source || 'manuel',
      envoye_le: null,
      notes: devis.notes || null,
      ville: devis.ville || null,
      date_validite: devis.date_validite || null,
      adresse_chantier: null,
      adresse_client: devis.adresse_client || null,
      signature_statut: devis.signature_statut || 'non_envoye',
      signature_vu_le: null,
      signature_signe_le: devis.signature_signe_le || null
    }))

    // Données mock pour settings (pour éviter les erreurs)
    const settings = [{
      key: 'company_name',
      value: 'Soren'
    }]

    return NextResponse.json({
      devisList: formattedDevis,
      settings
    })

  } catch (error) {
    console.error('Erreur API /api/devis/list:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des devis' },
      { status: 500 }
    )
  }
}
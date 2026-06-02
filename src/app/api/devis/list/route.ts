import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

export const dynamic = 'force-dynamic'

const MOCK_DEVIS = [
  { id: 'dev-1', numero: 'VF-2026-041', contact_name: 'Nicolas Pernet', contact_email: 'n.pernet@bluewin.ch', contact_phone: '+41 22 123 45 67', contact_id: null, conversation_id: null, titre: 'Façade crépi — 85m²', lignes: [{ description: 'Façade crépi projeté', quantite: 85, unite: 'm²', prix_unitaire: 194, total: 16490 }], montant_ht: 16490, statut: 'signe', created_at: new Date(Date.now() - 45 * 86400000).toISOString(), pdf_url: null, source: 'manuel', envoye_le: new Date(Date.now() - 44 * 86400000).toISOString(), notes: null, ville: 'Carouge', date_validite: new Date(Date.now() + 15 * 86400000).toISOString(), adresse_chantier: null, adresse_client: '12 Rue de la Croix, 1227 Carouge', signature_statut: 'signe', signature_vu_le: null, signature_signe_le: new Date(Date.now() - 40 * 86400000).toISOString() },
  { id: 'dev-2', numero: 'VF-2026-038', contact_name: 'Petra Lüthi', contact_email: 'petra.luethi@gmx.ch', contact_phone: '+41 31 890 12 34', contact_id: null, conversation_id: null, titre: 'Toiture ardoise — 120m²', lignes: [{ description: 'Toiture ardoise naturelle', quantite: 120, unite: 'm²', prix_unitaire: 185, total: 22200 }], montant_ht: 22200, statut: 'envoye', created_at: new Date(Date.now() - 28 * 86400000).toISOString(), pdf_url: null, source: 'manuel', envoye_le: new Date(Date.now() - 27 * 86400000).toISOString(), notes: null, ville: 'Bern', date_validite: new Date(Date.now() + 3 * 86400000).toISOString(), adresse_chantier: null, adresse_client: '8 Bundesgasse, 3011 Bern', signature_statut: 'vu', signature_vu_le: new Date(Date.now() - 25 * 86400000).toISOString(), signature_signe_le: null },
  { id: 'dev-3', numero: 'VF-2026-034', contact_name: 'Sophie Müller', contact_email: 'sophie.muller@bluewin.ch', contact_phone: '+41 76 234 56 78', contact_id: null, conversation_id: null, titre: 'Rénovation façade complète', lignes: [{ description: 'Ravalement + isolation ITE', quantite: 1, unite: 'forfait', prix_unitaire: 52000, total: 52000 }], montant_ht: 52000, statut: 'brouillon', created_at: new Date(Date.now() - 10 * 86400000).toISOString(), pdf_url: null, source: 'manuel', envoye_le: null, notes: 'En attente validation client', ville: 'Berne', date_validite: new Date(Date.now() + 30 * 86400000).toISOString(), adresse_chantier: null, adresse_client: '3 Bahnhofplatz, 3001 Bern', signature_statut: 'non_envoye', signature_vu_le: null, signature_signe_le: null },
  { id: 'dev-4', numero: 'VF-2026-029', contact_name: 'Marc Dubois', contact_email: 'marc.dubois@outlook.com', contact_phone: '+41 78 345 67 89', contact_id: null, conversation_id: null, titre: 'Toiture tuiles canal 95m²', lignes: [{ description: 'Pose tuiles canal + sous-couverture', quantite: 95, unite: 'm²', prix_unitaire: 165, total: 15675 }], montant_ht: 15675, statut: 'refuse', created_at: new Date(Date.now() - 55 * 86400000).toISOString(), pdf_url: null, source: 'formulaire', envoye_le: new Date(Date.now() - 54 * 86400000).toISOString(), notes: null, ville: 'Lausanne', date_validite: new Date(Date.now() - 25 * 86400000).toISOString(), adresse_chantier: null, adresse_client: '14 Avenue de la Gare, 1003 Lausanne', signature_statut: 'non_envoye', signature_vu_le: null, signature_signe_le: null },
  { id: 'dev-5', numero: 'VF-2026-044', contact_name: 'Thomas Favre', contact_email: 'thomas.favre@gmail.com', contact_phone: '+41 79 123 45 67', contact_id: null, conversation_id: null, titre: 'Isolation combles perdus', lignes: [{ description: 'Soufflage laine de verre', quantite: 60, unite: 'm²', prix_unitaire: 45, total: 2700 }], montant_ht: 2700, statut: 'brouillon', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), pdf_url: null, source: 'manuel', envoye_le: null, notes: null, ville: 'Genève', date_validite: new Date(Date.now() + 28 * 86400000).toISOString(), adresse_chantier: null, adresse_client: '5 Rue du Rhône, 1201 Genève', signature_statut: 'non_envoye', signature_vu_le: null, signature_signe_le: null },
]

export async function GET() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json({ devisList: MOCK_DEVIS, brandColor: '#FF4D00', settings: [{ key: 'company_name', value: 'VividFlow' }] })
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  try {
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
      value: 'VividFlow'
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
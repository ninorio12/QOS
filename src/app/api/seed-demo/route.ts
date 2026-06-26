import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SECRET = process.env.HERMES_SHARED_SECRET

const COMPANY = {
  id:          '00000000-0000-0000-0000-000000000001',
  name:        'SOREN',
  tagline:     'Construction · Rénovation · Aménagement',
  address:     '215, avenue Clément Ader\n34173 Castelnau-Le-Lez',
  phone:       '04 99 13 32 00',
  email:       'contact@soren.fr',
  siret:       '500 123 321 00012',
  capital:     '50 000 euros',
  tva_intra:   'FR 25 500 123 321',
  assurance:   'AssureurPro — 15, rue des assurances 34000 Montpellier — N° 450123',
  brand_color: '#d28e46',
  updated_at:  new Date().toISOString(),
}

const DEVIS_LIST = [
  {
    contact_name: 'Jean Dupont', contact_email: 'jean.dupont@email.fr', contact_phone: '06 12 34 56 78',
    titre: 'Rénovation de maison', ville: 'Castelnau', date_validite: '2026-08-18',
    adresse_chantier: '25, rue Jacques d\'Aragon\n34000 MONTPELLIER',
    adresse_client: '21, chemin des Vignes\n34130 MAUGUIO',
    notes: '4 mois à compter de la signature du devis', source: 'manuel',
    statut: 'envoyé', montant_ht: 8414.84,
    lignes: [
      { description: 'Porte fenêtre PVC blanc 3 vantaux 125×180 cm, vitrage isolant 4-16-4, pose incluse', quantite: 2, unite: 'U', prixUnitaire: 524.52, tvaRate: 10 },
      { description: 'Tableau abonné monophasé 9 circuits avec disjoncteurs magnétothermiques', quantite: 1, unite: 'U', prixUnitaire: 511.73, tvaRate: 20 },
      { description: 'Mitigeur thermostatique chromé bain-douche, montage et joints inclus', quantite: 1, unite: 'U', prixUnitaire: 573.94, tvaRate: 20 },
      { description: 'Escalier chêne artisanal 2 quarts tournant, 15 marches, garde-corps, vernissage 2 couches', quantite: 1, unite: 'U', prixUnitaire: 6279.65, tvaRate: 20 },
    ],
  },
  {
    contact_name: 'Sophie Martin', contact_email: 'sophie.martin@constructions-martin.fr', contact_phone: '06 87 65 43 21',
    titre: 'Extension ossature bois', ville: 'Montpellier',
    adresse_chantier: '12, rue des Oliviers\n34070 MONTPELLIER',
    adresse_client: '12, rue des Oliviers\n34070 MONTPELLIER',
    notes: 'Délai d\'exécution : 6 semaines', source: 'manuel',
    statut: 'accepté', montant_ht: 24750.00,
    lignes: [
      { description: 'Dalle béton armé 40m², épaisseur 15 cm, treillis soudé, finition lissée', quantite: 40, unite: 'm²', prixUnitaire: 185.00, tvaRate: 20 },
      { description: 'Charpente ossature bois Douglas traité autoclave, section 45×145 mm', quantite: 1, unite: 'forfait', prixUnitaire: 8200.00, tvaRate: 10 },
      { description: 'Bardage bois Mélèze naturel, pose claire-voie, 60m²', quantite: 60, unite: 'm²', prixUnitaire: 98.50, tvaRate: 10 },
      { description: 'Menuiserie alu gris anthracite : 2 baies coulissantes 200×215 cm + 1 fenêtre fixe', quantite: 1, unite: 'forfait', prixUnitaire: 4250.00, tvaRate: 10 },
    ],
  },
  {
    contact_name: 'Marc Bertrand', contact_email: 'marc@bertrand-renovation.fr', contact_phone: '06 23 45 67 89',
    titre: 'Réfection toiture tuiles canal', ville: 'Palavas-les-Flots',
    adresse_chantier: '8, avenue de la Mer\n34250 PALAVAS-LES-FLOTS',
    adresse_client: '5, avenue des Fleurs\n69003 LYON',
    notes: '', source: 'manuel',
    statut: 'brouillon', montant_ht: 12350.00,
    lignes: [
      { description: 'Dépose tuiles canal existantes, évacuation déchets en décharge agréée', quantite: 120, unite: 'm²', prixUnitaire: 22.00, tvaRate: 10 },
      { description: 'Nettoyage et traitement hydrofuge charpente', quantite: 120, unite: 'm²', prixUnitaire: 18.50, tvaRate: 10 },
      { description: 'Pose liteaux 27×40 + sous-toiture respirante', quantite: 120, unite: 'm²', prixUnitaire: 28.00, tvaRate: 10 },
      { description: 'Fourniture et pose tuiles canal terre cuite naturelle, faîtage et rives inclus', quantite: 120, unite: 'm²', prixUnitaire: 54.00, tvaRate: 10 },
    ],
  },
  {
    contact_name: 'Isabelle Fontaine', contact_email: 'i.fontaine@gmail.com', contact_phone: '07 45 12 36 98',
    titre: 'Rénovation salle de bain complète', ville: 'Castries',
    adresse_chantier: '3, impasse des Pins\n34160 CASTRIES',
    adresse_client: '3, impasse des Pins\n34160 CASTRIES',
    notes: 'Client prioritaire — planning semaine 28', source: 'manuel',
    statut: 'brouillon', montant_ht: 5890.00,
    lignes: [
      { description: 'Dépose complète équipements existants, évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 650.00, tvaRate: 10 },
      { description: 'Carrelage grès cérame 60×60 murs et sol, pose collée joint époxy', quantite: 18, unite: 'm²', prixUnitaire: 125.00, tvaRate: 10 },
      { description: 'Receveur extra-plat 90×90 + paroi douche verre 8mm, finition chromée', quantite: 1, unite: 'U', prixUnitaire: 1890.00, tvaRate: 20 },
      { description: 'Meuble vasque suspendu 120 cm chêne naturel + robinetterie encastrée', quantite: 1, unite: 'U', prixUnitaire: 1250.00, tvaRate: 20 },
    ],
  },
  {
    contact_name: 'Éric Rousseau', contact_email: 'eric.rousseau@btp-rousseau.com', contact_phone: '06 11 22 33 44',
    titre: 'Aménagement combles perdus en suite parentale', ville: 'Grabels',
    adresse_chantier: '17, route de Grabels\n34790 GRABELS',
    adresse_client: '17, route de Grabels\n34790 GRABELS',
    notes: 'Devis refusé — budget insuffisant', source: 'manuel',
    statut: 'refusé', montant_ht: 31200.00,
    lignes: [
      { description: 'Isolation rampants laine de verre 200mm + pare-vapeur', quantite: 65, unite: 'm²', prixUnitaire: 85.00, tvaRate: 10 },
      { description: 'Cloisons placo BA13 double peau + portes bois massif', quantite: 1, unite: 'forfait', prixUnitaire: 6800.00, tvaRate: 20 },
      { description: 'Plancher OSB 22mm + chape fluide 6cm, sol chauffant électrique', quantite: 65, unite: 'm²', prixUnitaire: 195.00, tvaRate: 10 },
      { description: 'Velux triple vitrage 78×118 cm, pose étanche, volets roulants solaires', quantite: 3, unite: 'U', prixUnitaire: 1850.00, tvaRate: 10 },
    ],
  },
]

export async function POST(req: NextRequest) {
  if (!SECRET) return NextResponse.json({ error: 'not configured' }, { status: 500 })
  const secret = req.headers.get('x-seed-secret')
  if (!secret || secret.length !== SECRET.length || Buffer.from(secret).compare(Buffer.from(SECRET)) !== 0) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 1. Company settings
  const { error: csErr } = await admin
    .from('company_settings')
    .upsert(COMPANY, { onConflict: 'id' })
  if (csErr) return NextResponse.json({ error: 'company_settings: ' + csErr.message }, { status: 500 })

  // 2. Devis
  const year = new Date().getFullYear()
  const { data: existing } = await admin.from('devis').select('numero').like('numero', `${year}-%`).order('numero', { ascending: false }).limit(1).maybeSingle()
  let counter = existing?.numero ? parseInt(existing.numero.split('-')[1] ?? '0', 10) : 0

  const created = []
  for (const d of DEVIS_LIST) {
    counter++
    const numero = `${year}-${String(counter).padStart(3, '0')}`
    const { data, error } = await admin.from('devis').insert({ ...d, numero }).select('id, numero, titre, statut').single()
    if (error) return NextResponse.json({ error: `devis ${numero}: ${error.message}` }, { status: 500 })
    created.push(data)
  }

  // 3. Local pipeline opportunities
  await admin.from('local_opportunities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const LEADS = [
    { name: 'Jean Dupont',      company: 'Dupont Construction',     email: 'jean.dupont@email.fr',              phone: '06 12 34 56 78', value: 8500,  source: 'Site web',  stage_id: 'stage-gagne' },
    { name: 'Sophie Martin',    company: 'Martin Rénovation',       email: 'sophie.martin@martin-renov.fr',     phone: '06 87 65 43 21', value: 24750, source: 'Référence', stage_id: 'stage-gagne' },
    { name: 'Marc Bertrand',    company: 'Bertrand BTP',            email: 'marc@bertrand-btp.fr',              phone: '06 23 45 67 89', value: 12350, source: 'Site web',  stage_id: 'stage-negociation' },
    { name: 'Isabelle Fontaine',company: '',                        email: 'i.fontaine@gmail.com',              phone: '07 45 12 36 98', value: 5890,  source: 'Appel',     stage_id: 'stage-proposition' },
    { name: 'Éric Rousseau',    company: 'BTP Rousseau',            email: 'eric.rousseau@btp-rousseau.com',    phone: '06 11 22 33 44', value: 31200, source: 'LinkedIn',  stage_id: 'stage-proposition' },
    { name: 'Claire Mercier',   company: 'Atelier Mercier',         email: 'claire@atelier-mercier.fr',         phone: '06 55 44 33 22', value: 7200,  source: 'Référence', stage_id: 'stage-qualif' },
    { name: 'Antoine Leblanc',  company: 'Leblanc Immobilier',      email: 'a.leblanc@leblanc-immo.fr',         phone: '06 99 88 77 66', value: 18500, source: 'Site web',  stage_id: 'stage-qualif' },
    { name: 'Nadia Benali',     company: '',                        email: 'nadia.benali@gmail.com',            phone: '07 11 22 33 44', value: 3400,  source: 'Appel',     stage_id: 'stage-nouveau' },
    { name: 'Franck Girard',    company: 'Girard Aménagement',      email: 'f.girard@girard-amenagement.fr',    phone: '06 44 55 66 77', value: 9800,  source: 'LinkedIn',  stage_id: 'stage-nouveau' },
    { name: 'Patricia Morel',   company: 'Résidences du Midi',      email: 'p.morel@residences-midi.fr',        phone: '06 77 88 99 00', value: 42000, source: 'Référence', stage_id: 'stage-nouveau' },
  ]
  const { error: leadsErr } = await admin.from('local_opportunities').insert(LEADS)
  if (leadsErr) return NextResponse.json({ error: 'leads: ' + leadsErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, company: 'updated', devis: created, leads: LEADS.length })
}

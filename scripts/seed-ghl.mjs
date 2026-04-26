/**
 * Seed GHL — crée 12 contacts BTP + leurs opportunités réparties sur les stages
 * Usage : node scripts/seed-ghl.mjs
 */

const API_KEY     = 'pit-61ab7722-55e9-414b-8f03-b7eb2664ba1f'
const LOCATION_ID = 'VZxWSmcMt2Hdtae8RuPs'
const BASE_URL    = 'https://services.leadconnectorhq.com'

const HEADERS = {
  Authorization:  `Bearer ${API_KEY}`,
  Version:        '2021-07-28',
  'Content-Type': 'application/json',
}

async function ghl(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`❌ GHL ${res.status} ${path}:`, text.slice(0, 200))
    return null
  }
  return JSON.parse(text)
}

// ─── Contacts à créer ────────────────────────────────────────────
const CONTACTS = [
  { firstName: 'Martin',   lastName: 'Dupont',   phone: '+33612345001', email: 'martin.dupont@reno-pro.fr',    company: 'Réno Pro Île-de-France',    tags: ['btp', 'rénovation'] },
  { firstName: 'Sophie',   lastName: 'Renard',   phone: '+33612345002', email: 'sophie.renard@batisud.fr',     company: 'BatiSud SARL',              tags: ['btp', 'neuf'] },
  { firstName: 'Carlos',   lastName: 'Mendes',   phone: '+33612345003', email: 'carlos.mendes@cmtravaux.fr',   company: 'CM Travaux',                tags: ['rénovation'] },
  { firstName: 'Julie',    lastName: 'Moreau',   phone: '+33612345004', email: 'julie.moreau@artisanpro.fr',   company: 'Artisan Pro 75',            tags: ['btp', 'particulier'] },
  { firstName: 'Thomas',   lastName: 'Bernard',  phone: '+33612345005', email: 'thomas.bernard@bnbatiment.fr', company: 'BN Bâtiment',               tags: ['btp'] },
  { firstName: 'Inès',     lastName: 'Duprez',   phone: '+33612345006', email: 'ines.duprez@maconnerie69.fr',  company: 'Maçonnerie du Rhône',       tags: ['maçonnerie'] },
  { firstName: 'Xavier',   lastName: 'Lambert',  phone: '+33612345007', email: 'xavier.lambert@xlbtp.fr',      company: 'XL BTP',                    tags: ['btp', 'gros oeuvre'] },
  { firstName: 'Didier',   lastName: 'Fabre',    phone: '+33612345008', email: 'didier.fabre@fabre-elec.fr',   company: 'Fabre Électricité',         tags: ['électricité'] },
  { firstName: 'Marie',    lastName: 'Colin',    phone: '+33612345009', email: 'marie.colin@colinplomberie.fr','company': 'Colin Plomberie Chauffage', tags: ['plomberie'] },
  { firstName: 'Antoine',  lastName: 'Petit',    phone: '+33612345010', email: 'antoine.petit@petitreno.fr',   company: 'Petit Rénovation',          tags: ['rénovation', 'btp'] },
  { firstName: 'Camille',  lastName: 'Simon',    phone: '+33612345011', email: 'camille.simon@simontravaux.fr','company': 'Simon Travaux',            tags: ['btp'] },
  { firstName: 'Romain',   lastName: 'Garcia',   phone: '+33612345012', email: 'romain.garcia@rgconstruction.fr','company': 'RG Construction',        tags: ['construction', 'neuf'] },
]

// ─── Valeurs réalistes ────────────────────────────────────────────
const VALUES = [2800, 4500, 6200, 3100, 8900, 5400, 7200, 3800, 12000, 4100, 6800, 9500]

async function main() {
  console.log('🚀 Seed GHL démarré\n')

  // 1. Récupérer les pipelines
  console.log('📋 Récupération des pipelines...')
  const pipelineData = await ghl('GET', `/opportunities/pipelines?locationId=${LOCATION_ID}`)
  if (!pipelineData?.pipelines?.length) {
    console.error('❌ Aucun pipeline trouvé. Crée d\'abord un pipeline dans GHL.')
    process.exit(1)
  }

  const pipeline = pipelineData.pipelines[0]
  console.log(`✅ Pipeline trouvé : "${pipeline.name}" (${pipeline.stages.length} stages)\n`)
  pipeline.stages.forEach((s, i) => console.log(`   ${i + 1}. ${s.name}`))
  console.log()

  // 2. Créer les contacts + opportunités
  let createdContacts = 0
  let createdOpps     = 0
  let errors          = 0

  for (let i = 0; i < CONTACTS.length; i++) {
    const c = CONTACTS[i]

    // Créer le contact
    process.stdout.write(`👤 ${c.firstName} ${c.lastName}... `)
    const contactRes = await ghl('POST', '/contacts/', {
      locationId: LOCATION_ID,
      firstName:  c.firstName,
      lastName:   c.lastName,
      phone:      c.phone,
      email:      c.email,
      companyName: c.company,
      tags:       c.tags,
      source:     'seed-script',
    })

    if (!contactRes?.contact?.id) {
      console.log('⚠️  contact déjà existant ou erreur, skip')
      errors++
      continue
    }

    createdContacts++
    const contactId = contactRes.contact.id

    // Choisir un stage (distribuer équitablement)
    const stageIndex = i % pipeline.stages.length
    const stage      = pipeline.stages[stageIndex]
    const value      = VALUES[i]

    // Créer l'opportunité
    const oppRes = await ghl('POST', '/opportunities/', {
      pipelineId:      pipeline.id,
      locationId:      LOCATION_ID,
      contactId,
      pipelineStageId: stage.id,
      name:            `${c.firstName} ${c.lastName} — ${c.company}`,
      monetaryValue:   value,
      status:          'open',
      assignedTo:      '',
    })

    if (oppRes?.opportunity?.id) {
      createdOpps++
      console.log(`✅ (${stage.name}, €${value.toLocaleString('fr-FR')})`)
    } else {
      console.log(`⚠️  opportunité échouée`)
      errors++
    }

    // Pause légère pour éviter rate limit
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\n─────────────────────────────')
  console.log(`✅ ${createdContacts} contacts créés`)
  console.log(`✅ ${createdOpps} opportunités créées`)
  if (errors) console.log(`⚠️  ${errors} erreurs`)
  console.log('\n🎉 Seed terminé — actualise ton app sur localhost:3001')
}

main().catch(console.error)

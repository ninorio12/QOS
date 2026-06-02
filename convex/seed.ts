import { mutation } from "./_generated/server"

const CONTACTS = [
  {
    firstName:   'Thomas',
    lastName:    'Favre',
    email:       'thomas.favre@architecte-favre.ch',
    phone:       '+41791234567',
    companyName: 'Favre Architecture Sàrl',
    source:      'inbound',
    statut:      'client',
    canton:      'GE',
    metier:      'Architecte',
    niche:       'Immobilier & Construction',
    tags:        ['premium', 'référence'],
    notes:       'Client fidèle depuis 2023. Projet villa à Genève.',
  },
  {
    firstName:   'Yasmine',
    lastName:    'Benali',
    email:       'y.benali@digitalzen.io',
    phone:       '+41764567890',
    companyName: 'DigitalZen Agency',
    source:      'outbound',
    statut:      'lead',
    canton:      'VD',
    metier:      'Directrice Marketing',
    niche:       'Marketing Digital',
    tags:        ['chaud', 'relance'],
    notes:       'Contactée via LinkedIn. Intéressée par le coaching business.',
  },
  {
    firstName:   'Marc-Antoine',
    lastName:    'Dupuis',
    email:       'mdupuis@dupuis-finance.ch',
    phone:       '+41316789012',
    companyName: 'Dupuis & Associés Finance',
    source:      'inbound',
    statut:      'perdu',
    canton:      'BE',
    metier:      'Conseiller financier',
    niche:       'Finance & Patrimoine',
    tags:        ['perdu', 'budget'],
    notes:       'Budget insuffisant pour l\'offre premium. Recontacter en Q3.',
  },
  {
    firstName:   'Sofia',
    lastName:    'Keller',
    email:       'sofia@welness-keller.ch',
    phone:       '+41782345678',
    companyName: 'Keller Wellness Studio',
    source:      'inbound',
    statut:      'client',
    canton:      'ZH',
    metier:      'Coach bien-être',
    niche:       'Santé & Bien-être',
    tags:        ['client', 'actif'],
    notes:       'Studio de yoga + coaching. Excellents résultats.',
  },
  {
    firstName:   'Romain',
    lastName:    'Schneider',
    email:       'r.schneider@schneider-tech.ch',
    phone:       '+41443456789',
    companyName: 'Schneider Tech GmbH',
    source:      'outbound',
    statut:      'lead',
    canton:      'SG',
    metier:      'CEO Tech',
    niche:       'SaaS & Technologie',
    tags:        ['startup', 'potentiel'],
    notes:       'Startup B2B SaaS. RDV de démo prévu la semaine prochaine.',
  },
]

export const seedContacts = mutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("crm_contacts").collect()
    if (existing.length > 0) return { message: 'Already seeded', count: existing.length }

    const ids = []
    for (const contact of CONTACTS) {
      const id = await ctx.db.insert("crm_contacts", {
        ...contact,
        createdAt: new Date().toISOString(),
      })
      ids.push(id)
    }
    return { message: 'Seeded successfully', count: ids.length }
  },
})

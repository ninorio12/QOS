// Mock data for demo mode (when no auth context is available)

const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()

export const MOCK_CONTACTS = [
  { id: 'mock-1', contactName: 'Thomas Favre', firstName: 'Thomas', lastName: 'Favre', email: 'thomas.favre@gmail.com', phone: '+41 79 123 45 67', companyName: 'Favre & Associés SA', dateAdded: daysAgo(2), dateUpdated: daysAgo(0), tags: ['facade', 'chaud'], source: null, assignedTo: null, city: 'Genève', state: 'GE', postalCode: '1201', country: 'CH', customFields: [] },
  { id: 'mock-2', contactName: 'Sophie Müller', firstName: 'Sophie', lastName: 'Müller', email: 'sophie.muller@bluewin.ch', phone: '+41 76 234 56 78', companyName: 'Müller Immobilier', dateAdded: daysAgo(5), dateUpdated: daysAgo(1), tags: ['client', 'renovation'], source: null, assignedTo: null, city: 'Berne', state: 'BE', postalCode: '3001', country: 'CH', customFields: [] },
  { id: 'mock-3', contactName: 'Marc Dubois', firstName: 'Marc', lastName: 'Dubois', email: 'marc.dubois@outlook.com', phone: '+41 78 345 67 89', companyName: 'Dubois Construction', dateAdded: daysAgo(8), dateUpdated: daysAgo(2), tags: ['facade', 'prospect'], source: null, assignedTo: null, city: 'Lausanne', state: 'VD', postalCode: '1003', country: 'CH', customFields: [] },
  { id: 'mock-4', contactName: 'Laura Bernasconi', firstName: 'Laura', lastName: 'Bernasconi', email: 'l.bernasconi@ticino.ch', phone: '+41 91 456 78 90', companyName: 'Bernasconi Travaux', dateAdded: daysAgo(12), dateUpdated: daysAgo(3), tags: ['toiture', 'client'], source: null, assignedTo: null, city: 'Lugano', state: 'TI', postalCode: '6900', country: 'CH', customFields: [] },
  { id: 'mock-5', contactName: 'Jean-Pierre Rochat', firstName: 'Jean-Pierre', lastName: 'Rochat', email: 'jp.rochat@sunrise.ch', phone: '+41 79 567 89 01', companyName: null, dateAdded: daysAgo(15), dateUpdated: daysAgo(4), tags: ['facade', 'chaud', 'rendez-vous'], source: null, assignedTo: null, city: 'Fribourg', state: 'FR', postalCode: '1700', country: 'CH', customFields: [] },
  { id: 'mock-6', contactName: 'Claudia Zimmermann', firstName: 'Claudia', lastName: 'Zimmermann', email: 'c.zimmermann@zuerich.com', phone: '+41 44 678 90 12', companyName: 'Zimmermann AG', dateAdded: daysAgo(20), dateUpdated: daysAgo(5), tags: ['isolation', 'prospect'], source: null, assignedTo: null, city: 'Zürich', state: 'ZH', postalCode: '8001', country: 'CH', customFields: [] },
  { id: 'mock-7', contactName: 'Antoine Gauthier', firstName: 'Antoine', lastName: 'Gauthier', email: 'a.gauthier@gmail.com', phone: '+41 76 789 01 23', companyName: 'Gauthier Rénovations', dateAdded: daysAgo(22), dateUpdated: daysAgo(6), tags: ['facade', 'devis-envoyé'], source: null, assignedTo: null, city: 'Neuchâtel', state: 'NE', postalCode: '2000', country: 'CH', customFields: [] },
  { id: 'mock-8', contactName: 'Petra Lüthi', firstName: 'Petra', lastName: 'Lüthi', email: 'petra.luethi@gmx.ch', phone: '+41 31 890 12 34', companyName: 'Lüthi Bau GmbH', dateAdded: daysAgo(28), dateUpdated: daysAgo(7), tags: ['toiture', 'client', 'facture-payée'], source: null, assignedTo: null, city: 'Bern', state: 'BE', postalCode: '3011', country: 'CH', customFields: [] },
  { id: 'mock-9', contactName: 'Stéphane Fontaine', firstName: 'Stéphane', lastName: 'Fontaine', email: 's.fontaine@lematin.ch', phone: '+41 21 901 23 45', companyName: null, dateAdded: daysAgo(35), dateUpdated: daysAgo(10), tags: ['facade'], source: null, assignedTo: null, city: 'Morges', state: 'VD', postalCode: '1110', country: 'CH', customFields: [] },
  { id: 'mock-10', contactName: 'Ursula Keller', firstName: 'Ursula', lastName: 'Keller', email: 'u.keller@hispeed.ch', phone: '+41 52 012 34 56', companyName: 'Keller Sanitaire', dateAdded: daysAgo(40), dateUpdated: daysAgo(12), tags: ['prospect', 'froid'], source: null, assignedTo: null, city: 'Winterthur', state: 'ZH', postalCode: '8400', country: 'CH', customFields: [] },
  { id: 'mock-11', contactName: 'Nicolas Pernet', firstName: 'Nicolas', lastName: 'Pernet', email: 'n.pernet@bluewin.ch', phone: '+41 22 123 45 67', companyName: 'Pernet SA', dateAdded: daysAgo(45), dateUpdated: daysAgo(15), tags: ['facade', 'signé'], source: null, assignedTo: null, city: 'Carouge', state: 'GE', postalCode: '1227', country: 'CH', customFields: [] },
  { id: 'mock-12', contactName: 'Isabelle Roth', firstName: 'Isabelle', lastName: 'Roth', email: 'i.roth@aargau.ch', phone: '+41 62 234 56 78', companyName: 'Roth Elektro', dateAdded: daysAgo(50), dateUpdated: daysAgo(18), tags: ['isolation', 'client'], source: null, assignedTo: null, city: 'Aarau', state: 'AG', postalCode: '5000', country: 'CH', customFields: [] },
]

// Format for pipeline server page (uses stage IDs matching the default pipeline)
export const MOCK_PIPELINE_OPPS = [
  { id: 'opp-1', name: 'Thomas Favre',        company: 'Favre & Associés SA',   value: 28500, source: 'Meta Ads', createdAt: daysAgo(3).split('T')[0],  initials: 'TF', stageId: 'r1',             pipelineId: 'leads', email: 'thomas.favre@gmail.com',      phone: '+41 79 123 45 67', contactId: 'mock-1',  tags: ['facade', 'chaud'],           status: 'open' as const },
  { id: 'opp-2', name: 'Sophie Müller',        company: 'Müller Immobilier',      value: 52000, source: 'Meta Ads', createdAt: daysAgo(6).split('T')[0],  initials: 'SM', stageId: 'r2',             pipelineId: 'leads', email: 'sophie.muller@bluewin.ch',    phone: '+41 76 234 56 78', contactId: 'mock-2',  tags: ['renovation'],                status: 'open' as const },
  { id: 'opp-3', name: 'Marc Dubois',          company: 'Dubois Construction',    value: 18900, source: '',         createdAt: daysAgo(9).split('T')[0],  initials: 'MD', stageId: 'conversation',   pipelineId: 'leads', email: 'marc.dubois@outlook.com',     phone: '+41 78 345 67 89', contactId: 'mock-3',  tags: ['facade'],                    status: 'open' as const },
  { id: 'opp-4', name: 'Laura Bernasconi',     company: 'Bernasconi Travaux',     value: 34200, source: '',         createdAt: daysAgo(14).split('T')[0], initials: 'LB', stageId: 'r2',             pipelineId: 'leads', email: 'l.bernasconi@ticino.ch',      phone: '+41 91 456 78 90', contactId: 'mock-4',  tags: ['toiture'],                   status: 'open' as const },
  { id: 'opp-5', name: 'Jean-Pierre Rochat',   company: '',                       value: 22000, source: 'Meta Ads', createdAt: daysAgo(1).split('T')[0],  initials: 'JR', stageId: 'nouveau-lead',   pipelineId: 'leads', email: 'jp.rochat@sunrise.ch',        phone: '+41 79 567 89 01', contactId: 'mock-5',  tags: ['facade', 'chaud'],           status: 'open' as const },
  { id: 'opp-6', name: 'Claudia Zimmermann',   company: 'Zimmermann AG',          value: 41000, source: '',         createdAt: daysAgo(18).split('T')[0], initials: 'CZ', stageId: 'r1',             pipelineId: 'leads', email: 'c.zimmermann@zuerich.com',    phone: '+41 44 678 90 12', contactId: 'mock-6',  tags: ['isolation'],                 status: 'open' as const },
  { id: 'opp-7', name: 'Antoine Gauthier',     company: 'Gauthier Rénovations',   value: 9800,  source: '',         createdAt: daysAgo(22).split('T')[0], initials: 'AG', stageId: 'r1',             pipelineId: 'leads', email: 'a.gauthier@gmail.com',        phone: '+41 76 789 01 23', contactId: 'mock-7',  tags: ['facade'],                    status: 'open' as const },
  { id: 'opp-8', name: 'Nicolas Pernet',       company: 'Pernet SA',              value: 16500, source: 'Meta Ads', createdAt: daysAgo(60).split('T')[0], initials: 'NP', stageId: 'nouveau-client', pipelineId: 'leads', email: 'n.pernet@bluewin.ch',         phone: '+41 22 123 45 67', contactId: 'mock-11', tags: ['signé'],                     status: 'won'  as const },
  { id: 'opp-9', name: 'Ursula Keller',        company: 'Keller Sanitaire',       value: 12000, source: '',         createdAt: daysAgo(40).split('T')[0], initials: 'UK', stageId: 'conversation',   pipelineId: 'leads', email: 'u.keller@hispeed.ch',         phone: '+41 52 012 34 56', contactId: 'mock-10', tags: ['prospect'],                  status: 'open' as const },
  { id: 'opp-10', name: 'Petra Lüthi',         company: 'Lüthi Bau GmbH',         value: 22200, source: '',         createdAt: daysAgo(28).split('T')[0], initials: 'PL', stageId: 'nouveau-client', pipelineId: 'leads', email: 'petra.luethi@gmx.ch',         phone: '+41 31 890 12 34', contactId: 'mock-8',  tags: ['toiture', 'client'],         status: 'won'  as const },
]

const PIPELINE_ID = 'mock-pipeline-1'
const STAGE_IDS = { nouveau: 'stage-1', contact: 'stage-2', rdv: 'stage-3', devis: 'stage-4', nego: 'stage-5', gagne: 'stage-6' }

export const MOCK_PIPELINES = [
  {
    id: PIPELINE_ID,
    name: 'ACQUISITION',
    stages: [
      { id: STAGE_IDS.nouveau,  name: 'Nouveau lead',    color: '#6366F1', position: 0 },
      { id: STAGE_IDS.contact,  name: '1er Contact',     color: '#3462EE', position: 1 },
      { id: STAGE_IDS.rdv,      name: 'RDV Planifié',    color: '#0EA5E9', position: 2 },
      { id: STAGE_IDS.devis,    name: 'Devis Envoyé',    color: '#14B8A6', position: 3 },
      { id: STAGE_IDS.nego,     name: 'Négociation',     color: '#F97316', position: 4 },
      { id: STAGE_IDS.gagne,    name: 'Gagné',           color: '#22C55E', position: 5 },
    ],
  },
]

export const MOCK_OPPS = [
  { id: 'opp-1', name: 'Favre - Façade 120m²', contactName: 'Thomas Favre', contactId: 'mock-1', value: 28500, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_IDS.rdv, status: 'open' as const, createdAt: daysAgo(3), updatedAt: daysAgo(0), initials: 'TF', color: '#3462EE', avatarBg: '#3462EE22', avatarColor: '#3462EE' },
  { id: 'opp-2', name: 'Müller - Rénovation complète', contactName: 'Sophie Müller', contactId: 'mock-2', value: 52000, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_IDS.devis, status: 'open' as const, createdAt: daysAgo(6), updatedAt: daysAgo(1), initials: 'SM', color: '#8B5CF6', avatarBg: '#8B5CF622', avatarColor: '#8B5CF6' },
  { id: 'opp-3', name: 'Dubois - Toiture ardoise', contactName: 'Marc Dubois', contactId: 'mock-3', value: 18900, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_IDS.contact, status: 'open' as const, createdAt: daysAgo(9), updatedAt: daysAgo(2), initials: 'MD', color: '#0EA5E9', avatarBg: '#0EA5E922', avatarColor: '#0EA5E9' },
  { id: 'opp-4', name: 'Bernasconi - Isolation ITE', contactName: 'Laura Bernasconi', contactId: 'mock-4', value: 34200, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_IDS.nego, status: 'open' as const, createdAt: daysAgo(14), updatedAt: daysAgo(3), initials: 'LB', color: '#F97316', avatarBg: '#F9731622', avatarColor: '#F97316' },
  { id: 'opp-5', name: 'Rochat - Façade bois', contactName: 'Jean-Pierre Rochat', contactId: 'mock-5', value: 22000, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_IDS.nouveau, status: 'open' as const, createdAt: daysAgo(1), updatedAt: daysAgo(0), initials: 'JR', color: '#6366F1', avatarBg: '#6366F122', avatarColor: '#6366F1' },
  { id: 'opp-6', name: 'Zimmermann - Ravalement', contactName: 'Claudia Zimmermann', contactId: 'mock-6', value: 41000, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_IDS.devis, status: 'open' as const, createdAt: daysAgo(18), updatedAt: daysAgo(5), initials: 'CZ', color: '#14B8A6', avatarBg: '#14B8A622', avatarColor: '#14B8A6' },
  { id: 'opp-7', name: 'Gauthier - Isolation combles', contactName: 'Antoine Gauthier', contactId: 'mock-7', value: 9800, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_IDS.rdv, status: 'open' as const, createdAt: daysAgo(22), updatedAt: daysAgo(6), initials: 'AG', color: '#EC4899', avatarBg: '#EC489922', avatarColor: '#EC4899' },
  { id: 'opp-8', name: 'Pernet - Façade crépi', contactName: 'Nicolas Pernet', contactId: 'mock-11', value: 16500, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_IDS.gagne, status: 'won' as const, createdAt: daysAgo(60), updatedAt: daysAgo(10), initials: 'NP', color: '#22C55E', avatarBg: '#22C55E22', avatarColor: '#22C55E' },
]

export const MOCK_TASKS = [
  { id: 'task-1', title: 'Appeler Thomas Favre', description: 'Confirmer le RDV du 5 juin à 14h', status: 'pending', priority: 'high', agent: 'kai', contact_name: 'Thomas Favre', due_date: daysAgo(-1), created_at: daysAgo(1) },
  { id: 'task-2', title: 'Envoyer devis Müller', description: 'Devis façade 120m² + isolation — CHF 52\'000', status: 'pending', priority: 'high', agent: 'kai', contact_name: 'Sophie Müller', due_date: daysAgo(-2), created_at: daysAgo(2) },
  { id: 'task-3', title: 'Relance Zimmermann', description: 'Pas de réponse depuis 5 jours', status: 'pending', priority: 'medium', agent: 'mia', contact_name: 'Claudia Zimmermann', due_date: daysAgo(0), created_at: daysAgo(3) },
  { id: 'task-4', title: 'Préparer visite Dubois', description: 'Mesures toiture ardoise à Lausanne', status: 'in_progress', priority: 'medium', agent: 'kai', contact_name: 'Marc Dubois', due_date: daysAgo(-3), created_at: daysAgo(5) },
  { id: 'task-5', title: 'Suivi Bernasconi contrat', description: 'Vérifier signature contrat ITE', status: 'completed', priority: 'low', agent: 'hermes', contact_name: 'Laura Bernasconi', due_date: daysAgo(2), created_at: daysAgo(7) },
]

export const MOCK_CONVERSATIONS = [
  { id: 'conv-1', contactName: 'Thomas Favre', contactId: 'mock-1', lastMessage: 'Parfait, je serai disponible jeudi à 14h pour la visite.', lastMessageDate: daysAgo(0), channel: 'whatsapp' as const, unread: 2, status: 'open', opportunityValue: 28500 },
  { id: 'conv-2', contactName: 'Sophie Müller', contactId: 'mock-2', lastMessage: 'Pouvez-vous me faire parvenir le devis détaillé ?', lastMessageDate: daysAgo(1), channel: 'email' as const, unread: 1, status: 'open', opportunityValue: 52000 },
  { id: 'conv-3', contactName: 'Marc Dubois', contactId: 'mock-3', lastMessage: 'Bonjour, je suis intéressé par votre offre façade.', lastMessageDate: daysAgo(2), channel: 'sms' as const, unread: 0, status: 'open', opportunityValue: 18900 },
  { id: 'conv-4', contactName: 'Jean-Pierre Rochat', contactId: 'mock-5', lastMessage: "D'accord, envoyez-moi plus d'informations.", lastMessageDate: daysAgo(3), channel: 'email' as const, unread: 0, status: 'open', opportunityValue: 22000 },
  { id: 'conv-5', contactName: 'Claudia Zimmermann', contactId: 'mock-6', lastMessage: 'Je dois en discuter avec mon mari avant de décider.', lastMessageDate: daysAgo(5), channel: 'whatsapp' as const, unread: 0, status: 'open', opportunityValue: 41000 },
]

export const MOCK_DASHBOARD = {
  metrics: {
    totalContacts:  12,
    pipelineValue:  222900,
    activeDeals:    7,
    wonDeals:       1,
    totalDeals:     8,
  },
  funnel: [
    { label: 'Nouveau lead',  count: 1, value: 22000,  color: '#6366F1', pct: 14 },
    { label: '1er Contact',   count: 1, value: 18900,  color: '#3462EE', pct: 14 },
    { label: 'RDV Planifié',  count: 2, value: 50500,  color: '#0EA5E9', pct: 29 },
    { label: 'Devis Envoyé',  count: 2, value: 93000,  color: '#14B8A6', pct: 29 },
    { label: 'Négociation',   count: 1, value: 34200,  color: '#F97316', pct: 14 },
    { label: 'Gagné',         count: 1, value: 16500,  color: '#22C55E', pct: 14 },
  ],
  recentOpps: [
    { id: 'opp-5', contactName: 'Jean-Pierre Rochat', value: 22000, stage: 'Nouveau lead', tag: 'facade', date: daysAgo(0), color: '#6366F122', textColor: '#6366F1' },
    { id: 'opp-1', contactName: 'Thomas Favre',        value: 28500, stage: 'RDV Planifié', tag: 'rdv',    date: daysAgo(3), color: '#0EA5E922', textColor: '#0EA5E9' },
    { id: 'opp-2', contactName: 'Sophie Müller',       value: 52000, stage: 'Devis Envoyé', tag: 'devis',  date: daysAgo(6), color: '#14B8A622', textColor: '#14B8A6' },
    { id: 'opp-4', contactName: 'Laura Bernasconi',    value: 34200, stage: 'Négociation',  tag: 'nego',   date: daysAgo(14), color: '#F9731622', textColor: '#F97316' },
    { id: 'opp-8', contactName: 'Nicolas Pernet',      value: 16500, stage: 'Gagné',        tag: 'gagné',  date: daysAgo(45), color: '#22C55E22', textColor: '#22C55E' },
  ],
  weeklyBreakdown: [
    { day: 'Lun', leads: 2, rdv: 1, devis: 0, ca: 0 },
    { day: 'Mar', leads: 1, rdv: 0, devis: 1, ca: 28500 },
    { day: 'Mer', leads: 3, rdv: 2, devis: 0, ca: 0 },
    { day: 'Jeu', leads: 0, rdv: 1, devis: 2, ca: 52000 },
    { day: 'Ven', leads: 2, rdv: 0, devis: 1, ca: 18900 },
    { day: 'Sam', leads: 1, rdv: 0, devis: 0, ca: 0 },
    { day: 'Dim', leads: 0, rdv: 0, devis: 0, ca: 0 },
  ],
  monthlyPipeline: [
    { month: 'Jan', value: 45000 },
    { month: 'Fév', value: 62000 },
    { month: 'Mar', value: 38000 },
    { month: 'Avr', value: 78000 },
    { month: 'Mai', value: 91000 },
    { month: 'Juin', value: 222900 },
  ],
  clientTimeline: [
    { date: daysAgo(60), value: 0     },
    { date: daysAgo(52), value: 9200  },
    { date: daysAgo(45), value: 9200  },
    { date: daysAgo(38), value: 18400 },
    { date: daysAgo(30), value: 18400 },
    { date: daysAgo(25), value: 27600 },
    { date: daysAgo(18), value: 36800 },
    { date: daysAgo(12), value: 43900 },
    { date: daysAgo(10), value: 52000 },
    { date: daysAgo(3),  value: 68500 },
  ],
  metierBreakdown: [
    { label: 'Façade',    count: 5, pct: 45, color: '#3462EE' },
    { label: 'Isolation', count: 3, pct: 25, color: '#14B8A6' },
    { label: 'Toiture',   count: 2, pct: 20, color: '#8B5CF6' },
    { label: 'Rénovation',count: 1, pct: 10, color: '#F97316' },
  ],
  payments: [
    { date: daysAgo(3),  client: 'Nicolas Pernet', entreprise: 'Pernet SA',          montant: 16500, description: 'Virement UBS — Facture VF-2026-041',         statut: 'Encaissé' },
    { date: daysAgo(10), client: 'Petra Lüthi',    entreprise: 'Lüthi Bau GmbH',     montant: 9200,  description: 'Virement PostFinance — Facture VF-2026-038', statut: 'Encaissé' },
    { date: daysAgo(25), client: 'Isabelle Roth',  entreprise: 'Roth Elektro',        montant: 4800,  description: 'Chèque bancaire — Facture VF-2026-031',      statut: 'Encaissé' },
    { date: daysAgo(38), client: 'Marc Dubois',    entreprise: 'Dubois Construction', montant: 7500,  description: 'Virement Raiffeisen — Facture VF-2026-024',  statut: 'Encaissé' },
    { date: daysAgo(52), client: 'Thomas Favre',   entreprise: 'Favre & Associés SA', montant: 12000, description: 'Virement UBS — Facture VF-2026-017',         statut: 'Encaissé' },
  ],
  wonCA: 16500,
}

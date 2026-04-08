export type Channel = 'email' | 'phone' | 'sms' | 'whatsapp' | 'meeting' | 'note'

export type LeadStage = 'hot' | 'vip' | 'new' | 'payments' | 'client' | 'cold' | null

export type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned' | null

export type ConversationSource = 'meta' | 'manual' | 'ghl' | null

export type PipelineStage = {
  id: string
  name: string
}

export type Pipeline = {
  id: string
  name: string
  stages: PipelineStage[]
}

export type Conversation = {
  id: string
  user_id: string
  lead_id: string | null
  contact_id: string | null
  channel: Channel
  subject: string | null
  summary: string | null
  created_at: string
  updated_at: string
  // joined fields
  contact_name?: string
  contact_company?: string
  contact_phone?: string | null
  contact_email?: string | null
  pipeline_stage?: string | null
  last_message?: string
  last_message_at?: string
  unread?: number
  lead_stage?: LeadStage
  // V2 fields
  ai_enabled?: boolean
  source?: ConversationSource
  pipeline_stage_id?: string | null
  opportunity_status?: OpportunityStatus
  assigned_to?: string | null
}

export type Message = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export const CHANNEL_META: Record<Channel, { label: string; color: string; bg: string }> = {
  email:    { label: 'Email',    color: '#4A91A8', bg: '#4A91A8' + '18' },
  phone:    { label: 'Appel',   color: '#6B7280', bg: '#6B7280' + '18' },
  sms:      { label: 'SMS',     color: '#8896AB', bg: '#8896AB' + '18' },
  whatsapp: { label: 'WhatsApp',color: '#22c55e', bg: '#22c55e' + '18' },
  meeting:  { label: 'Réunion', color: '#3462EE', bg: '#3462EE' + '18' },
  note:     { label: 'Note',    color: '#6B7280', bg: '#6B7280' + '18' },
}

export const LEAD_STAGE_LABEL: Record<NonNullable<LeadStage>, string> = {
  hot:      'Hot Lead',
  vip:      'VIP Lead',
  new:      'Nouveau Lead',
  payments: 'Paiements',
  client:   'Client',
  cold:     'Cold Lead',
}

// AI mock responses
export const AI_RESPONSES = [
  "Bonjour, j'ai bien analysé votre dossier. Ce projet de rénovation présente un potentiel intéressant. Je recommande d'envoyer un devis détaillé sous 48h pour maintenir l'intérêt du prospect.",
  "Suite à notre échange, j'ai identifié 3 points clés à aborder lors du prochain contact : le budget global, le calendrier des travaux, et les garanties décennales.",
  "J'ai préparé un résumé de cette conversation. Points importants : le client souhaite démarrer en avril, budget estimé à 150k€, et a demandé des références similaires.",
  "Relance recommandée : il s'est écoulé 3 jours depuis le dernier contact. Je suggère un email de suivi avec la documentation technique demandée.",
  "Analyse du profil : ce contact a un fort potentiel de conversion. Son entreprise a réalisé 3 projets similaires ces 2 dernières années. Taux de succès estimé : 72%.",
]

export function getMockAiResponse(): string {
  return AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)]
}

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', user_id: 'u1', lead_id: 'l1', contact_id: null,
    channel: 'email', subject: 'Devis ravalement façade 800m²',
    summary: 'Discussion sur le projet de rénovation façade',
    created_at: '2026-04-05T09:00:00Z', updated_at: '2026-04-05T14:30:00Z',
    contact_name: 'Martin Dupont', contact_company: 'Réno Pro Île-de-France',
    last_message: "Pouvez-vous me confirmer le délai de livraison du devis ?",
    last_message_at: '2026-04-05T14:30:00Z', unread: 2, lead_stage: 'hot',
  },
  {
    id: 'c2', user_id: 'u1', lead_id: 'l2', contact_id: null,
    channel: 'whatsapp', subject: 'RDV chantier XL BTP',
    summary: 'Négociation en cours',
    created_at: '2026-04-04T11:00:00Z', updated_at: '2026-04-04T16:00:00Z',
    contact_name: 'Xavier Lambert', contact_company: 'XL BTP',
    last_message: "OK pour le RDV vendredi à 14h sur le chantier.",
    last_message_at: '2026-04-04T16:00:00Z', unread: 0, lead_stage: 'vip',
  },
  {
    id: 'c3', user_id: 'u1', lead_id: null, contact_id: null,
    channel: 'phone', subject: 'Premier contact — BatiSud SARL',
    summary: null,
    created_at: '2026-04-03T10:30:00Z', updated_at: '2026-04-03T10:45:00Z',
    contact_name: 'Sophie Renard', contact_company: 'BatiSud SARL',
    last_message: "Rappeler vendredi 10h pour discuter du projet de réhabilitation.",
    last_message_at: '2026-04-03T10:45:00Z', unread: 0, lead_stage: 'new',
  },
  {
    id: 'c4', user_id: 'u1', lead_id: 'l3', contact_id: null,
    channel: 'meeting', subject: 'Confirmation RDV visite technique',
    summary: 'Compte-rendu de visite',
    created_at: '2026-04-02T14:00:00Z', updated_at: '2026-04-02T15:30:00Z',
    contact_name: 'Inès Duprez', contact_company: undefined,
    last_message: "Parfait, je serai disponible. Envoyez-moi un rappel la veille.",
    last_message_at: '2026-04-02T15:30:00Z', unread: 0, lead_stage: 'client',
  },
  {
    id: 'c5', user_id: 'u1', lead_id: null, contact_id: null,
    channel: 'email', subject: 'Devis pose carrelage 85m²',
    summary: null,
    created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z',
    contact_name: 'Didier Fabre', contact_company: 'Fabre Électricité',
    last_message: "Idéalement en juin, la maison sera disponible à ce moment-là.",
    last_message_at: '2026-04-01T08:00:00Z', unread: 1, lead_stage: 'cold',
  },
  {
    id: 'c6', user_id: 'u1', lead_id: 'l4', contact_id: null,
    channel: 'note', subject: 'Notes — Colin Plomberie Chauffage',
    summary: null,
    created_at: '2026-03-31T16:00:00Z', updated_at: '2026-03-31T16:00:00Z',
    contact_name: 'Marie Colin', contact_company: 'Colin Plomberie Chauffage',
    last_message: "Cliente intéressée par remplacement chaudière + plomberie. Budget : 12k€.",
    last_message_at: '2026-03-31T16:00:00Z', unread: 0, lead_stage: 'payments',
  },
]

export const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', conversation_id: 'c1', role: 'assistant', content: "Bonjour Martin,\n\nSuite à notre appel concernant votre projet de ravalement de façade à Nantes (800 m²), je vous transmets notre offre préliminaire.\n\nNous proposons une intervention complète avec isolation thermique par l'extérieur pour un montant estimé à **45 000 € HT**.\n\nCordialement,\nÉquipe Qorpo", created_at: '2026-04-05T09:00:00Z' },
    { id: 'm2', conversation_id: 'c1', role: 'user', content: "Merci pour votre offre. Le montant semble en ligne avec notre budget. Pouvez-vous me confirmer le délai de livraison du devis détaillé ?", created_at: '2026-04-05T10:30:00Z' },
    { id: 'm3', conversation_id: 'c1', role: 'assistant', content: "Bien entendu Martin. Le devis détaillé sera disponible **avant le 5 avril** comme convenu. Nous inclurons les fiches techniques et le planning d'intervention.", created_at: '2026-04-05T11:00:00Z' },
    { id: 'm4', conversation_id: 'c1', role: 'user', content: "Pouvez-vous me confirmer le délai de livraison du devis ?", created_at: '2026-04-05T14:30:00Z' },
  ],
  c2: [
    { id: 'm5', conversation_id: 'c2', role: 'user', content: "Bonjour Xavier, je vous contacte au sujet de vos 3 chantiers en cours. On peut se voir cette semaine pour discuter du partenariat électricité / plomberie ?", created_at: '2026-04-04T11:00:00Z' },
    { id: 'm6', conversation_id: 'c2', role: 'assistant', content: "Bonjour ! Oui bien sûr. Jeudi ou vendredi vous convient ?", created_at: '2026-04-04T11:30:00Z' },
    { id: 'm7', conversation_id: 'c2', role: 'user', content: "Vendredi c'est parfait. 14h sur le chantier ?", created_at: '2026-04-04T14:00:00Z' },
    { id: 'm8', conversation_id: 'c2', role: 'assistant', content: "OK pour le RDV vendredi à 14h sur le chantier.", created_at: '2026-04-04T16:00:00Z' },
  ],
  c3: [
    { id: 'm9', conversation_id: 'c3', role: 'user', content: "Appel entrant — Sophie Renard — 8 min\n\nNotes : Projet réhabilitation bâtiment industriel 1 200 m² → 12 logements à Bordeaux. Dépôt PC mai, démarrage travaux septembre. Budget 320 000 €. Rappeler vendredi 10h.", created_at: '2026-04-03T10:45:00Z' },
  ],
  c4: [
    { id: 'm10', conversation_id: 'c4', role: 'assistant', content: "Bonjour Inès, je vous confirme votre RDV du 2 avril à 14h pour la visite technique de votre appartement.", created_at: '2026-04-02T14:00:00Z' },
    { id: 'm11', conversation_id: 'c4', role: 'user', content: "Parfait, je serai disponible. Pouvez-vous m'envoyer un rappel la veille ?", created_at: '2026-04-02T14:30:00Z' },
    { id: 'm12', conversation_id: 'c4', role: 'assistant', content: "Bien sûr, je programme un rappel pour le 1er avril en début de soirée.", created_at: '2026-04-02T15:30:00Z' },
  ],
  c5: [
    { id: 'm13', conversation_id: 'c5', role: 'assistant', content: "Bonjour Didier,\n\nSuite à votre demande de devis pour la pose de carrelage dans votre maison (85 m²), pourriez-vous nous préciser le type de carrelage souhaité et l'état actuel du sol ?\n\nCordialement", created_at: '2026-04-01T08:00:00Z' },
    { id: 'm14', conversation_id: 'c5', role: 'user', content: "Idéalement en juin, la maison sera disponible à ce moment-là.", created_at: '2026-04-01T08:30:00Z' },
  ],
  c6: [
    { id: 'm15', conversation_id: 'c6', role: 'user', content: "Note interne — Marie Colin\n\nCliente intéressée par remplacement chaudière + réfection plomberie. Budget : 12 000 €. Pas de réponse depuis 7 jours. Relancer avant fin de semaine.", created_at: '2026-03-31T16:00:00Z' },
  ],
}

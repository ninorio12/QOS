export type Channel = 'email' | 'phone' | 'sms' | 'whatsapp' | 'meeting' | 'note'

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
  // joined fields (from mock or query)
  contact_name?: string
  contact_company?: string
  contact_phone?: string | null
  last_message?: string
  last_message_at?: string
  unread?: number
}

export type Message = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export const CHANNEL_META: Record<Channel, { label: string; color: string; bg: string; emoji: string }> = {
  email:    { label: 'Email',    color: '#4A91A8', bg: '#4A91A8' + '18', emoji: '✉️' },
  phone:    { label: 'Appel',   color: '#C8F135', bg: '#C8F135' + '18', emoji: '📞' },
  sms:      { label: 'SMS',     color: '#8896AB', bg: '#8896AB' + '18', emoji: '💬' },
  whatsapp: { label: 'WhatsApp',color: '#22c55e', bg: '#22c55e' + '18', emoji: '💚' },
  meeting:  { label: 'Réunion', color: '#EFE347', bg: '#EFE347' + '18', emoji: '🤝' },
  note:     { label: 'Note',    color: '#3D4F6B', bg: '#3D4F6B' + '18', emoji: '📝' },
}

// AI mock responses for different contexts
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
    channel: 'email', subject: 'Devis Résidence Les Chênes',
    summary: 'Discussion sur le lot gros œuvre',
    created_at: '2025-03-22T09:00:00Z', updated_at: '2025-03-22T14:30:00Z',
    contact_name: 'Thomas Mercier', contact_company: 'Bouygues Immobilier',
    last_message: "Pouvez-vous me confirmer le délai de livraison du devis ?",
    last_message_at: '2025-03-22T14:30:00Z', unread: 2,
  },
  {
    id: 'c2', user_id: 'u1', lead_id: 'l2', contact_id: null,
    channel: 'whatsapp', subject: 'Lot technique Vinci',
    summary: 'Négociation en cours',
    created_at: '2025-03-21T11:00:00Z', updated_at: '2025-03-21T16:00:00Z',
    contact_name: 'Sophie Laurent', contact_company: 'Vinci Construction',
    last_message: "OK pour le RDV vendredi à 14h sur le chantier.",
    last_message_at: '2025-03-21T16:00:00Z', unread: 0,
  },
  {
    id: 'c3', user_id: 'u1', lead_id: null, contact_id: null,
    channel: 'phone', subject: 'Premier contact — Moreau BTP',
    summary: null,
    created_at: '2025-03-20T10:30:00Z', updated_at: '2025-03-20T10:45:00Z',
    contact_name: 'Pierre Moreau', contact_company: 'Moreau BTP',
    last_message: "Rappeler lundi pour discuter du projet.",
    last_message_at: '2025-03-20T10:45:00Z', unread: 0,
  },
  {
    id: 'c4', user_id: 'u1', lead_id: 'l3', contact_id: null,
    channel: 'meeting', subject: 'Réunion chantier Haussmann',
    summary: 'Compte-rendu de réunion',
    created_at: '2025-03-19T14:00:00Z', updated_at: '2025-03-19T15:30:00Z',
    contact_name: 'Claire Fontaine', contact_company: 'Fontaine & Fils',
    last_message: "CR réunion : validation des plans, démarrage semaine 14.",
    last_message_at: '2025-03-19T15:30:00Z', unread: 0,
  },
  {
    id: 'c5', user_id: 'u1', lead_id: null, contact_id: null,
    channel: 'email', subject: 'Relance — Girard Immobilier',
    summary: null,
    created_at: '2025-03-18T08:00:00Z', updated_at: '2025-03-18T08:00:00Z',
    contact_name: 'Lucas Girard', contact_company: 'Girard Immobilier',
    last_message: "Suite à notre échange du 15 mars, je reviens vers vous...",
    last_message_at: '2025-03-18T08:00:00Z', unread: 1,
  },
  {
    id: 'c6', user_id: 'u1', lead_id: 'l4', contact_id: null,
    channel: 'note', subject: 'Notes — Petit & Associés',
    summary: null,
    created_at: '2025-03-17T16:00:00Z', updated_at: '2025-03-17T16:00:00Z',
    contact_name: 'Emma Petit', contact_company: 'Petit & Associés',
    last_message: "Client intéressé par lot électricité. Budget : 45k€.",
    last_message_at: '2025-03-17T16:00:00Z', unread: 0,
  },
]

export const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', conversation_id: 'c1', role: 'assistant', content: "Bonjour Thomas,\n\nSuite à notre appel de la semaine dernière, je vous transmets notre offre pour le lot gros œuvre de la Résidence Les Chênes.\n\nNous proposons une intervention complète comprenant fondations, élévation des murs et dalle béton pour un montant estimé à **87 000 € HT**.\n\nCordialement,\nÉquipe Qorpo", created_at: '2025-03-22T09:00:00Z' },
    { id: 'm2', conversation_id: 'c1', role: 'user', content: "Merci pour votre offre. Le montant semble correct. Pouvez-vous me confirmer le délai de livraison du devis complet avec les plans ?", created_at: '2025-03-22T10:30:00Z' },
    { id: 'm3', conversation_id: 'c1', role: 'assistant', content: "Bien entendu Thomas. Le devis détaillé avec les plans d'exécution sera disponible d'ici **jeudi 27 mars** au plus tard. Nous inclurons également les fiches techniques des matériaux préconisés.", created_at: '2025-03-22T11:00:00Z' },
    { id: 'm4', conversation_id: 'c1', role: 'user', content: "Pouvez-vous me confirmer le délai de livraison du devis ?", created_at: '2025-03-22T14:30:00Z' },
  ],
  c2: [
    { id: 'm5', conversation_id: 'c2', role: 'user', content: "Bonjour Sophie, je vous contacte au sujet du lot technique du centre commercial Vinci. On peut se voir cette semaine ?", created_at: '2025-03-21T11:00:00Z' },
    { id: 'm6', conversation_id: 'c2', role: 'assistant', content: "Bonjour ! Oui bien sûr. Jeudi ou vendredi vous convient ?", created_at: '2025-03-21T11:30:00Z' },
    { id: 'm7', conversation_id: 'c2', role: 'user', content: "Vendredi c'est parfait. 14h sur le chantier ?", created_at: '2025-03-21T14:00:00Z' },
    { id: 'm8', conversation_id: 'c2', role: 'assistant', content: "OK pour le RDV vendredi à 14h sur le chantier.", created_at: '2025-03-21T16:00:00Z' },
  ],
  c3: [
    { id: 'm9', conversation_id: 'c3', role: 'user', content: "📞 Appel entrant — Pierre Moreau — 10 min\n\nNotes : Intéressé par une collaboration sur leur prochain chantier à Nantes. Budget estimé 56k€. Rappeler lundi pour discuter du projet.", created_at: '2025-03-20T10:45:00Z' },
  ],
  c4: [
    { id: 'm10', conversation_id: 'c4', role: 'user', content: "🤝 Compte-rendu réunion chantier — 19 mars 2025\n\n**Présents :** Claire Fontaine, Jean-Luc Martin (architecte), équipe Qorpo\n\n**Décisions :**\n- Plans validés ✓\n- Démarrage semaine 14 (7 avril)\n- Budget confirmé : 142 000€ HT\n- Réunion de chantier hebdomadaire le mardi 9h", created_at: '2025-03-19T15:30:00Z' },
  ],
  c5: [
    { id: 'm11', conversation_id: 'c5', role: 'assistant', content: "Objet : Suite à notre échange du 15 mars\n\nBonjour Lucas,\n\nSuite à notre échange du 15 mars, je reviens vers vous concernant votre projet de rénovation. Avez-vous eu le temps d'étudier notre proposition ?\n\nJe reste disponible pour tout renseignement complémentaire.\n\nCordialement", created_at: '2025-03-18T08:00:00Z' },
  ],
  c6: [
    { id: 'm12', conversation_id: 'c6', role: 'user', content: "📝 Note interne\n\nClient intéressé par lot électricité. Budget annoncé : 45k€. Elle souhaite 3 devis comparatifs. Envoyer notre offre avant le 25 mars pour rester dans la course.", created_at: '2025-03-17T16:00:00Z' },
  ],
}

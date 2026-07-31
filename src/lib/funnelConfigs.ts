/**
 * Les configurations du cockpit.
 *
 * Le squelette ne bouge pas : même entonnoir, mêmes cartes de rôles, mêmes
 * calculs. Ce qui change d'un parcours à l'autre, ce sont les étapes retenues
 * et leurs noms, parce que l'événement métier derrière est souvent le même.
 * Contacter un lead s'appelle « envoyer un DM » en social : c'est la même donnée.
 *
 * Une configuration ne fabrique JAMAIS un chiffre. Quand une étape n'a pas
 * encore de source (les abonnés reçus, par exemple), sa valeur vaut null et
 * l'écran affiche N/A plutôt qu'un nombre emprunté ailleurs.
 */

/** Toutes les valeurs que le cockpit sait produire, à plat. */
export type FunnelData = {
  leads: number
  contactes: number       // leads contactés / DM envoyés
  reponses: number        // réponses / conversations
  r1: number              // R1 bookés / calls bookés
  showsR1: number
  noShowsR1: number
  r2: number
  showsR2: number
  noShowsR2: number
  ventes: number
  abonnes: number | null  // pas de source aujourd'hui
  sources: number
  envois: number
  reponsesOut: number
}

export type StepKey = keyof FunnelData
export type Step = { key: StepKey; label: string; icon: 'users' | 'message' | 'chat' | 'calendar' | 'phone' | 'trophy' }
/** Un taux : numérateur ÷ dénominateur, et l'objectif auquel on le compare. */
export type Rate = { label: string; from: StepKey; to: StepKey; obj: ObjKey }
export type ObjKey = 'leadsR1' | 'tauxShow' | 'leadsR2' | 'tauxShowR2' | 'tauxClose' | 'tauxReponse' | 'cpl' | 'ca' | 'coutParVente' | 'ventes' | 'panierMoyen'
export type RoleRow = { label: string; key: string }

export type FunnelConfig = {
  id: string
  /** Famille du parcours : inbound (le lead se déclare), social (il s'abonne
   *  puis on ouvre le DM), outbound (contact froid, on écrit en premier). */
  family: 'inbound' | 'social' | 'outbound'
  label: string
  tagline: string
  steps: Step[]
  rates: Rate[]
  roles: {
    media: { title: string; rows: RoleRow[] }
    setting: { title: string; rows: RoleRow[] }
    closing: { title: string; rows: RoleRow[] }
  }
  /** Les objectifs modifiables pour ce parcours, dans l'ordre d'affichage. */
  objectives: { key: ObjKey; label: string; unit: string }[]
}

const VSL: FunnelConfig = {
  id: 'vsl',
  family: 'inbound',
  label: 'VSL',
  tagline: 'Publicité vers page de vente vidéo, puis rendez-vous',
  steps: [
    { key: 'leads', label: 'Leads', icon: 'users' },
    { key: 'r1', label: 'R1 bookés', icon: 'calendar' },
    { key: 'showsR1', label: 'Shows en R1', icon: 'phone' },
    { key: 'r2', label: 'R2 bookés', icon: 'calendar' },
    { key: 'showsR2', label: 'Shows en R2', icon: 'phone' },
    { key: 'ventes', label: 'Ventes', icon: 'trophy' },
  ],
  rates: [
    { label: 'Taux conversion leads → R1', from: 'leads', to: 'r1', obj: 'leadsR1' },
    { label: 'Taux de show R1', from: 'r1', to: 'showsR1', obj: 'tauxShow' },
    { label: 'Présents R1 → R2', from: 'showsR1', to: 'r2', obj: 'leadsR2' },
    { label: 'Taux de show R2', from: 'r2', to: 'showsR2', obj: 'tauxShowR2' },
    { label: 'Taux de closing', from: 'r1', to: 'ventes', obj: 'tauxClose' },
  ],
  roles: {
    media: { title: 'Media Buying', rows: [
      { label: 'Dépenses totales', key: 'spend' },
      { label: 'Impressions', key: 'impressions' },
      { label: 'Clics', key: 'clicks' },
      { label: 'Leads générés', key: 'metaLeads' },
      { label: 'Coût par lead', key: 'cpl' },
    ] },
    setting: { title: 'Setting', rows: [
      { label: 'Leads contactés', key: 'contactes' },
      { label: 'Réponses', key: 'reponses' },
      { label: 'Taux de réponse', key: 'tauxReponse' },
      { label: 'Calls bookés (R1)', key: 'r1' },
      { label: 'Taux leads contactés → R1', key: 'conversionR1' },
    ] },
    closing: { title: 'Closing', rows: [
      { label: 'Appels prévus (R2)', key: 'r2' },
      { label: 'Shows (R2)', key: 'showsR2' },
      { label: 'No-shows (R2)', key: 'noShowsR2' },
      { label: 'Ventes', key: 'ventes' },
      { label: 'Taux de closing', key: 'tauxClose' },
    ] },
  },
  objectives: [
    { key: 'leadsR1', label: 'Taux conversion leads → R1', unit: '%' },
    { key: 'tauxReponse', label: 'Taux de réponse', unit: '%' },
    { key: 'leadsR2', label: 'Taux conversion R1 → R2', unit: '%' },
    { key: 'tauxShow', label: 'Taux de show R1', unit: '%' },
    { key: 'tauxShowR2', label: 'Taux de show R2', unit: '%' },
    { key: 'tauxClose', label: 'Taux de closing', unit: '%' },
    { key: 'cpl', label: 'CPL Meta', unit: 'CHF' },
    { key: 'ca', label: 'Encaissé (objectif)', unit: 'CHF' },
  ],
}

const QUIZZ: FunnelConfig = {
  id: 'quizz',
  family: 'inbound',
  label: 'Quiz',
  tagline: 'Publicité vers quiz de qualification, puis rendez-vous',
  steps: [
    { key: 'leads', label: 'Quiz complétés', icon: 'users' },
    { key: 'r1', label: 'RDV bookés (R1)', icon: 'calendar' },
    { key: 'showsR1', label: 'Présents en R1', icon: 'phone' },
    { key: 'r2', label: 'RDV bookés (R2)', icon: 'calendar' },
    { key: 'showsR2', label: 'Présents en R2', icon: 'phone' },
    { key: 'ventes', label: 'Ventes', icon: 'trophy' },
  ],
  rates: [
    { label: 'Taux quiz → RDV', from: 'leads', to: 'r1', obj: 'leadsR1' },
    { label: 'Taux de show R1', from: 'r1', to: 'showsR1', obj: 'tauxShow' },
    { label: 'Présents R1 → R2', from: 'showsR1', to: 'r2', obj: 'leadsR2' },
    { label: 'Taux de show R2', from: 'r2', to: 'showsR2', obj: 'tauxShowR2' },
    { label: 'Taux de close', from: 'r1', to: 'ventes', obj: 'tauxClose' },
  ],
  roles: {
    media: { title: 'Media Buyer', rows: [
      { label: 'Dépenses totales', key: 'spend' },
      { label: 'Leads générés', key: 'metaLeads' },
      { label: 'Coût par lead', key: 'cpl' },
      { label: 'Impressions', key: 'impressions' },
      { label: 'Clics', key: 'clicks' },
    ] },
    setting: { title: 'Qualification', rows: [
      { label: 'Quiz relancés', key: 'contactes' },
      { label: 'Réponses', key: 'reponses' },
      { label: 'Taux de réponse', key: 'tauxReponse' },
      { label: 'RDV bookés', key: 'r1' },
      { label: 'Taux relancés → RDV', key: 'conversionR1' },
    ] },
    closing: { title: 'Closer', rows: [
      { label: 'Appels prévus (R2)', key: 'r2' },
      { label: 'Shows (R2)', key: 'showsR2' },
      { label: 'No-shows (R2)', key: 'noShowsR2' },
      { label: 'Ventes', key: 'ventes' },
      { label: 'Taux de close', key: 'tauxClose' },
    ] },
  },
  objectives: [
    { key: 'leadsR1', label: 'Quiz → RDV', unit: '%' },
    { key: 'tauxShow', label: 'Taux de show R1', unit: '%' },
    { key: 'leadsR2', label: 'R1 → R2', unit: '%' },
    { key: 'tauxShowR2', label: 'Taux de show R2', unit: '%' },
    { key: 'tauxClose', label: 'Taux de close', unit: '%' },
    { key: 'cpl', label: 'CPL Meta', unit: 'CHF' },
    { key: 'ca', label: "Chiffre d'affaires", unit: 'CHF' },
  ],
}

// Repris mot pour mot du modèle validé par Jonathan : abonnés reçus, DMs
// envoyés, conversations, calls bookés, shows, ventes. Pas de second rendez-vous.
const SOCIAL: FunnelConfig = {
  id: 'social',
  family: 'social',
  label: 'Social funnel',
  tagline: 'Contenu et publicité vers messagerie, puis appel',
  steps: [
    { key: 'abonnes', label: 'Abonnés reçus', icon: 'users' },
    { key: 'contactes', label: 'DMs envoyés', icon: 'message' },
    { key: 'reponses', label: 'Conversations', icon: 'chat' },
    { key: 'r1', label: 'Calls bookés (R1)', icon: 'calendar' },
    { key: 'showsR1', label: 'Shows en R1', icon: 'phone' },
    { key: 'r2', label: 'Calls bookés (R2)', icon: 'calendar' },
    { key: 'showsR2', label: 'Shows en R2', icon: 'phone' },
    { key: 'ventes', label: 'Ventes', icon: 'trophy' },
  ],
  rates: [
    { label: 'Abonné → DM', from: 'abonnes', to: 'contactes', obj: 'leadsR1' },
    { label: 'DM → Conversation', from: 'contactes', to: 'reponses', obj: 'tauxReponse' },
    { label: 'Conversation → Call', from: 'reponses', to: 'r1', obj: 'leadsR1' },
    { label: 'Taux de show R1', from: 'r1', to: 'showsR1', obj: 'tauxShow' },
    { label: 'Shows R1 → R2', from: 'showsR1', to: 'r2', obj: 'leadsR2' },
    { label: 'Taux de show R2', from: 'r2', to: 'showsR2', obj: 'tauxShowR2' },
    { label: 'Show → Closing', from: 'r1', to: 'ventes', obj: 'tauxClose' },
  ],
  roles: {
    media: { title: 'Media Buyer', rows: [
      { label: 'Dépenses totales', key: 'spend' },
      { label: 'Leads générés', key: 'metaLeads' },
      { label: 'Coût par lead', key: 'cpl' },
      { label: 'Abonnés ads', key: 'abonnes' },
      { label: 'Coût par abonné', key: 'coutParAbonne' },
    ] },
    setting: { title: 'Setter', rows: [
      { label: 'Abonnés ads', key: 'abonnes' },
      { label: 'Abonnés organiques', key: 'abonnesOrganiques' },
      { label: 'DMs envoyés', key: 'contactes' },
      { label: 'Conversations', key: 'reponses' },
      { label: 'Calls bookés', key: 'r1' },
      { label: 'Taux DM → Conversation', key: 'tauxReponse' },
    ] },
    closing: { title: 'Closer', rows: [
      { label: 'Appels prévus (R2)', key: 'r2' },
      { label: 'Shows (R2)', key: 'showsR2' },
      { label: 'No-shows (R2)', key: 'noShowsR2' },
      { label: 'Ventes', key: 'ventes' },
      { label: 'Taux de close', key: 'tauxClose' },
    ] },
  },
  objectives: [
    { key: 'tauxReponse', label: 'DM → Conversation', unit: '%' },
    { key: 'leadsR1', label: 'Conversation → Call', unit: '%' },
    { key: 'tauxShow', label: 'Taux de show R1', unit: '%' },
    { key: 'leadsR2', label: 'R1 → R2', unit: '%' },
    { key: 'tauxShowR2', label: 'Taux de show R2', unit: '%' },
    { key: 'tauxClose', label: 'Taux de close', unit: '%' },
    { key: 'ca', label: "Chiffre d'affaires", unit: 'CHF' },
  ],
}

// Emailing outbound : contact 100 % froid, on écrit en premier. Le haut de
// l'entonnoir lui est propre (fichier, envois, réponses), le bas est commun.
const EMAILING: FunnelConfig = {
  id: 'emailing',
  family: 'outbound',
  label: 'Emailing',
  tagline: 'Prospection à froid par email, puis rendez-vous',
  steps: [
    { key: 'sources', label: 'Contacts sourcés', icon: 'users' },
    { key: 'envois', label: 'Emails envoyés', icon: 'message' },
    { key: 'reponsesOut', label: 'Réponses', icon: 'chat' },
    { key: 'r1', label: 'R1 bookés', icon: 'calendar' },
    { key: 'showsR1', label: 'Shows en R1', icon: 'phone' },
    { key: 'r2', label: 'R2 bookés', icon: 'calendar' },
    { key: 'showsR2', label: 'Shows en R2', icon: 'phone' },
    { key: 'ventes', label: 'Ventes', icon: 'trophy' },
  ],
  rates: [
    { label: 'Sourcés → envoyés', from: 'sources', to: 'envois', obj: 'leadsR1' },
    { label: 'Emails → Réponse', from: 'envois', to: 'reponsesOut', obj: 'tauxReponse' },
    { label: 'Réponse → R1', from: 'reponsesOut', to: 'r1', obj: 'leadsR1' },
    { label: 'Taux de show R1', from: 'r1', to: 'showsR1', obj: 'tauxShow' },
    { label: 'Shows R1 → R2', from: 'showsR1', to: 'r2', obj: 'leadsR2' },
    { label: 'Taux de show R2', from: 'r2', to: 'showsR2', obj: 'tauxShowR2' },
    { label: 'Taux de closing', from: 'r1', to: 'ventes', obj: 'tauxClose' },
  ],
  roles: {
    media: { title: 'Sourcing', rows: [
      { label: 'Contacts sourcés', key: 'sources' },
      { label: 'Decks générés', key: 'decks' },
      { label: 'Emails envoyés', key: 'envois' },
      { label: 'Réponses', key: 'reponsesOut' },
      { label: 'Taux de réponse', key: 'tauxReponseOut' },
    ] },
    setting: { title: 'Emailing', rows: [
      { label: 'Emails envoyés', key: 'envois' },
      { label: 'Réponses', key: 'reponsesOut' },
      { label: 'Taux de réponse', key: 'tauxReponseOut' },
      { label: 'R1 bookés', key: 'r1' },
      { label: 'Réponses → R1', key: 'conversionR1' },
    ] },
    closing: { title: 'Closing', rows: [
      { label: 'Appels prévus (R2)', key: 'r2' },
      { label: 'Shows (R2)', key: 'showsR2' },
      { label: 'No-shows (R2)', key: 'noShowsR2' },
      { label: 'Ventes', key: 'ventes' },
      { label: 'Taux de closing', key: 'tauxClose' },
    ] },
  },
  objectives: [
    { key: 'tauxReponse', label: 'Emails → Réponse', unit: '%' },
    { key: 'leadsR1', label: 'Réponse → R1', unit: '%' },
    { key: 'tauxShow', label: 'Taux de show R1', unit: '%' },
    { key: 'leadsR2', label: 'R1 → R2', unit: '%' },
    { key: 'tauxShowR2', label: 'Taux de show R2', unit: '%' },
    { key: 'tauxClose', label: 'Taux de closing', unit: '%' },
    { key: 'ca', label: 'Encaissé (objectif)', unit: 'CHF' },
  ],
}

// Vue cumulée de la famille direct response : VSL et quizz ensemble. Elle
// garde le vocabulaire neutre (leads, R1, R2) puisqu'elle couvre les deux.
const INBOUND_TOUS: FunnelConfig = {
  ...VSL,
  id: 'inbound',
  label: 'Tous',
  tagline: 'VSL et quiz cumulés',
}

export const FUNNEL_CONFIGS: FunnelConfig[] = [INBOUND_TOUS, VSL, QUIZZ, EMAILING, SOCIAL]

/** Les deux familles, dans l'ordre des onglets du haut. */
export const FAMILIES: { id: 'inbound' | 'social' | 'outbound'; label: string; defaultConfig: string }[] = [
  { id: 'inbound', label: 'Inbound', defaultConfig: 'inbound' },
  { id: 'outbound', label: 'Outbound', defaultConfig: 'emailing' },
  { id: 'social', label: 'Social', defaultConfig: 'social' },
]

export const configById = (id: string | null | undefined): FunnelConfig =>
  FUNNEL_CONFIGS.find((c) => c.id === id) ?? INBOUND_TOUS

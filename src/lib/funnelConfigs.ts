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
}

export type StepKey = keyof FunnelData
export type Step = { key: StepKey; label: string; icon: 'users' | 'message' | 'chat' | 'calendar' | 'phone' | 'trophy' }
/** Un taux : numérateur ÷ dénominateur, et l'objectif auquel on le compare. */
export type Rate = { label: string; from: StepKey; to: StepKey; obj: ObjKey }
export type ObjKey = 'leadsR1' | 'tauxShow' | 'leadsR2' | 'tauxShowR2' | 'tauxClose' | 'tauxReponse' | 'cpl' | 'ca' | 'coutParVente' | 'ventes' | 'panierMoyen'
export type RoleRow = { label: string; key: string }

export type FunnelConfig = {
  id: string
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
  label: 'VSL funnel',
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
    { key: 'coutParVente', label: 'Coût par vente (max)', unit: 'CHF' },
  ],
}

const QUIZZ: FunnelConfig = {
  id: 'quizz',
  label: 'Quizz funnel',
  tagline: 'Publicité vers quizz de qualification, puis rendez-vous',
  steps: [
    { key: 'leads', label: 'Quizz complétés', icon: 'users' },
    { key: 'r1', label: 'RDV bookés', icon: 'calendar' },
    { key: 'showsR1', label: 'Présents au RDV', icon: 'phone' },
    { key: 'ventes', label: 'Ventes', icon: 'trophy' },
  ],
  rates: [
    { label: 'Taux quizz → RDV', from: 'leads', to: 'r1', obj: 'leadsR1' },
    { label: 'Taux de show', from: 'r1', to: 'showsR1', obj: 'tauxShow' },
    { label: 'Taux de close', from: 'showsR1', to: 'ventes', obj: 'tauxClose' },
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
      { label: 'Quizz relancés', key: 'contactes' },
      { label: 'Réponses', key: 'reponses' },
      { label: 'Taux de réponse', key: 'tauxReponse' },
      { label: 'RDV bookés', key: 'r1' },
      { label: 'Taux relancés → RDV', key: 'conversionR1' },
    ] },
    closing: { title: 'Closer', rows: [
      { label: 'Appels prévus', key: 'r1' },
      { label: 'Shows', key: 'showsR1' },
      { label: 'No-shows', key: 'noShowsR1' },
      { label: 'Ventes', key: 'ventes' },
      { label: 'Taux de close', key: 'tauxClose' },
    ] },
  },
  objectives: [
    { key: 'leadsR1', label: 'Quizz → RDV', unit: '%' },
    { key: 'tauxShow', label: 'Taux de show', unit: '%' },
    { key: 'tauxClose', label: 'Taux de close', unit: '%' },
    { key: 'cpl', label: 'CPL Meta', unit: 'CHF' },
    { key: 'ca', label: "Chiffre d'affaires", unit: 'CHF' },
  ],
}

// Repris mot pour mot du modèle validé par Jonathan : abonnés reçus, DMs
// envoyés, conversations, calls bookés, shows, ventes. Pas de second rendez-vous.
const SOCIAL: FunnelConfig = {
  id: 'social',
  label: 'Social funnel',
  tagline: 'Contenu et publicité vers messagerie, puis appel',
  steps: [
    { key: 'abonnes', label: 'Abonnés reçus', icon: 'users' },
    { key: 'contactes', label: 'DMs envoyés', icon: 'message' },
    { key: 'reponses', label: 'Conversations', icon: 'chat' },
    { key: 'r1', label: 'Calls bookés', icon: 'calendar' },
    { key: 'showsR1', label: 'Shows', icon: 'phone' },
    { key: 'ventes', label: 'Ventes', icon: 'trophy' },
  ],
  rates: [
    { label: 'Abonné → DM', from: 'abonnes', to: 'contactes', obj: 'leadsR1' },
    { label: 'DM → Conversation', from: 'contactes', to: 'reponses', obj: 'tauxReponse' },
    { label: 'Conversation → Call', from: 'reponses', to: 'r1', obj: 'leadsR2' },
    { label: 'Taux de show', from: 'r1', to: 'showsR1', obj: 'tauxShow' },
    { label: 'Show → Closing', from: 'showsR1', to: 'ventes', obj: 'tauxClose' },
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
      { label: 'Taux DM → Convo', key: 'tauxReponse' },
    ] },
    closing: { title: 'Closer', rows: [
      { label: 'Appels prévus', key: 'r1' },
      { label: 'Shows', key: 'showsR1' },
      { label: 'No-shows', key: 'noShowsR1' },
      { label: 'Ventes', key: 'ventes' },
      { label: 'Taux de close', key: 'tauxClose' },
    ] },
  },
  objectives: [
    { key: 'tauxReponse', label: 'DM → Convo', unit: '%' },
    { key: 'leadsR2', label: 'Convo → Call', unit: '%' },
    { key: 'tauxShow', label: 'Taux de show', unit: '%' },
    { key: 'tauxClose', label: 'Taux de close', unit: '%' },
    { key: 'ca', label: "Chiffre d'affaires", unit: 'CHF' },
  ],
}

export const FUNNEL_CONFIGS: FunnelConfig[] = [VSL, QUIZZ, SOCIAL]

export const configById = (id: string | null | undefined): FunnelConfig =>
  FUNNEL_CONFIGS.find((c) => c.id === id) ?? VSL

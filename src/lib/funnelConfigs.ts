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
  rdvDirects: number | null // outbound : RDV bookés SEULS via le deck, sans le setter
}

export type StepKey = keyof FunnelData
export type Step = { key: StepKey; label: string; icon: 'users' | 'message' | 'chat' | 'calendar' | 'phone' | 'trophy' }
/** Un taux : numérateur ÷ dénominateur, et l'objectif auquel on le compare.
 *  `info` : explication derrière le petit « i » de la carte.
 *  `card: false` : le taux n'apparaît QUE sur la flèche de l'entonnoir, pas en
 *  carte (évite la marée de cards sur les parcours à entonnoir long). */
export type Rate = { label: string; from: StepKey; to: StepKey; obj: ObjKey; info?: string; card?: boolean }
export type ObjKey = 'leadsR1' | 'tauxShow' | 'leadsR2' | 'tauxShowR2' | 'tauxClose' | 'tauxReponse' | 'cpl' | 'ca' | 'coutParVente' | 'ventes' | 'panierMoyen'
export type RoleRow = { label: string; key: string }

export type FunnelConfig = {
  id: string
  /** Logo de plateforme affiché dans le filtre (linkedin | instagram). */
  brand?: 'linkedin' | 'instagram'
  /** Famille du parcours : inbound (le lead se déclare), social (il s'abonne
   *  puis on ouvre le DM), outbound (contact froid, on écrit en premier),
   *  recommandation (réseau et bouche-à-oreille : pas de pub, pas de lien). */
  family: 'inbound' | 'social' | 'outbound' | 'recommandation'
  label: string
  tagline: string
  steps: Step[]
  rates: Rate[]
  roles: {
    /** Absente en recommandation : pas de publicité sur ce parcours. */
    media?: { title: string; rows: RoleRow[] }
    /** Absente en outbound : la card Emailing (media) couvre déjà le setting. */
    setting?: { title: string; rows: RoleRow[] }
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
    // Le calcul reste R2 ÷ présents R1 : on ne peut convertir que ceux qui se sont présentés.
    { label: 'Taux conversion R1 → R2', from: 'showsR1', to: 'r2', obj: 'leadsR2' },
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
  // Entonnoir identique au VSL : seuls les leads qui y entrent diffèrent.
  steps: VSL.steps,
  rates: VSL.rates,
  roles: {
    media: { title: 'Media Buyer', rows: [
      { label: 'Dépenses totales', key: 'spend' },
      { label: 'Leads générés', key: 'metaLeads' },
      { label: 'Coût par lead', key: 'cpl' },
      { label: 'Impressions', key: 'impressions' },
      { label: 'Clics', key: 'clicks' },
    ] },
    setting: { title: 'Setter', rows: [
      { label: 'Quiz complétés', key: 'leads' },
      { label: 'Quiz relancés', key: 'contactes' },
      { label: 'Réponses', key: 'reponses' },
      { label: 'RDV bookés (R1)', key: 'r1' },
      { label: 'Quiz → RDV', key: 'conversionR1' },
    ] },
    closing: { title: 'Closer', rows: [
      { label: 'RDV bookés (R2)', key: 'r2' },
      { label: 'Présents en R2', key: 'showsR2' },
      { label: 'No-shows (R2)', key: 'noShowsR2' },
      { label: 'Ventes', key: 'ventes' },
      { label: 'Taux de close', key: 'tauxClose' },
    ] },
  },
  objectives: VSL.objectives,
}

// Repris mot pour mot du modèle validé par Jonathan : abonnés reçus, DMs
// envoyés, conversations, calls bookés, shows, ventes. Pas de second rendez-vous.
const SOCIAL: FunnelConfig = {
  id: 'social',
  family: 'social',
  label: 'Social funnel',
  tagline: 'Contenu et publicité vers messagerie, puis appel',
  steps: [
    { key: 'abonnes', label: 'Abonnés', icon: 'users' },
    { key: 'contactes', label: 'DMs envoyés', icon: 'message' },
    { key: 'reponses', label: 'Conversations', icon: 'chat' },
    { key: 'r1', label: 'Calls bookés (R1)', icon: 'calendar' },
    { key: 'showsR1', label: 'Shows en R1', icon: 'phone' },
    { key: 'r2', label: 'Calls bookés (R2)', icon: 'calendar' },
    { key: 'showsR2', label: 'Shows en R2', icon: 'phone' },
    { key: 'ventes', label: 'Ventes', icon: 'trophy' },
  ],
  // 6 cards seulement (demande Jonathan 2026-08-02) : les taux intermédiaires
  // (abonné→DM, conversation→call, show R2) restent sur les flèches de
  // l'entonnoir mais ne prennent plus une carte chacun.
  rates: [
    { label: 'Abonné → DM', from: 'abonnes', to: 'contactes', obj: 'leadsR1', card: false },
    { label: 'DM → Conversation', from: 'contactes', to: 'reponses', obj: 'tauxReponse' },
    { label: 'Conversation → Call', from: 'reponses', to: 'r1', obj: 'leadsR1', card: false },
    // Vision d'ensemble du setting : du DM ouvert jusqu'au call. Pas liée à une
    // étape (l'entonnoir passe déjà par Conversations), carte seule.
    { label: 'Conversion DM → R1', from: 'contactes', to: 'r1', obj: 'leadsR1' },
    { label: 'Taux de show R1', from: 'r1', to: 'showsR1', obj: 'tauxShow' },
    { label: 'Taux conversion R1 → R2', from: 'showsR1', to: 'r2', obj: 'leadsR2' },
    { label: 'Taux de show R2', from: 'r2', to: 'showsR2', obj: 'tauxShowR2', card: false },
    { label: 'Taux de closing', from: 'r1', to: 'ventes', obj: 'tauxClose' },
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

// Emailing outbound : contact 100 % froid, le deck part par email avec le lien
// iClosed. Entonnoir raccourci (décision Jonathan 2026-08-02) : Leads sourcés
// puis directement les rendez-vous, car le RDV se prend soit seul via le deck,
// soit par le setter qui glisse la carte. Deux cartes de rôle : Emailing et
// Closing (la card setting était un doublon, supprimée).
const EMAILING: FunnelConfig = {
  id: 'emailing',
  family: 'outbound',
  label: 'Emailing',
  tagline: 'Prospection à froid par email, puis rendez-vous',
  steps: [
    { key: 'sources', label: 'Leads sourcés', icon: 'users' },
    { key: 'r1', label: 'R1 bookés', icon: 'calendar' },
    { key: 'showsR1', label: 'Shows en R1', icon: 'phone' },
    { key: 'r2', label: 'R2 bookés', icon: 'calendar' },
    { key: 'showsR2', label: 'Shows en R2', icon: 'phone' },
    { key: 'ventes', label: 'Ventes', icon: 'trophy' },
  ],
  rates: [
    // Deux lectures distinctes du haut de l'entonnoir : le deck seul, puis tous
    // canaux confondus. L'écart entre les deux = l'apport du setter.
    { label: 'RDV directs via deck', from: 'sources', to: 'rdvDirects', obj: 'tauxReponse',
      info: 'Leads qui ont réservé SEULS depuis le lien du deck reçu par email, sans intervention du setter, divisés par les leads sourcés. Mesure la force du mail et du deck.' },
    { label: 'Conversion totale → R1', from: 'sources', to: 'r1', obj: 'leadsR1',
      info: 'TOUS les R1 bookés (réservés seuls via le deck + décrochés par le setter), divisés par les leads sourcés. L\'écart avec « RDV directs via deck » = ce que le setter ajoute.' },
    { label: 'Taux de show R1', from: 'r1', to: 'showsR1', obj: 'tauxShow' },
    { label: 'Taux conversion R1 → R2', from: 'showsR1', to: 'r2', obj: 'leadsR2' },
    { label: 'Taux de show R2', from: 'r2', to: 'showsR2', obj: 'tauxShowR2' },
    { label: 'Taux de closing', from: 'r1', to: 'ventes', obj: 'tauxClose' },
  ],
  roles: {
    media: { title: 'Emailing', rows: [
      { label: 'Decks générés', key: 'decks' },
      { label: 'Leads sourcés', key: 'sources' },
      { label: 'Réponses (RDV directs)', key: 'rdvDirects' },
      { label: 'Taux de réponse', key: 'tauxReponseMail' },
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
    { key: 'tauxReponse', label: 'RDV directs via deck', unit: '%' },
    { key: 'leadsR1', label: 'Conversion totale → R1', unit: '%' },
    { key: 'tauxShow', label: 'Taux de show R1', unit: '%' },
    { key: 'leadsR2', label: 'Taux conversion R1 → R2', unit: '%' },
    { key: 'tauxShowR2', label: 'Taux de show R2', unit: '%' },
    { key: 'tauxClose', label: 'Taux de closing', unit: '%' },
    { key: 'ca', label: 'Encaissé (objectif)', unit: 'CHF' },
  ],
}

// Vue cumulée de la famille direct response : VSL et quizz ensemble. Elle
// garde le vocabulaire neutre (leads, R1, R2) puisqu'elle couvre les deux.
// Un profil, deux plateformes : même parcours (abonnés, DM, conversations,
// rendez-vous), mais des chiffres et des objectifs qui ne se mélangent pas.
const LINKEDIN: FunnelConfig = {
  ...SOCIAL,
  id: 'linkedin',
  brand: 'linkedin',
  label: 'LinkedIn',
  tagline: 'Profil LinkedIn : contenu puis messages privés',
  // Sur LinkedIn on parle de CONNEXIONS, pas d'abonnés (demande Jonathan 2026-08-02).
  steps: SOCIAL.steps.map((s) => (s.key === 'abonnes' ? { ...s, label: 'Connexions' } : s)),
  rates: SOCIAL.rates.map((r) => (r.label === 'Abonné → DM' ? { ...r, label: 'Connexion → DM' } : r)),
  roles: {
    ...SOCIAL.roles,
    setting: { title: 'Setter', rows: SOCIAL.roles.setting!.rows.map((row) =>
      row.key === 'abonnes' ? { ...row, label: 'Connexions ads' }
      : row.key === 'abonnesOrganiques' ? { ...row, label: 'Connexions organiques' } : row) },
    media: { title: 'Media Buyer', rows: SOCIAL.roles.media!.rows.map((row) =>
      row.key === 'abonnes' ? { ...row, label: 'Connexions ads' }
      : row.key === 'coutParAbonne' ? { ...row, label: 'Coût par connexion' } : row) },
  },
}

const INSTAGRAM: FunnelConfig = {
  ...SOCIAL,
  id: 'instagram',
  brand: 'instagram',
  label: 'Instagram',
  tagline: 'Profil Instagram : contenu et publicité puis messages privés',
}

// Recommandation : réseau, bouche-à-oreille, entrées directes. Même squelette
// que le VSL (décision Jonathan 2026-08-02) mais SANS lien de redirection ni
// Media Buying : personne ne paie pour ces leads, ils arrivent tout seuls.
const RECOMMANDATION: FunnelConfig = {
  id: 'recommandation',
  family: 'recommandation',
  label: 'Recommandation',
  tagline: 'Réseau et bouche-à-oreille, puis rendez-vous',
  steps: VSL.steps,
  rates: VSL.rates,
  roles: {
    setting: VSL.roles.setting,
    closing: VSL.roles.closing,
  },
  // Les objectifs du VSL sans le CPL : pas de pub ici.
  objectives: VSL.objectives.filter((o) => o.key !== 'cpl'),
}

export const FUNNEL_CONFIGS: FunnelConfig[] = [VSL, QUIZZ, EMAILING, LINKEDIN, INSTAGRAM, RECOMMANDATION]

/** Les familles, dans l'ordre des onglets du haut. */
export const FAMILIES: { id: 'inbound' | 'social' | 'outbound' | 'recommandation'; label: string; defaultConfig: string }[] = [
  { id: 'inbound', label: 'Inbound', defaultConfig: 'vsl' },
  { id: 'outbound', label: 'Outbound', defaultConfig: 'emailing' },
  { id: 'social', label: 'Profil', defaultConfig: 'linkedin' },
  { id: 'recommandation', label: 'Recommandation', defaultConfig: 'recommandation' },
]

/** Tracés officiels des plateformes, pour les filtres du parcours Profil. */
export const BRAND_PATHS: Record<'linkedin' | 'instagram', { d: string; color: string }> = {
  linkedin: { d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z', color: '#0A66C2' },
  instagram: { d: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077', color: '#E4405F' },
}

export const configById = (id: string | null | undefined): FunnelConfig =>
  FUNNEL_CONFIGS.find((c) => c.id === id) ?? VSL

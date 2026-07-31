/**
 * Les configurations du cockpit.
 *
 * Le squelette ne bouge pas : même entonnoir, mêmes cartes de rôles, mêmes
 * calculs. Ce qui change d'un parcours à l'autre, ce sont les NOMS, parce que
 * l'événement métier derrière est le même. Contacter un lead s'appelle « envoyer
 * un DM » en social et « rappel de qualification » sur une VSL, mais c'est la
 * même donnée. Une configuration ne fabrique jamais de chiffre : elle renomme.
 */

export type FunnelConfig = {
  id: string
  label: string
  tagline: string
  /** Libellés des étapes de l'entonnoir, dans l'ordre où elles s'empilent. */
  steps: {
    leads: string
    r1: string
    showsR1: string
    r2: string
    showsR2: string
    ventes: string
  }
  /** Libellés des taux entre deux étapes. */
  rates: {
    leadsToR1: string
    showR1: string
    r1ToR2: string
    showR2: string
    close: string
  }
  /** Titre de la carte de rôle du milieu et de ses lignes. */
  setting: {
    title: string
    contactes: string
    reponses: string
    tauxReponse: string
    r1: string
    conversion: string
  }
}

export const FUNNEL_CONFIGS: FunnelConfig[] = [
  {
    id: 'vsl',
    label: 'VSL funnel',
    tagline: 'Publicité vers page de vente vidéo, puis rendez-vous',
    steps: { leads: 'Leads', r1: 'R1 bookés', showsR1: 'Shows en R1', r2: 'R2 bookés', showsR2: 'Shows en R2', ventes: 'Ventes' },
    rates: { leadsToR1: 'Taux conversion leads → R1', showR1: 'Taux de show R1', r1ToR2: 'Présents R1 → R2', showR2: 'Taux de show R2', close: 'Taux de closing' },
    setting: { title: 'Setting', contactes: 'Leads contactés', reponses: 'Réponses', tauxReponse: 'Taux de réponse', r1: 'Calls bookés (R1)', conversion: 'Taux leads contactés → R1' },
  },
  {
    id: 'quizz',
    label: 'Quizz funnel',
    tagline: 'Publicité vers quizz de qualification, puis rendez-vous',
    steps: { leads: 'Quizz complétés', r1: 'RDV bookés', showsR1: 'Présents au RDV', r2: 'RDV de closing', showsR2: 'Présents au closing', ventes: 'Ventes' },
    rates: { leadsToR1: 'Taux quizz → RDV', showR1: 'Taux de présence', r1ToR2: 'RDV → closing', showR2: 'Présence au closing', close: 'Taux de closing' },
    setting: { title: 'Qualification', contactes: 'Quizz relancés', reponses: 'Réponses', tauxReponse: 'Taux de réponse', r1: 'RDV bookés', conversion: 'Taux relancés → RDV' },
  },
  {
    id: 'social',
    label: 'Social funnel',
    tagline: 'Contenu et publicité vers messagerie, puis appel',
    steps: { leads: 'Abonnés touchés', r1: 'Calls bookés', showsR1: 'Présents à l’appel', r2: 'Appels de closing', showsR2: 'Présents au closing', ventes: 'Ventes' },
    rates: { leadsToR1: 'Taux abonnés → call', showR1: 'Taux de présence', r1ToR2: 'Call → closing', showR2: 'Présence au closing', close: 'Taux de closing' },
    setting: { title: 'Setting DM', contactes: 'DM envoyés', reponses: 'Conversations', tauxReponse: 'Taux DM → conversation', r1: 'Calls bookés', conversion: 'Taux DM → call' },
  },
]

export const configById = (id: string | null | undefined): FunnelConfig =>
  FUNNEL_CONFIGS.find((c) => c.id === id) ?? FUNNEL_CONFIGS[0]

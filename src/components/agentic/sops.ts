/**
 * SOPs & Playbooks — vues d'exécution agentique adossées au module Process.
 *
 * Process reste la bibliothèque métier (source de vérité). Ici on expose les
 * procédures/guides utiles aux HUMAINS et aux AGENTS, enrichis des champs
 * d'exécution agentique (agent utilisable, skill lié, mémoire à mettre à jour,
 * preuve attendue, validation humaine). `linkedProcess` pointe vers un process
 * existant — on ne duplique pas la source.
 *
 * Données seed (isolées, VividFlow-pertinentes). Champs absents = "à compléter".
 * À terme : vues filtrées/enrichies de `api.processes.list`.
 */

export type DocStatus = 'active' | 'review' | 'draft'
export const DOC_STATUS: Record<DocStatus, { label: string; color: string }> = {
  active: { label: 'Actif', color: '#16A34A' },
  review: { label: 'À revoir', color: '#D97706' },
  draft:  { label: 'Brouillon', color: '#9CA3AF' },
}
export const DOC_FILTERS: { id: string; label: string; match: (s: DocStatus) => boolean }[] = [
  { id: 'all', label: 'Tous', match: () => true },
  { id: 'active', label: 'Actifs', match: s => s === 'active' },
  { id: 'review', label: 'À revoir', match: s => s === 'review' },
  { id: 'draft', label: 'Brouillons', match: s => s === 'draft' },
]

export type SOPStep = { text: string; owner?: string; tool?: string; proof?: string }
export type SOP = {
  id: string; title: string; objective: string; trigger: string
  inputs: string[]; steps: SOPStep[]; output: string
  owner: string; tools: string[]; linkedSkill?: string; linkedProcess?: string
  memoryWriteback: string[]; proofExpected: string
  agentUsable: boolean; humanValidation: boolean
  estimatedTime?: string; status: DocStatus; version: string; updatedAt: string
  linkedTo?: string
}

export type DecisionRule = { if: string; then: string }
export type Playbook = {
  id: string; title: string; situation: string; objective: string
  signals: string[]; diagnosticQuestions: string[]; options: string[]
  decisionRules: DecisionRule[]; recommendedAction: string; escalation: string
  owner: string; linkedSkill?: string; linkedProcess?: string
  memoryWriteback: string[]; usedBy: string[]
  agentUsable: boolean; status: DocStatus; version: string; updatedAt: string
}

export const SOPS: SOP[] = [
  {
    id: 'sop-onboarding', title: 'Onboarding client', objective: 'Démarrer un nouveau client proprement et sans oubli.',
    trigger: 'Un lead est converti en client (contrat signé).', owner: 'AGENT SUPPORT CLIENT',
    inputs: ['Contrat signé', 'Fiche client Data OS', 'Coordonnées de contact'],
    steps: [
      { text: 'Créer la fiche d\'onboarding dans le Data OS', owner: 'Agent', tool: 'Data OS', proof: 'Fiche créée' },
      { text: 'Envoyer le message de bienvenue + planifier le kickoff', owner: 'AGENT SUPPORT CLIENT', tool: 'Telegram', proof: 'Kickoff planifié' },
      { text: 'Collecter les accès et informations nécessaires', owner: 'Humain', proof: 'Checklist inputs complète' },
      { text: 'Confirmer le périmètre et les échéances', owner: 'Humain', proof: 'Périmètre validé' },
    ],
    output: 'Client onboardé, kickoff planifié, périmètre confirmé.',
    tools: ['Data OS', 'Telegram'], linkedSkill: 'Onboarding client', linkedProcess: 'Onboarding client',
    memoryWriteback: ['Data OS', 'Second Brain'], proofExpected: 'Fiche onboarding complète + kickoff au calendrier',
    agentUsable: true, humanValidation: true, estimatedTime: '~30 min', status: 'active', version: 'v1.2', updatedAt: '2026-06-05',
    linkedTo: 'Client',
  },
  {
    id: 'sop-devis', title: 'Génération de devis', objective: 'Produire un devis conforme et envoyé à temps.',
    trigger: 'Un prospect demande une proposition chiffrée.', owner: 'AGENT OPERATIONS',
    inputs: ['Besoin client qualifié', 'Grille tarifaire', 'Coordonnées de facturation'],
    steps: [
      { text: 'Rassembler le besoin et le périmètre', owner: 'Humain', proof: 'Brief validé' },
      { text: 'Générer le devis depuis le module Devis', owner: 'Agent', tool: 'Data OS', proof: 'Devis brouillon' },
      { text: 'Relire montants, TVA et conditions', owner: 'Humain', proof: 'Relecture OK' },
      { text: 'Envoyer le devis et journaliser l\'envoi', owner: 'Agent', tool: 'Email', proof: 'Devis envoyé' },
    ],
    output: 'Devis envoyé et tracé.', tools: ['Data OS', 'Email'], linkedProcess: 'Devis',
    memoryWriteback: ['Data OS', 'Activités'], proofExpected: 'Devis au statut "envoyé" + activité loggée',
    agentUsable: true, humanValidation: true, estimatedTime: '~15 min', status: 'active', version: 'v1.0', updatedAt: '2026-05-30',
    linkedTo: 'Projet',
  },
  {
    id: 'sop-qa', title: 'QA avant publication', objective: 'Vérifier un contenu/process avant mise en ligne.',
    trigger: 'Un contenu ou une automatisation est prêt à publier.', owner: 'AGENT OPERATIONS',
    inputs: ['Élément à publier', 'Checklist QA'],
    steps: [
      { text: 'Vérifier la conformité au standard VividFlow', owner: 'Agent', tool: 'Connaissances', proof: 'Checklist QA' },
      { text: 'Tester le rendu / le déclenchement', owner: 'Humain', proof: 'Test passé' },
      { text: 'Signaler toute anomalie comme tâche', owner: 'Agent', tool: 'Tâches', proof: 'Anomalies tracées' },
    ],
    output: 'Élément validé ou anomalies remontées.', tools: ['Connaissances', 'Tâches'], linkedSkill: 'QA process',
    memoryWriteback: ['Activités'], proofExpected: 'Checklist QA cochée, anomalies en tâches',
    agentUsable: true, humanValidation: false, estimatedTime: '~10 min', status: 'review', version: 'v0.9', updatedAt: '2026-06-02',
    linkedTo: 'Process',
  },
  {
    id: 'sop-relance', title: 'Relance client', objective: 'Relancer un client/prospect de façon cohérente.',
    trigger: 'Pas de réponse après le délai défini.', owner: 'AGENT SUPPORT CLIENT',
    inputs: ['Historique des échanges', 'Dernière action', 'Échéances en cours'],
    steps: [
      { text: 'Vérifier le dernier contact et le contexte', owner: 'Agent', tool: 'Data OS', proof: 'Contexte chargé' },
      { text: 'Choisir le ton (douce / ferme) selon le Playbook', owner: 'Agent', proof: 'Ton choisi' },
      { text: 'Préparer et proposer le message', owner: 'Agent', tool: 'Telegram', proof: 'Brouillon prêt' },
      { text: 'Valider puis envoyer', owner: 'Humain', proof: 'Message envoyé' },
    ],
    output: 'Relance envoyée et tracée.', tools: ['Data OS', 'Telegram'], linkedSkill: 'Détection risque',
    memoryWriteback: ['Activités', 'Data OS'], proofExpected: 'Activité de relance loggée',
    agentUsable: true, humanValidation: true, estimatedTime: '~5 min', status: 'active', version: 'v1.1', updatedAt: '2026-06-06',
    linkedTo: 'Client',
  },
]

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-silence', title: 'Client silencieux', situation: 'Un client ou prospect ne répond plus.',
    objective: 'Relancer au bon moment, sur le bon ton, sans braquer.',
    signals: ['Pas de réponse depuis plusieurs jours', 'Messages lus non répondus', 'Rendez-vous repoussé'],
    diagnosticQuestions: ['A-t-il répondu dans les 7 derniers jours ?', 'Y a-t-il une échéance bloquante ?', 'Le silence suit-il une demande sensible (prix, contrat) ?'],
    options: ['Relance douce', 'Relance ferme', 'Attendre', 'Escalade humaine'],
    decisionRules: [
      { if: 'Silencieux > 7 jours', then: 'Relance douce' },
      { if: 'Silencieux > 14 jours OU échéance proche', then: 'Relance ferme' },
      { if: 'Client à forte valeur ou risque élevé', then: 'Escalade humaine' },
    ],
    recommendedAction: 'Proposer une relance adaptée au délai et à la valeur du client.',
    escalation: 'Demander validation humaine si client stratégique ou ton ferme.',
    owner: 'AGENT SUPPORT CLIENT', linkedSkill: 'Détection risque', linkedProcess: 'Relance client',
    memoryWriteback: ['Tâche', 'Activités', 'Data OS'], usedBy: ['AGENT SUPPORT CLIENT', 'COO'],
    agentUsable: true, status: 'active', version: 'v1.0', updatedAt: '2026-06-04',
  },
  {
    id: 'pb-paiement', title: 'Retard de paiement', situation: 'Une facture est en retard.',
    objective: 'Récupérer le paiement tout en préservant la relation.',
    signals: ['Échéance dépassée', 'Relance précédente sans effet', 'Promesse de paiement non tenue'],
    diagnosticQuestions: ['De combien de jours le retard dépasse-t-il l\'échéance ?', 'Une relance a-t-elle déjà été faite ?', 'Le client a-t-il signalé un problème ?'],
    options: ['Rappel courtois', 'Relance ferme', 'Plan de paiement', 'Escalade humaine'],
    decisionRules: [
      { if: 'Retard < 7 jours', then: 'Rappel courtois' },
      { if: 'Retard > 14 jours', then: 'Relance ferme' },
      { if: 'Retard > 30 jours ou litige', then: 'Escalade humaine' },
    ],
    recommendedAction: 'Proposer la relance correspondant au niveau de retard.',
    escalation: 'Toute action ferme ou plan de paiement → validation humaine.',
    owner: 'COO', linkedProcess: 'Devis',
    memoryWriteback: ['Tâche', 'Activités', 'Data OS'], usedBy: ['COO'],
    agentUsable: true, status: 'active', version: 'v1.0', updatedAt: '2026-06-03',
  },
  {
    id: 'pb-lead', title: 'Lead chaud entrant', situation: 'Un lead à fort potentiel arrive.',
    objective: 'Réagir vite pour ne pas perdre l\'opportunité.',
    signals: ['Demande explicite', 'Budget mentionné', 'Échéance courte côté client'],
    diagnosticQuestions: ['Le besoin est-il clair ?', 'Le budget est-il dans la cible ?', 'Qui est le meilleur owner ?'],
    options: ['Qualifier maintenant', 'Planifier un R1', 'Router vers un humain'],
    decisionRules: [
      { if: 'Besoin + budget clairs', then: 'Planifier un R1 rapidement' },
      { if: 'Infos manquantes', then: 'Qualifier avant R1' },
      { if: 'Deal stratégique', then: 'Router vers un humain' },
    ],
    recommendedAction: 'Proposer la prochaine étape de qualification ou de RDV.',
    escalation: 'Deal stratégique ou hors cadre → validation humaine.',
    owner: 'AGENT SUPPORT CLIENT', linkedSkill: 'Onboarding client',
    memoryWriteback: ['Tâche', 'Data OS'], usedBy: ['AGENT SUPPORT CLIENT'],
    agentUsable: true, status: 'review', version: 'v0.8', updatedAt: '2026-05-29',
  },
  {
    id: 'pb-onboarding-bloque', title: 'Onboarding bloqué', situation: 'Un onboarding n\'avance plus.',
    objective: 'Identifier le blocage et le lever.',
    signals: ['Étape en attente depuis longtemps', 'Inputs manquants', 'Client peu réactif'],
    diagnosticQuestions: ['Quelle étape bloque ?', 'L\'information manquante est-elle critique ?', 'Le blocage vient-il du client ou de nous ?'],
    options: ['Relancer le client', 'Compléter en interne', 'Escalade humaine'],
    decisionRules: [
      { if: 'Blocage côté client', then: 'Relance ciblée sur l\'input manquant' },
      { if: 'Blocage interne', then: 'Créer une tâche pour débloquer' },
      { if: 'Blocage critique > 7 jours', then: 'Escalade humaine' },
    ],
    recommendedAction: 'Proposer l\'action qui lève le blocage identifié.',
    escalation: 'Blocage critique persistant → validation humaine.',
    owner: 'AGENT SUPPORT CLIENT', linkedSkill: 'Onboarding client', linkedProcess: 'Onboarding client',
    memoryWriteback: ['Tâche', 'Activités'], usedBy: ['AGENT SUPPORT CLIENT', 'AGENT OPERATIONS'],
    agentUsable: true, status: 'active', version: 'v1.0', updatedAt: '2026-06-01',
  },
]

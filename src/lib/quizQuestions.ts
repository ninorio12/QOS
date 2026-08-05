/**
 * Jeux de questions canoniques des questionnaires VividFlow.
 *
 * Source unique : le module Closing et la fiche de prospection lisent la MÊME
 * liste. Avant, chacun avait la sienne, et une question modifiée sur la page du
 * quiz faisait diverger les deux écrans sans que personne le voie.
 *
 * Questions relevées sur quiz.vividflow.co le 28/07/2026. Toute question
 * modifiée sur la page doit être reportée ici, sinon la réponse tombe dans le
 * bloc « Autres réponses captées » du module Closing.
 */

export const QUIZ_DIAGNOSTIC = [
  "Quel département vous demande le plus de temps ?",
  "Avez-vous identifié les processus de votre entreprise qui pourraient être automatisés ?",
  "Utilisez-vous déjà des outils intégrant de l'intelligence artificielle ?",
  "Vos données sont-elles structurées et accessibles ?",
  "Quel est le niveau d'implication de votre direction dans les projets de transformation digitale ?",
  "Vos équipes sont-elles formées ou sensibilisées à l'IA ?",
]

export const QUIZ_CONFIRMATION = [
  "Quel type d'entreprise dirigez-vous ?",
  "Combien de personnes travaillent aujourd'hui dans l'entreprise ?",
  "Quel est votre chiffre d'affaires mensuel approximatif ?",
  "Quelle fonction vous coûte le plus de temps, d'argent ou d'énergie aujourd'hui ?",
  "À combien estimez-vous le coût mensuel ou le temps humain mobilisé sur ces tâches répétitives ?",
  "Pourquoi voulez-vous installer des agents IA maintenant ?",
  "Si l'audit révèle une opportunité claire, quand aimeriez-vous lancer une première installation ?",
  "Avez-vous déjà prévu un budget pour intégrer l'IA dans vos opérations ?",
  "Votre nom complet",
  "Votre société",
]

/**
 * Formulaire de réservation iClosed « Audit IA offert ». Les anciennes questions
 * orientées agences immobilières ont été retirées du formulaire.
 */
export const QUIZ_BOOKING = [
  "Quel est le nom de votre entreprise ?",
  "Quel est votre rôle dans l’entreprise ?",
  "Comment avez-vous entendu parler de VividFlow ?",
  "Phone Number",
  "First Name",
  "Last Name",
]

/** Normalise une question pour rapprocher une réponse captée de sa question canonique. */
export const normQ = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

/**
 * Score de maturité IA : la MÊME mécanique que la page du diagnostic.
 *
 * Le quiz calcule le pourcentage affiché dans son cercle final, mais ne
 * l'enregistre pas : seules les réponses arrivent dans le Data OS. La fiche le
 * recalcule donc à l'identique, à partir de l'identifiant de question et de la
 * valeur choisie (jamais du libellé, qui peut être réécrit sans prévenir).
 *
 * ⚠️ Table relevée sur quiz.vividflow.co le 05/08/2026. Un barème modifié sur la
 * page doit être reporté ici, sinon la fiche et le diagnostic du prospect
 * afficheront deux chiffres différents pour la même personne.
 *
 * La question « temps » ne porte aucun point : c'est un aiguillage de discours,
 * pas une mesure de maturité. Elle compte donc pour 0 dans le maximum, comme
 * sur la page.
 */
export const QUIZ_BAREME: Record<string, { value: string; points: number }[]> = {
  temps: [{ value: "acquisition", points: 0 }, { value: "vente", points: 0 }, { value: "delivery", points: 0 }, { value: "admin", points: 0 }],
  processus: [{ value: "aucun", points: 0 }, { value: "idees", points: 1 }, { value: "liste", points: 2 }, { value: "documente", points: 3 }],
  outils: [{ value: "aucun", points: 0 }, { value: "chatgpt", points: 1 }, { value: "metier", points: 2 }, { value: "surmesure", points: 3 }],
  donnees: [{ value: "disperse", points: 0 }, { value: "partiel", points: 1 }, { value: "outils", points: 2 }, { value: "centralise", points: 3 }],
  direction: [{ value: "aucune", points: 0 }, { value: "prudente", points: 1 }, { value: "soutien", points: 2 }, { value: "strategie", points: 3 }],
  equipes: [{ value: "aucune", points: 0 }, { value: "auto", points: 1 }, { value: "sessions", points: 2 }, { value: "programme", points: 3 }],
}

export type Maturite = { points: number; max: number; pct: number; niveau: 'debutant' | 'intermediaire' | 'avance' }

/** Paliers identiques à la page : 65 % et plus = avancé, 35 % et plus = intermédiaire. */
export function scoreMaturite(reponses: { id?: string; value?: string }[]): Maturite | null {
  const parId = new Map(reponses.filter(r => r.id).map(r => [r.id as string, r.value ?? '']))
  let points = 0, max = 0, repondues = 0
  for (const [qid, options] of Object.entries(QUIZ_BAREME)) {
    const maxQ = Math.max(0, ...options.map(o => o.points))
    max += maxQ
    const choisi = options.find(o => o.value === parId.get(qid))
    if (choisi) { points += choisi.points; repondues++ }
  }
  // Aucune réponse reconnue : on ne fabrique pas un 0 %, on ne montre rien.
  if (repondues === 0 || max === 0) return null
  const pct = Math.round((points / max) * 100)
  const niveau = pct >= 65 ? 'avance' : pct >= 35 ? 'intermediaire' : 'debutant'
  return { points, max, pct, niveau }
}

/** Ce que dit la page de diagnostic pour chaque palier, resserré pour une fiche. */
export const NIVEAUX_MATURITE: Record<Maturite['niveau'], { label: string; couleur: string; fond: string; phrase: string; recos: string[] }> = {
  debutant: {
    label: 'Débutant', couleur: '#EF6A3D', fond: '#FFF1EA',
    phrase: "Aux premiers stades de la réflexion sur l'IA. Le moment de poser les bases.",
    recos: ['Auditer les processus répétitifs', 'Sensibiliser les équipes', 'Structurer les données (CRM, ERP)'],
  },
  intermediaire: {
    label: 'Intermédiaire', couleur: '#6B4BC4', fond: '#F1EDFF',
    phrase: 'Transformation entamée. Les fondations sont là pour passer à l\'échelle.',
    recos: ['Prioriser par impact et effort', 'Déployer des agents sur des cas pilotes', 'Mesurer le retour des premières initiatives'],
  },
  avance: {
    label: 'Avancé', couleur: '#12B389', fond: '#E7F8F1',
    phrase: 'Prêt à tirer pleinement parti de l\'IA, y compris à grande échelle.',
    recos: ['Déployer des agents autonomes sur les processus critiques', 'Intégrer l\'IA à la stratégie', 'Mettre en place une gouvernance'],
  },
}

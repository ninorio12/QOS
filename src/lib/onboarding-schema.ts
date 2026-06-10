// ─────────────────────────────────────────────────────────────────────────
// Schéma partagé du formulaire d'onboarding — SOURCE DE VÉRITÉ UNIQUE.
// Le formulaire public ET la card "Formulaire d'onboarding" (Data OS) sont
// pilotés par ce fichier. On édite ICI quand le form évolue → les deux faces
// restent automatiquement en correspondance (pas de divergence possible).
//
// Structure récupérée à 100% du mockup vividflow-onboarding (9 étapes).
// ─────────────────────────────────────────────────────────────────────────

export type FieldKind =
  | 'text' | 'email' | 'phone' | 'textarea' | 'select'
  | 'tags'        // pills "cochez ce qui vous parle" (multi)
  | 'checklist'   // cartes multi-sélection (départements)
  | 'account'     // ligne compte + statut (étape Prépa technique)

export type Field = {
  key: string
  kind: FieldKind
  label?: string
  placeholder?: string
  optional?: boolean
  options?: string[]        // select / tags / checklist
  desc?: string             // account
  statuses?: string[]       // account
  signupUrl?: string        // account : lien de souscription à prendre
  signupLabel?: string      // account : libellé du lien
  videoUrl?: string         // account : vidéo de présentation (embed) — vide = espace réservé
  accessPlaceholder?: string // account : placeholder du champ libre d'accès
}

export type Group = { title?: string; fields: Field[] }

export type Step = {
  id: string
  eyebrow?: string          // ex: "ENTREPRISE"
  title: string
  intro?: string
  variant?: 'intro' | 'schedule'   // étapes au layout sur-mesure
  groups: Group[]
}

// Statuts réutilisés pour les comptes (étape 7)
export const ACCOUNT_STATUSES = [
  'À faire', 'Fait', 'À faire ensemble pendant l\'appel', 'Bloqué', 'Je ne sais pas',
] as const

export const SECURITY_NOTE =
  "On privilégie les invitations officielles par email à hey@vividflow.co " +
  "(les mots de passe ne sont pas demandés dans ce formulaire ; si un accès " +
  "sensible est nécessaire, on le fera plus tard ensemble et on le stockera " +
  "dans un coffre sécurisé)."

export const ONBOARDING_STEPS: Step[] = [
  // 1 ──────────────────────────────────────────────────────────────────────
  {
    id: 'intro',
    title: 'On y va ?',
    intro: 'Cet onboarding prépare votre kick-off avec Thomas, notre CTO. Durée : 25 à 35 min.',
    variant: 'intro',
    groups: [],
  },

  // 2 ──────────────────────────────────────────────────────────────────────
  {
    id: 'company',
    eyebrow: 'ENTREPRISE',
    title: 'Votre entreprise',
    intro: "On a juste besoin de bien vous connaître pour s'adapter à vous dans les étapes suivantes. Si vous ne savez pas un champ, laissez-le vide.",
    groups: [
      {
        title: 'VOTRE STRUCTURE',
        fields: [
          { key: 'companyName', kind: 'text', label: "Nom de l'entreprise" },
          { key: 'website', kind: 'text', label: 'Site web', placeholder: 'https://…', optional: true },
          {
            key: 'sector', kind: 'select', label: "Secteur d'activité",
            options: ['Immobilier', 'BTP / construction', 'Conseil / agence', 'Cabinet (juridique, comptable, conseil)', 'Services aux entreprises', 'Commerce / retail', 'Santé / paramédical', 'Industrie', 'Tech / SaaS', 'Formation / éducation', 'Autre'],
          },
          { key: 'location', kind: 'text', label: 'Localisation principale' },
          { key: 'activityLine', kind: 'text', label: "Type d'activité en une ligne", placeholder: 'Ex : cabinet de…' },
          { key: 'teamSize', kind: 'select', label: "Taille de l'équipe", options: ['1 (solo)', '2 à 5', '6 à 15', '16 à 50', '50 et plus'] },
          { key: 'businessModel', kind: 'select', label: 'Modèle économique', options: ['B2B', 'B2C', 'B2B + B2C', 'B2G (secteur public)', 'Autre / hybride'] },
          { key: 'revenue', kind: 'text', label: 'Chiffre d\'affaires actuel', optional: true },
          { key: 'revenuePeriod', kind: 'select', label: 'Période', options: ['Par mois', 'Par trimestre', 'Par année'], optional: true },
        ],
      },
      {
        title: 'VOUS',
        fields: [
          { key: 'firstName', kind: 'text', label: 'Votre prénom' },
          { key: 'lastName', kind: 'text', label: 'Votre nom' },
          { key: 'email', kind: 'email', label: 'Votre email', placeholder: 'vous@entreprise.com' },
          { key: 'phone', kind: 'phone', label: 'Téléphone', optional: true },
          { key: 'role', kind: 'text', label: 'Votre rôle' },
          { key: 'contextNote', kind: 'textarea', label: 'Une chose importante à ajouter sur votre contexte ?', optional: true },
        ],
      },
    ],
  },

  // 3 ──────────────────────────────────────────────────────────────────────
  {
    id: 'objectives',
    eyebrow: 'OBJECTIF',
    title: "Ce qu'on doit améliorer",
    intro: "Trois questions pour cibler vos vraies priorités. Si une question ne s'applique pas, laissez-la vide.",
    groups: [
      {
        fields: [
          { key: 'priorityProblem', kind: 'textarea', label: 'Quel problème voulez-vous résoudre en priorité ?', optional: true },
          {
            key: 'priorityProblemTags', kind: 'tags', label: 'OU COCHEZ CE QUI VOUS PARLE',
            options: ['Me faire gagner du temps sur l\'administratif', 'Savoir chaque matin ce qui est bloqué', 'Centraliser clients, factures et tâches au même endroit', 'Améliorer le suivi des relances clients', 'Diminuer les erreurs de facturation et de saisie', 'Standardiser la réponse aux demandes récurrentes'],
          },
          { key: 'timeWasters', kind: 'textarea', label: 'Quelles tâches vous font perdre le plus de temps aujourd\'hui ?', optional: true },
          { key: 'aiWeekly', kind: 'textarea', label: "Qu'est-ce que vous voudriez que l'IA fasse pour vous chaque semaine ?", optional: true },
          {
            key: 'aiWeeklyTags', kind: 'tags', label: 'OU COCHEZ CE QUI VOUS PARLE',
            options: ['Préparer mes factures du jour', 'Détecter les retards et les blocages', 'Rédiger des brouillons que je valide avant envoi', 'Trier mes emails par priorité et urgence', 'Synthétiser mes rendez-vous et appels', 'Préparer mes relances clients du jour'],
          },
        ],
      },
    ],
  },

  // 4 ──────────────────────────────────────────────────────────────────────
  {
    id: 'departments',
    eyebrow: 'CONTEXTE',
    title: 'Départements concernés',
    intro: "Sélectionnez tous les périmètres où l'IA va intervenir, même partiellement.",
    groups: [
      {
        fields: [
          { key: 'departments', kind: 'checklist', options: ['Direction', 'Commercial', 'Marketing', 'Opérations', 'Support', 'Finance', 'RH', 'Autre'] },
          { key: 'orgDetails', kind: 'textarea', label: "Précisions sur l'organisation", optional: true },
        ],
      },
    ],
  },

  // 5 ──────────────────────────────────────────────────────────────────────
  {
    id: 'tools',
    eyebrow: 'OUTILS',
    title: 'Vos outils et accès',
    intro: "Répondez simplement. Pas besoin d'être technique : si vous ne savez pas, écrivez « je ne sais pas ». Priorité : inviter hey@vividflow.co directement depuis vos outils.",
    groups: [
      {
        fields: [
          {
            key: 'toolFamilies', kind: 'checklist', label: "Sélectionnez les familles d'outils concernées",
            options: ['CRM / fichier clients', 'Cloud / documents (Drive, Notion…)', 'Meta Ads / Business Manager', 'Autre outil'],
          },
          { key: 'toolsDetails', kind: 'textarea', label: 'Précisions sur vos outils et leur statut d\'accès', optional: true },
        ],
      },
    ],
  },

  // 6 ──────────────────────────────────────────────────────────────────────
  {
    id: 'method',
    eyebrow: 'MÉTHODE ACTUELLE',
    title: 'Comment ça marche aujourd\'hui',
    intro: "Répondez simplement. Pas besoin d'être technique : si vous ne savez pas, écrivez « je ne sais pas ».",
    groups: [
      {
        fields: [
          { key: 'processDescription', kind: 'textarea', label: 'Décrivez le parcours habituel, du début à la fin', optional: true },
          {
            key: 'processTemplate', kind: 'tags', label: 'OU COCHEZ CE QUI VOUS PARLE',
            options: ['Demande reçue → vérification → production → validation → facture', 'Prospect → rendez-vous → devis → relance → signature', 'Commande → paiement → préparation → livraison → suivi', 'Ticket support → diagnostic → résolution → vérification → clôture', 'Annonce de poste → candidatures → entretiens → décision → contrat', 'Mandat reçu → estimation → diffusion → visites → offre → signature'],
          },
          { key: 'riskySteps', kind: 'textarea', label: 'Quelles étapes peuvent bloquer ou créer des erreurs ?', optional: true },
          { key: 'deadlines', kind: 'textarea', label: 'Y a-t-il des deadlines importantes ?', optional: true },
        ],
      },
    ],
  },

  // 7 ──────────────────────────────────────────────────────────────────────
  {
    id: 'accounts',
    eyebrow: 'PRÉPARATION TECHNIQUE',
    title: 'Accès & comptes',
    intro: "Préparez ce qui peut l'être. Pour chaque service : prenez la souscription via le lien, regardez la vidéo, puis collez l'accès / l'invitation dans le champ. Aucun mot de passe sensible — uniquement des invitations ou des clés non critiques.",
    groups: [
      {
        fields: [
          { key: 'vercel', kind: 'account', label: 'Vercel', desc: 'Sert à déployer vos tableaux de bord internes. Créez le compte puis invitez hey@vividflow.co dans Team → Members.', statuses: [...ACCOUNT_STATUSES], signupUrl: 'https://vercel.com/signup', signupLabel: 'Créer un compte Vercel', accessPlaceholder: 'Email du compte / invitation envoyée à hey@vividflow.co…' },
          { key: 'hosting', kind: 'account', label: 'Hébergement / VPS', desc: 'Infomaniak recommandé (Suisse), ou tout VPS existant.', statuses: [...ACCOUNT_STATUSES], signupUrl: 'https://www.infomaniak.com/fr/hebergement/vps-cloud', signupLabel: 'Voir Infomaniak VPS', accessPlaceholder: 'Fournisseur, IP, ou note sur votre VPS existant…' },
          { key: 'llmKey', kind: 'account', label: 'Clé API LLM (OpenAI ou Anthropic)', desc: 'Une seule clé suffit pour démarrer.', statuses: [...ACCOUNT_STATUSES], signupUrl: 'https://console.anthropic.com/', signupLabel: 'Créer une clé (Anthropic / OpenAI)', accessPlaceholder: 'Collez la clé API ici (ou « je ne sais pas »)…' },
          { key: 'convex', kind: 'account', label: 'Convex (base de données)', desc: 'Maintient la mémoire et les données du Data OS.', statuses: [...ACCOUNT_STATUSES], signupUrl: 'https://www.convex.dev/', signupLabel: 'Créer un projet Convex', accessPlaceholder: 'Deploy key Convex ou nom du projet…' },
          { key: 'googleWorkspace', kind: 'account', label: 'Google Workspace', desc: 'Uniquement si Gmail / Calendar / Drive professionnels. Ajoutez hey@vividflow.co dans la console admin.', statuses: [...ACCOUNT_STATUSES], signupUrl: 'https://workspace.google.com/', signupLabel: 'Google Workspace', accessPlaceholder: 'Domaine pro / invitation envoyée…' },
        ],
      },
    ],
  },

  // 8 ──────────────────────────────────────────────────────────────────────
  {
    id: 'modules',
    eyebrow: 'KICK-OFF',
    title: 'Modules à cadrer pendant le kick-off',
    intro: 'Cette première sélection sert à orienter le kick-off avec Thomas. Elle sera confirmée pendant l\'appel.',
    groups: [
      {
        title: 'PRINCIPAUX',
        fields: [
          { key: 'modules', kind: 'checklist', options: ['Bras droit dirigeant', 'Data OS / cockpit KPI'] },
          { key: 'modulesNote', kind: 'textarea', label: 'Quelque chose à préciser, exclure ou repousser ?', optional: true },
        ],
      },
    ],
  },

  // 9 ──────────────────────────────────────────────────────────────────────
  {
    id: 'kickoff',
    eyebrow: 'KICK-OFF',
    title: 'Réservez votre kick-off avec Thomas',
    intro: 'Choisissez un créneau ci-dessous. Thomas, CTO de VividFlow, parcourt vos réponses avant l\'appel et arrive avec une première lecture de votre setup.',
    variant: 'schedule',
    groups: [],
  },
]

export const TOTAL_STEPS = ONBOARDING_STEPS.length

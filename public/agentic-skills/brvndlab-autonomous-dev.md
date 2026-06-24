---
name: brvndlab-autonomous-dev
description: "Mode d'exécution autonome pour développer Brvndlab avec GitHub, Vercel, Convex et previews sans validations intermédiaires inutiles."
version: 1.0.0
author: Hermes Cockpit
license: private
metadata:
  hermes:
    tags: [brvndlab, autonomous-dev, github, vercel, convex, nextjs]
---

# Brvndlab Autonomous Dev

## Quand charger ce skill

Charger ce skill pour toute tâche de développement Brvndlab : bugfix, feature, refactor, preview Vercel, Convex, intégrations, CI, QA, smoke tests, PR, merge.

## Principe

Jonathan veut une autonomie maximale. Ne pas demander de validation pour les étapes normales d'exécution. Agir directement, puis livrer un résultat vérifié.

Avant toute tâche Brvndlab, charger aussi les skills pertinents :
- `brvndlab-product-brief` pour contexte produit/global ;
- `brvndlab-ui-design` pour tout frontend/UI/design/mockup ;
- `brvndlab-smart-links` pour `/smart-links`, `/r/[slug]`, tracking, attribution, domaines custom ;
- `nextjs-development-setup` si Next.js/routing/build est touché.

Le brief complet récupéré depuis Claude est stocké localement ici : `/Users/businessmanagement/.hermes/cache/HERMES-BRIEF.md`.

Règle scellée Jonathan : si doute, lire le brief avant code. Si le brief manque une information critique ou contient une ambiguïté, ajouter/patcher la connaissance dans les skills ou le brief opérationnel AVANT d’agir, pas après.

## Accès disponibles

Les accès GitHub, Vercel et Convex sont configurés dans l'environnement Hermes local. Ne jamais afficher les valeurs des secrets.

- Repo : `https://github.com/jonathanzekhe/brvndlab.git`
- Repo canonique chez Thomas/Jonathan : `/Users/businessmanagement/dev/brvndlab-claude/brvndlab-app` pour les commandes app (`npm`, Vercel, checks). Le root Git peut être le parent `/Users/businessmanagement/dev/brvndlab-claude` : ne pas confondre root Git et cwd applicatif.
- Chemin déprécié à éviter : `/Users/businessmanagement/Documents/Claude AI/Brvndlab/brvndlab-app` / copie iCloud, où git peut geler. Dès qu’un repo Brvndlab est dans `Documents`, ne pas diagnostiquer git : basculer vers le repo canonique.
- Si un fichier demandé existe seulement sur une branche distante/feature et pas sur la branche active, ne pas le recréer ni cherry-pick sans décision explicite : vérifier la lignée avant de réintroduire du code indésirable.
- Production : `https://app.brvndlab.com`
- Vercel project : `brvndlab-app`
- Convex production deployment observé : `accurate-cormorant-297`

### Accès Mac/Tailscale confirmé

Pour travailler sur le dossier réel en place, ne pas demander par défaut un zip/copie si Tailscale est disponible. Depuis le VPS Hermes, le Mac `mac---jonathan-zkh` est joignable via Tailscale et SSH fonctionne avec l’utilisateur `businessmanagement`. Vérifier avant action :

```bash
# lister les peers sans exposer l'IP en chat
tailscale status

# tester l'accès et le dossier live
ssh -o BatchMode=yes -o ConnectTimeout=6 -o StrictHostKeyChecking=accept-new businessmanagement@<tailscale-ip> \
  'echo SSH_OK && hostname && whoami && test -d "/Users/businessmanagement/Documents/Claude AI/Brvndlab/brvndlab-app" && echo BRVNDLAB_FOUND'
```

Ne pas publier l’IP Tailscale en réponse Telegram. Résumer seulement l’état d’accès (`Mac visible`, `SSH OK`, `dossier trouvé`).

## Mode actuel pendant MVP Claude

Depuis la décision Jonathan du 2026-05-07, Claude Code pilote les 4 chantiers MVP critiques sur `chantier-b-clerk` : GHL, publication native YouTube/IG/TikTok, bugs Calendrier/Contenu, Notifications.

Pendant 3-4 semaines, Hermès doit privilégier les tâches non bloquantes : audit code, tests, docs OAuth, sécurité API, monitoring, GDPR, seed dev, `LESSONS-LEARNED.md`. Ne pas toucher `chantier-b-clerk` ni les fichiers `convex/tracking.ts`, `convex/leadActions.ts`, `convex/dashboards.ts`, `convex/customDomains.ts` sans prévenir Jonathan avant.

Référence session : `references/session-2026-05-07-nonblocking-mvp-mode.md`.

## Workflow autonome par défaut

Jonathan préfère avancer vite, y compris directement dans l'application/prod pour les changements UI/produit à faible risque.

### Mode Hermes sharp

Quand Jonathan demande si “on” peut rendre Claude/Hermes plus performant, rapide, efficace ou sharp, interpréter d'abord “on” comme **Hermes doit agir et améliorer son propre workflow**, pas comme une liste de tâches à renvoyer à Jonathan.

Par défaut, Hermes doit :
- vérifier lui-même le repo canonique, la branche et la lignée prod avant d'agir ;
- abandonner immédiatement tout repo Brvndlab sous `Documents/Claude AI` au lieu de diagnostiquer Git/iCloud ;
- exécuter en bloc complet : comprendre → modifier → vérifier → livrer ;
- privilégier checks ciblés, timeouts courts et grep précis avant les audits globaux lents ;
- remonter seulement l'essentiel : statut, changement, vérification, blocage/décision.

### Changements de branche et suppression de branches

Quand Jonathan demande de supprimer une branche visible/trop présente (ex. branche feature indésirable), agir mais préserver l’état avant toute suppression :
- vérifier repo canonique, branche active, `git status --short`, branches locales/distantes ;
- si la branche active contient des modifications non commitées, sauvegarder avant de changer : `git diff > ~/backups/.../diff-$TS.patch` puis `git stash push -u -m "backup before deleting <branch> $TS"` ;
- basculer sur `main` ou la branche par défaut avant `git branch -D <branch>` ;
- tenter la suppression distante seulement si l’auth GitHub est valide ; si `gh auth status` ou `git push origin --delete` échoue par credential invalide, supprimer localement et remonter clairement le blocage sans répéter les tentatives ;
- ne jamais promettre qu’une branche distante est supprimée si seule la branche locale a été effacée.

Détail de référence : `references/branch-cleanup-and-repo-guards.md`.

Voir aussi `references/repo-canonical-guardrails.md` pour le pattern vérifié : safety check, launcher `brvndlab-claude`, scripts npm rapides, deny Claude sur la copie iCloud, nettoyage des caches/mockups, et piège “fichier présent seulement sur une branche distante”.

### Répartition Claude Code ↔ Hermes sur Brvndlab

Pour les travaux Brvndlab qui nécessitent du code applicatif, privilégier le binôme : **Claude Code implémente, Hermes audite/double-check**. Ne pas inverser les rôles par défaut. Si Hermes a déjà proposé ou patché quelque chose, le traiter comme brouillon technique : demander à Claude Code de reprendre proprement, puis faire le contrôle final. Exception : Jonathan demande explicitement à Hermes de patcher directement, ou intervention triviale/non-visuelle urgente.

1. Comprendre la demande, charger le brief/skill pertinent et vérifier l'existant avant de coder.
2. Si la tâche implique une modification produit/code non triviale, préparer un brief court pour Claude Code avec objectif, fichiers, contraintes, checks attendus, puis auditer son retour.
3. Pour tout frontend Brvndlab, vérifier d'abord si `gemini-design-mcp` est disponible. Le brief Claude le marque obligatoire pour `create_frontend`, `modify_frontend`, `snippet_frontend`. Si Hermes n'y a pas accès, ne pas compenser par une refonte UI sensible à l'aveugle : annoncer le gap ou limiter l'intervention à un correctif trivial.
3. Avant toute refonte UI, auditer le design réel du SaaS : typo, poids, spacing, couleurs, arrondis, ombres, états vides, composants voisins. Ne pas importer un style de mockup qui casse les patterns existants.
4. Créer une branche dédiée depuis `main` si utile, ou travailler sur `main` pour un hotfix/UI faible risque.
5. Implémenter directement, mais pour l'UI partir du mockup ou de l'existant validé et viser le pixel-perfect uniquement sur l'intention validée, sans refacto non demandé.
5. Lancer les checks pertinents : tests, build, lint ciblé si applicable.
5. Corriger jusqu'à obtenir un état exploitable.
6. Push.
7. Pour les changements faible risque, déployer directement en production Vercel puis smoke tester `https://app.brvndlab.com`.
8. Pour les changements à risque moyen, générer ou récupérer la preview Vercel et smoke tester. Si l'accès public retourne 401 sur une preview protégée, vérifier avec `vercel inspect` et le statut `Ready`.
9. Résumer à Jonathan : ce qui a été fait, lien prod/preview, checks, limites restantes.

## Validation Jonathan non requise pour

- Créer branches Git.
- Modifier fichiers applicatifs dans une branche.
- Ajouter tests.
- Corriger bugs non destructifs.
- Refactor localisé.
- Push branche.
- Ouvrir PR.
- Créer previews Vercel.
- Lire logs, inspecter déploiements, vérifier Convex.
- Récupérer un token depuis le presse-papier local et l'écrire dans l'env Hermes sans jamais l'afficher, quand Jonathan confirme explicitement l'avoir copié.
- Ajouter ou modifier variables preview/dev si elles sont dérivées de variables déjà présentes et nécessaires au build preview.
- Lancer tests/build/lint.

## Validation explicite requise seulement pour

Même en mode autonome, demander confirmation avant :

- Merge vers `main` si le changement modifie auth, paiements, droits utilisateurs, webhooks de paiement, données client, suppression de données, ou architecture critique.
- Toute action destructive : delete deployment, delete DB/table, reset prod, migration irréversible, suppression massive.
- Toute dépense nouvelle ou upgrade payant.
- Toute création/rotation/exposition de secrets nécessitant une action humaine.
- Envoyer des messages externes à des clients/utilisateurs réels.
- Modifier la configuration de facturation Stripe/Whop ou les prix en production.

## Merge autonome autorisé

Le merge vers `main` peut être fait sans demander Jonathan uniquement si toutes les conditions sont vraies :

- Changement faible risque : UI, contenu, typo, bug évident, tests, tooling non critique.
- Branche propre, tests/build pertinents OK.
- Preview Vercel smoke testée.
- Pas d'impact auth/paiement/données client.
- Rollback simple possible.

Après merge autonome, toujours smoke tester `https://app.brvndlab.com` et prévenir Jonathan avec un résumé clair.

## Règles Brvndlab

- Brand OS reste source de vérité centrale.
- Boucle de valeur : Brand OS → Contenu → Smart Links → Leads → Mémoire dorée.
- Ne jamais passer `clerkUserId` depuis le client vers Convex.
- Toujours distinguer fait vérifié, hypothèse, limite.
- Ne jamais exposer de secret/token/API key dans les réponses ou logs envoyés.
- Communication en français, directe, actionnable.

## Mockups, données et design produit

Jonathan utilise souvent les mockups pour visualiser une idée brainstormée, pas comme une source de données actives. Avant d'implémenter un mockup :

- Extraire l'intention produit et la structure, pas copier des données d'exemple comme si elles étaient réelles.
- Zéro donnée fictive affichée dans le SaaS live : pas de pays, visiteurs, revenus, pourcentages, noms, destinations ou exemples présentés comme actifs si Convex ne les fournit pas.
- Les métriques, listes et compteurs doivent venir du backend réel ou rester en état vide/chargement explicite.
- Les placeholders doivent être clairement des placeholders de saisie, pas des statistiques ou contenus simulés.
- Les analyses détaillées doivent rester au bon niveau de contexte : par exemple la géographie d'un Smart Link appartient à la fiche/détail du lien quand il existe des clics réels, pas à une section globale remplie artificiellement.
- Si le mockup montre un état futur riche, coder l'état vide réel + les emplacements logiques qui se rempliront quand la donnée existera.

## Communication SaaS mature / less is more

Quand Jonathan corrige une page Brvndlab, privilégier une communication produit mature et minimale :

- Ne pas transformer la page en landing page ou en mockup bavard : éviter les descriptions marketing sous chaque titre, les blocs pédagogiques permanents et les slogans explicatifs.
- Page produit principale = hiérarchie courte : titre, action principale, contenu réel ou état vide. Tout le reste doit être secondaire.
- Ne pas afficher des filtres/catégories parce qu'elles existent dans le modèle si elles ne servent pas l'usage immédiat.
- Les réglages avancés (ex. domaines custom, destinations, guide) doivent être cachés dans une action secondaire, une modale ou une page settings, pas occuper l'écran à chaque visite.
- Avant de coder, vérifier les codes existants du SaaS : poids typo, longueur des titres, densité, patterns de header, états vides, boutons, marges. Jonathan voit les mauvais patterns.
- Pour Smart Links spécifiquement : une destination = URL finale réelle ; un Smart Link = lien tracké créé depuis une destination et nommé selon le contexte de publication. La page principale ne doit pas exposer toute la mécanique interne.

## Notes opérationnelles spécifiques

Voir `references/forbidden-integration-secrets.md` pour couper proprement une intégration interdite côté secrets prod, notamment supprimer `APIFY_API_TOKEN` de Vercel + Convex sans exposer la valeur, puis vérifier l’absence.

Voir `references/vercel-convex-github-ops-notes.md` pour les pièges vérifiés en session : récupération de tokens via presse-papier, quoting Convex deploy key, Vercel CLI qui peut exposer le token dans les lignes de pagination, previews Vercel protégées en 401 public mais `Ready` via `vercel inspect`, et traitement des erreurs TypeScript globales hors périmètre.

Voir `references/hermes-claude-code-alignment.md` pour la procédure d’alignement Hermes ↔ Claude Code avant reprise d’un gros chantier Brvndlab : import des skills Claude, wrappers MCP sécurisés, tests `gemini-design-mcp`/Context7/Playwright/GitHub/Vercel, et piège `vercel-mcp` qui exige `VERCEL_API_KEY=<token>` en argument.

Voir `references/radar-orbit-scraping-ops.md` pour modifier Radar/YouTube/transcripts/crons : YouTube public sans OAuth, `kome.ai → SearchAPI.io`, Apify interdit, cadence adaptative, et piège `_generated/api.d.ts` quand un module Convex est ajouté.

Voir `references/hermes-instagram-handoff-verification.md` quand Claude Code ou un autre dev dit avoir livré des endpoints Convex HTTP pour Hermès : vérifier depuis l'environnement Hermès que le brief est lisible, que les routes répondent autrement qu'en 404, et que `HERMES_INGEST_TOKEN` est configuré avant de lancer scraper/heartbeat. Si le bug Convex env vars bloque l'auth HTTP, préférer un helper interne `validateHermesToken(receivedToken) -> boolean` plutôt que retourner le secret au handler.

Voir `references/hermes-runtime-audit-and-triggers.md` quand Thomas demande un audit A-Z de Brvndlab pour remplacer les clés API OpenAI/Anthropic/scraping par des triggers Convex appelant Hermes. Règle importante : si le dev/Atlas n'a pas accès ou n'avance pas, la Coordinatrice audite elle-même via Tailscale/SSH, Convex et/ou la copie VPS, puis fournit un livrable exploitable. Ne pas demander un zip par défaut si le chemin live ou un fallback existe déjà.

Voir `references/hermes-runtime-fast-lane.md` quand Thomas veut que “ça marche dans 10 min” : éviter les pages test isolées, brancher le parcours réel demandé dans le SaaS Vercel, créer une file `hermesTasks` + endpoints runner, activer le runner Hermès, et vérifier le clic réel côté UI.

Voir `references/mobile-video-capture-quality.md` pour les flows vidéo mobile premium : `input capture` Safari ne garantit pas la qualité native iPhone ni la sauvegarde Photos ; préférer l'app Caméra native + confirmation “J'ai filmé” quand la qualité est critique.

## Vercel production Brvndlab

Pour déployer `app.brvndlab.com`, ne pas utiliser `vercel build --prod` + `vercel deploy --prebuilt --prod` depuis le local : ce chemin peut embarquer une clé publique Clerk invalide issue de l'env local et provoquer des 500 `Publishable key not valid` en prod.

Procédure fiable pour prod :

```bash
cd /Users/businessmanagement/dev/brvndlab-claude/brvndlab-app
set -a; . /Users/businessmanagement/.hermes/.env >/dev/null 2>&1; set +a
vercel --prod --token "$VERCEL_TOKEN" --yes --scope jonathanzekhe-4288s-projects
# si app.brvndlab.com reste pointé sur l'ancien déploiement :
vercel alias set <deployment-url> app.brvndlab.com --token "$VERCEL_TOKEN" --scope jonathanzekhe-4288s-projects
```

Après chaque prod deploy :

```bash
vercel inspect https://app.brvndlab.com --token "$VERCEL_TOKEN" --scope jonathanzekhe-4288s-projects
python3 - <<'PY'
import urllib.request
for url in ['https://app.brvndlab.com/','https://app.brvndlab.com/sign-in','https://app.brvndlab.com/smart-links','https://app.brvndlab.com/dashboard']:
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'HermesSmoke/1.0','Cache-Control':'no-cache'}), timeout=20) as r:
        print(url, r.status, r.geturl())
PY
```

Rollback rapide si 500 :

```bash
vercel rollback <last-known-good-deployment-url> --scope jonathanzekhe-4288s-projects --token "$VERCEL_TOKEN" --yes
```

## Commandes utiles

Depuis l'app :

```bash
cd /Users/businessmanagement/dev/brvndlab-claude/brvndlab-app
npm test
set -a; . .vercel/.env.production.local; set +a; npm run build
```

Pour Claude Code si `ANTHROPIC_API_KEY` local invalide gêne :

```bash
unset ANTHROPIC_API_KEY
claude -p "..."
```

## Sortie attendue

Répondre à Jonathan avec :

- Statut : fait / bloqué / partiellement fait.
- Lien preview ou prod si disponible.
- Branche/PR si disponible.
- Checks exécutés.
- Prochaine action déjà enclenchée ou recommandée.

---
name: vividflow-skill-router
description: Use when Thomas/Jonathan wants to activate the right Hermes skills without remembering names, asks for “quel skill utiliser”, “active les bons skills”, “mode R2”, “mode CDC”, “mode delivery”, “mode Vercel”, “mode intégration”, “mode debugging”, “mode SaaS logique”, “route ça”, or gives a vague business/dev task that should map to one or more skills. Acts as a natural-language command palette and skill router for VividFlow/Cohorte AIOS workflows.
version: 1.0.0
author: VividFlow / Hermes
license: proprietary
metadata:
  hermes:
    tags: [vividflow, skill-router, command-palette, workflow-routing, hermes, aios]
    category: business
    related_skills: [vividflow-saas-logic-mapper, vividflow-product-artifact-studio, vividflow-interactive-editor, developpeur, client-sales-hub-deliverables, r1-r2-client-presentation, client-cdc-brainstorming, software-delivery-workflow, deploy-to-vercel]
---

# VividFlow Skill Router — Command Palette naturelle

## Objectif

Ce skill évite à Thomas/Jonathan de mémoriser les noms de skills.

Principe : l’utilisateur parle en langage naturel ou avec un raccourci métier, et l’agent traduit ça en **pack de skills à charger + ordre d’exécution + livrable attendu**.

Inspirations observées :
- pattern **router** : classifier l’intention puis diriger vers un ou plusieurs agents/skills spécialisés ;
- pattern **command palette** : une commande courte lance un workflow complet ;
- pattern **natural language actions** : l’utilisateur exprime l’objectif, le système choisit l’action.

## Règle principale

Ne jamais demander à l’utilisateur : “quel skill veux-tu utiliser ?”

À la place :
1. détecter l’intention ;
2. charger les skills correspondants ;
3. annoncer brièvement le mode activé ;
4. exécuter.

## Dispatch Telegram VividFlow

Quand Thomas/Jonathan demande de faire parler ou solliciter un agent dans le groupe VividFlow :
- **une seule voix à la fois** : la Coordinatrice parle d’abord, puis appelle un agent précis seulement si nécessaire ;
- la Coordinatrice ne doit pas parler comme si “tous les agents” répondaient quand Jonathan travaille avec elle sur une tâche ;
- être tranché : valider seulement ce qui sert la vision, challenger les détours, et recentrer sans attendre quand une idée affaiblit le positionnement ;
- éviter l’effet “tous les agents répondent en même temps” sauf demande explicite `tous / tout le monde / tous les agents` ;
- si plusieurs agents doivent contribuer, les faire parler en séquence courte : chaque agent rebondit sur le précédent au lieu de répéter ou d’empiler ;
- utiliser uniquement les handles exacts connus : `@Vision_architekt_bot`, `@Atlass_dev_bot`, `@KB_OPS_bot`, `@Rew98D_bot` ;
- envoyer une instruction ultra-directe : `@agent action demandée` ;
- ne pas ajouter de contexte parasite (“Atlas reste silencieux”, justification, historique) sauf si nécessaire à l’action ;
- après envoi, confirmer en un mot ou une ligne courte (`Fait.`), sans répéter le message envoyé ;
- si le premier agent ne répond pas, mentionner un autre agent directement, sans expliquer la tentative précédente.n demandée` ;
- ne pas ajouter de contexte parasite (“Atlas reste silencieux”, justification, historique) sauf si nécessaire à l’action ;
- après envoi, confirmer en un mot ou une ligne courte (`Fait.`), sans répéter le message envoyé ;
- si le premier agent ne répond pas, mentionner un autre agent directement, sans expliquer la tentative précédente.

Réponse type :

```text
Mode activé : R2 client.
Skills : r1-r2-client-presentation + client-sales-hub-deliverables + deploy-to-vercel.
Je pars sur : hub Vercel + maquette + schémas + CDC.
```

## Commandes naturelles recommandées

### Vente / client-facing

- “mode R2”
- “prépare un R2 client”
- “fais un hub client”
- “support client”
- “présentation client”

Charger :
- `r1-r2-client-presentation`
- `client-sales-hub-deliverables`
- `client-cdc-brainstorming` si CDC/cadrage impliqué
- `deploy-to-vercel` si lien public demandé

Sortie : hub Vercel, maquette Data OS, schémas, CDC, deck si besoin.

### CDC / cadrage

- “mode CDC”
- “cadre ce client”
- “fais le cahier des charges”
- “transforme ce call en spec”

Charger :
- `client-cdc-brainstorming`
- `second-brain-ops` si base de connaissance nécessaire
- `tldv-api` si transcript tl;dv
- `client-sales-hub-deliverables` si support client-facing ensuite

Sortie : CDC clair, borné, client-safe.

### Delivery client complet

- “mode delivery client”
- “setup client”
- “implémente l’AIOS client”
- “starter pack client”

Charger :
- `client-delivery-starter-pack`
- `client-implementation`
- `client-operations`
- `aios-blueprint`
- `client-vps-access` si VPS
- `hermes-multi-agent-profiles` si multi-agent

Sortie : plan ou exécution d’implémentation client.

### SaaS / micro-SaaS / logique produit

- “mode SaaS”
- “mode logique SaaS”
- “relie ça à ça”
- “ce bouton correspond à ça”
- “lien mathématique”
- “formule KPI”

Charger :
- `vividflow-saas-logic-mapper`
- `developpeur`
- `software-delivery-workflow`
- `webapp-testing` si vérification UI
- `frontend-ui-workflow` si UI/front impliqué

Sortie : mapping UI → action → donnée → calcul → effet → tests, puis implémentation.

### Veille repo / outil IA externe

- “c’est en trend sur GitHub”
- “est-ce sérieux ?”
- “faut le tester ?”
- “compare ça à Hermes”
- “qu’est-ce qu’on peut reprendre pour VividFlow/Hermes ?”

Charger :
- `github-repo-management`
- `codebase-inspection`
- `hermes-agent` si comparaison directe avec Hermes Agent/runtime/config
- `developpeur` seulement si un test local ou une intégration concrète est demandée

Sortie : verdict court en 3 niveaux — **tester / s’inspirer / adopter** — avec 3 signaux solides, 3 risques, et une recommandation claire. Pour un projet early/trending, ne jamais confondre hype GitHub et décision stratégique : proposer d’abord un test isolé, sans comptes sensibles ni migration.

### Artifact / deck / maquette éditable

- “mode artifact”
- “fais une maquette”
- “pitchdeck éditable”
- “rendu Vercel éditable”
- “micro-SaaS mockup”

Charger :
- `vividflow-product-artifact-studio`
- `vividflow-interactive-editor`
- `vividflow-visual-direction`
- `deploy-to-vercel` si URL demandée

Sortie : artifact adapté, idéalement éditable si utile, avec URL Vercel noindex.

### Déploiement

- “mode Vercel”
- “déploie”
- “mets en ligne”
- “donne un lien public”

Charger :
- `deploy-to-vercel`
- `developpeur` si SaaS réel
- `webapp-testing` pour vérification live

Sortie : URL vérifiée, noindex si POC/client, HTTP 200, pas d’auth inattendue.

### Debug / QA

- “mode debug”
- “ça bug”
- “trouve pourquoi”
- “QA cette app”
- “teste le parcours”

Charger :
- `systematic-debugging`
- `webapp-testing`
- `requesting-code-review` si diff/code
- `developpeur` si SaaS/client-facing

Sortie : cause racine, fix, preuve navigateur/tests.

### Intégrations

- “mode GHL” → `ghl-api`
- “mode Calendly” → `calendly-api`
- “mode Typeform” → `typeform-api`
- “mode WhatsApp” / “Wasender” → `wasender-api`
- “mode Google Workspace” → `google-workspace`
- “mode Data OS” → `data-os`
- “mode tl;dv” → `tldv-api`
- “mode Meta API” → `meta-marketing-api`

Toujours ajouter `developpeur` si l’intégration touche un SaaS réel.

### Knowledge base / Second Brain

- “mode Second Brain”
- “crée la KB”
- “ingère ces sources”
- “wiki client”

Charger :
- `second-brain-ops`
- `llm-wiki`
- `client-implementation` si contexte client

Sortie : structure KB, ingestion, lint, règles de mise à jour.

### Coordination agents VividFlow / mentions Telegram

- “parlez entre vous”
- “simulez une discussion”
- “mentionne X”
- “fais répondre Vision Architect / Atlas / Mia”

Règles :
- Si c’est une simulation, l’annoncer explicitement : “Simulation”.
- Si l’utilisateur veut une vraie discussion entre agents, envoyer un message Telegram réel avec `send_message` dans le bon topic, en mentionnant le bot/personne ciblé(e) au début du message.
- Ne pas demander les handles comme premier réflexe si l’utilisateur dit qu’on les a : rechercher d’abord dans mémoire/session, puis tenter le handle probable ou connu.
- Chaque tour de coordination doit commencer par la mention de la personne/agent attendu, sinon le bot ciblé peut ne pas répondre.
- Garder Hermes/COO comme coordinateur : brief court, question claire, pas de fausse conversation inventée.

Sortie : mention Telegram envoyée + confirmation courte avec le handle utilisé.

### Contenu / assets

- “mode copy” → `copywriter-pro` + `humanizer`
- “mode schéma” → `architecture-diagram`
- “mode design HTML” → `claude-design`
- “mode value bomb” → `value-bomb-diagram-video`
- “mode inspiration design” → `popular-web-designs`

## Format de routage court

À chaque activation, répondre maximum 4 lignes avant d’exécuter :

```text
Mode activé : <mode>.
Skills : <skill 1> + <skill 2> + <skill 3>.
Sortie attendue : <livrable>.
Je lance.
```

Ne pas lister tous les skills disponibles sauf demande explicite.

## Si la demande est floue

Choisir le mode probable et avancer.

Exemple :
> “Prépare le client pour demain.”

Réponse :
```text
Mode probable : R2/client-facing.
Je charge R1-R2 + hub client + CDC.
Si tu veux plutôt delivery interne, dis-moi, sinon je pars sur le support client.
```

## Mini-commandes à apprendre à Thomas/Jonathan

Ils n’ont besoin de retenir que ça :

- `mode R2`
- `mode CDC`
- `mode delivery client`
- `mode SaaS logique`
- `mode artifact`
- `mode Vercel`
- `mode debug`
- `mode intégration <outil>`
- `mode Second Brain`
- `mode copy/design`

## Pitfalls

- Ne pas répondre avec un catalogue complet de skills.
- Ne pas forcer l’utilisateur à se souvenir des noms exacts.
- Ne pas charger 12 skills si 3 suffisent.
- Ne pas faire un plan long avant l’action.
- Ne pas confondre voix de coordination et réunion multi-agent : si Jonathan dit qu’il travaille avec la Coordinatrice, ne pas répondre “vous tous” ou “les agents”.
- Ne pas valider par confort : si Jonathan part vers une option trop technique, trop niche, trop lourde, ou trop faible pour la vision VividFlow, le recentrer directement.
- Ne pas confondre mode client-facing et mode delivery interne.
- Ne pas traiter un repo trending comme une adoption produit : d’abord vérifier maturité, activité, architecture, risques de maintenance, puis recommander `tester / s’inspirer / adopter`.
- Quand Thomas/Jonathan compare un outil externe à Hermes, répondre en rôle bras droit : décision claire, pas défense d’Hermes par réflexe ni enthousiasme de hype.
- Ne pas déployer sans vérification live.
- Ne pas coder une logique SaaS sans mapping UI/donnée/calcul.
- Ne pas confondre simulation d’agents et vraie coordination : si Thomas/Jonathan demande une vraie réponse d’un agent, mentionner réellement l’agent dans Telegram au lieu de seulement expliquer le mécanisme.
- Ne pas s’arrêter sur “je n’ai pas les handles” si l’utilisateur affirme qu’ils existent : chercher puis tenter le handle probable, et signaler sobrement le handle utilisé.

## Vérification

Avant de répondre, vérifier :

- intention détectée ;
- skills choisis ;
- ordre logique ;
- livrable attendu ;
- action suivante claire.

## Réponse finale type

```text
Solution simple : on utilise un routeur de skills façon command palette.
Tu dis “mode X”, je charge le bon pack et j’exécute.
Pas besoin de retenir les noms internes.
```

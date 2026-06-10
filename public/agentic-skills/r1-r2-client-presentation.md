---
name: r1-r2-client-presentation
description: Workflow standard pour transformer un R1/R2 Client Delivery en hub client Vercel avec 3 assets — maquette Data OS, schémas de pertinence/croissance, et CDC phase 1. À utiliser dès qu’un client passe de R1 audit/découverte à R2 présentation/proposition, ou quand operator demande de “présenter la pertinence”, “faire le lien R1/R2”, “préparer le support R2”, “hub Vercel client”, “maquette + schémas + CDC”.
version: 1.0.0
author: Hermes
license: proprietary
metadata:
  hermes:
    tags: [sales, R1, R2, client-facing, Vercel, AIOS, ClientOps, Data OS, CDC]
    related_skills: [claude-design, deploy-to-vercel, client-sales-hub-deliverables, client-cdc-brainstorming]
---

# R1 → R2 Client Presentation

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Objectif : créer un support R2 client-facing qui rend évidente la pertinence de ce qu’on a vu en R1, sans noyer le prospect dans un CDC technique.

Le livrable standard est un **hub Vercel public noindex** avec 3 assets :

1. **Maquette Data OS / cockpit** — projection concrète de ce que le client va voir/utiliser.
2. **Schémas de pertinence** — escalier de croissance + source de vérité IA.
3. **CDC écrit phase 1** — ce qu’on met en place, borné, clair, sans prix sauf instruction explicite.

## Quand utiliser

Utiliser ce skill quand :

- un R1 vient d’être analysé et il faut préparer le R2 ;
- operator demande un support “comme le lien Vercel” ;
- il faut présenter au client la pertinence de l’IA à partir de ses problèmes réels ;
- il faut créer un hub avec maquette, schémas et CDC ;
- on veut standardiser la transition R1 → R2 ;
- Jonathan prépare un deck/support d’éducation pour l’appel découverte afin d’expliquer l’IA opérationnelle, le passage SaaS → AGaaS, et rendre l’audit nécessaire.

## Principe commercial

Le R1 sert à diagnostiquer : douleurs, outils, process, opportunités, maturité, budget/intention.

### Variante amont — deck d’éducation en appel découverte

Quand Jonathan construit le support utilisé pendant le premier appel, ne pas le traiter comme un R2/proposition. Le but est d’éduquer et de créer la bascule mentale : SaaS/outils/automatisations → AGaaS / infrastructure IA opérationnelle. Charger aussi `references/discovery-call-agaas-education-deck.md`.

When Jonathan demande de retrouver une présentation client existante, charger `references/client-presentation-canonical-links.md` avant de conclure : le lien canonique peut être un alias Vercel propre, pas forcément le dernier déploiement `-vN`.

When Jonathan demande le **template R2**, le **deck à trous**, ou “le même que Bula mais à trous”, charger aussi `references/r2-deck-template-vs-client-links.md` avant de répondre. Le lien canonique est `https://template-theta-plum.vercel.app/`. Ne pas confondre le deck slide-by-slide Bula avec un hub Maquette/Schémas/CDC, un deck DA VividFlow, ou un support Kalvi/Bouquet Suprême.

When Jonathan/Thomas veut optimiser le template R2 à partir de Bula, le lien client officiel à protéger est `https://bula-assurances.vercel.app/`. Ne pas utiliser `bula-assurances-r2-kappa.vercel.app` comme URL de référence client. Avant toute prod, clarifier si la demande est **production Vercel** ou **prompt pour Claude** : si Thomas/Jonathan veut “travailler avec Claude”, “juste un prompt”, ou corriger le contenu sans toucher à la prod, ne pas déployer. Restaurer/laisser l’ancienne base Bula, puis fournir un prompt texte qui demande à Claude de modifier uniquement la section ciblée dans le deck existant. Si Thomas/Jonathan demande explicitement de modifier le Vercel, partir de la page officielle existante, vérifier visuellement la home, puis modifier la base statique HTML/CSS sans recréer le site. Pattern validé à conserver : section diagnostic en **Avant / Après** seulement. Supprimer la troisième carte “Demain/Suite logique” et toute logique en 3 temps. La communication doit rester boomer/patron mais lisible à l’oral : phrases humaines, suite logique, pas une liste de mots-clés robotisée. Les titres doivent être courts et forts : parfois seulement `AVANT` / `APRÈS`; si la carte solution a besoin d’un titre, préférer une formulation validée type `L’IA installée` plutôt qu’un titre long ou mou. Pour la maquette/Data OS, chercher un wow effect dirigeant : montrer ce que l’entreprise ne voyait pas assez vite, les décisions préparées, les CHF/risques cachés, et le contrôle humain — pas juste un dashboard propre. Mais traiter la maquette comme un **dashboard de présentation**, pas un back-office complet : itération ciblée, overview read-only, 4 KPI max, objectifs en barres de progression, 3 blocs condensés, sidebar premium sans bruit, IA visible mais discrète, et preuve visuelle du Après. Pour les pages Schémas et CDC, garder une communication dirigeant/boomer : schémas lisibles en 10 secondes, `Mémoire métier` plutôt que jargon type source de vérité, CDC sérieux mais fluide (pas contrat, pas landing), sécurité/données/valeur d’entreprise visibles. Ne pas figer les calibrations tant que Jonathan n’a pas validé. Voir `references/bula-r2-optimization-pattern.md`, `references/bula-r2-homepage-two-card-pattern.md`, `references/r2-pitch-deck-communication-calibration.md`, `references/r2-presentation-dashboard-calibration.md`, `references/r2-schemas-communication-calibration.md`, `references/r2-cdc-and-schema-copy-calibration.md` et `references/r2-template-bula-final-pattern.md` pour le workflow exact, les liens canoniques, la copy validée, le prompt Claude Code, le rollback, la calibration communication/maquette/schémas/CDC et le pattern final deck R2 Bula → template à trous.

Principes :
- partir des douleurs que le prospect vient d’exprimer, pas d’un manifeste IA générique ;
- garder la force concrète de l’ancien deck VividFlow : réalité métier → contraste avant/après → process visible → exemples ;
- pour les cartes décisionnaires, utiliser le tempo **boomer/patron** validé : mots simples, concrets, global entreprise, assez précis pour identifier la situation, sans jargon ni grands paragraphes. Exemple canonique avant/après : “Trop d’infos dans les boîtes mail / Les infos importantes ressortent”, “Des clients suivis au cas par cas / Les clients sont mieux suivis”, “Une direction qui voit trop tard / La direction voit quoi traiter” ;
- récupérer de Kalvi uniquement la pédagogie utile : cycle SaaS→agentique, chaos des agents sans cockpit, mémoire/orchestration/validation, brief du matin ;
- positionner VividFlow comme système opérationnel premium installé pour le client, pas comme coaching “fabrique tes briques toi-même” ;
- finir sur l’audit comme suite logique : impossible d’installer un système opérateur IA sans cartographier stack, flux, décisions, données et validations.

Le R2 doit faire trois choses :

1. **Voir** — le client se projette dans une maquette simple.
2. **Croire** — il comprend le chemin de croissance avec des schémas.
3. **Signer** — il sait exactement ce qui est livré en phase 1.

Ne pas présenter “de la tech”. Présenter un système opérateur qui récupère du temps dirigeant, réduit les oublis, rend les décisions visibles et prépare le prochain palier business.

## Asset 1 — Maquette Data OS / cockpit

Créer une page ou maquette crème/premium qui montre le futur système comme si le client l’avait déjà.

Contenu recommandé :

- brief du jour ;
- actions prioritaires ;
- pipeline ou opportunités ;
- tâches bloquées / validations humaines ;
- outils connectés ;
- équipe / collaborateurs ;
- mémoire métier / décisions ;
- exemples de questions Telegram/vocal.

Règles :

- rester client-safe ;
- pas de jargon agentique inutile ;
- ne pas inventer de métriques précises si non vues en R1 ;
- utiliser des statuts, files, priorités, relances, validations — le produit doit sembler utilisable.

## Asset 2 — Schémas de pertinence

Créer deux schémas visuels :

### A. Escalier de croissance

Structure :

- **Situation A** : le client pilote trop à la main / infos dispersées / croissance bloquée.
- Briques 1–3 : ce qu’on installe maintenant.
- Briques 4–5 : suite logique, pas forcément incluse en phase 1.
- **Situation B** : le client pilote la croissance.

Exemple de briques phase 1 :

1. Bras droit IA
2. Outils connectés
3. Cockpit dirigeant

Règles fortes :

- Les briques phase 1 doivent être **entourées ensemble** avec une mention type “Ce qu’on vient mettre en place”.
- Ne pas afficher le prix sauf instruction explicite.
- La Situation B doit suivre la diagonale, sans chevaucher la dernière brique.
- Le schéma doit être lisible pour un dirigeant non-technique.

### B. Source de vérité IA

Structure :

- dirigeant en haut ;
- source de vérité IA au centre ;
- outils existants à gauche ;
- collaborateurs / rôles à droite ;
- copilotes IA / agents par fonction ;
- plateforme de suivi + interface Telegram/vocal ;
- flèches vers la source de vérité puis vers le cockpit.

Message à faire passer : on ne remplace pas tout, on ajoute une couche de pilotage.

## Asset 3 — CDC écrit phase 1

Créer un cahier des charges client-facing, pas un document technique interne.

Sections recommandées :

1. Contexte R1 — ce qu’on a compris.
2. Objectif phase 1.
3. Ce qu’on met en place.
4. Workflows prioritaires.
5. Outils / accès nécessaires.
6. Validation humaine et sécurité.
7. Hors-scope clair.
8. Critères de succès.
9. Prochaines étapes.

Règles :

- aucune promesse excessive ;
- pas de prix sauf demande explicite ;
- ne jamais demander de mots de passe dans le document ;
- parler de “votre agent IA” ou “système opérateur IA” plutôt que “Hermes” si le contexte client l’exige ;
- garder le CDC vendable : clair, borné, rassurant.

## Direction artistique standard

Utiliser la DA validée Client Delivery pour ces hubs :

- fond beige / crème papier ;
- cartes `#fffaf0` ou proche ;
- texte carbone `#17130f` ;
- accent orange `#ef6a3a` ;
- bleu profond `#1c4f73` pour flux/système ;
- typo `Instrument Serif` pour les grands titres ;
- `Inter` pour le texte ;
- `JetBrains Mono` pour labels/kickers.

Éviter : pastel générique, gradients SaaS, icônes partout, glassmorphism, dashboards fake avec métriques absurdes.

## VividFlow discovery AGaaS deck variant

When Jonathan is building or iterating a VividFlow discovery-call deck for AGaaS / IA opérationnelle, first determine whether he wants a **human-led strategy/storyboard session** or a **production/prototype sprint**.

If Jonathan says he wants to work “toi et moi ici”, says not to use Claude Code, or wants to force quality together, do **not** delegate or jump to code. Use `references/discovery-deck-human-led-process.md`: lock the deck’s sales role, mental transformation, narrative spine, reveal mechanics, and raw storyboard before any design/prototype.

If Jonathan asks for visual validation or production, do **not** stop at a Markdown storyboard. Jonathan validates visually: create and deploy a Vercel mini-deck/prototype early, then iterate from the URL.

Key rules:

- Keep responses short and dense; avoid long chat dumps unless explicitly requested. If Jonathan signals overload, reduce to one micro-decision at a time.
- The deck’s role is not just “educate”: it must help the prospect progressively measure the potential impact of the agentic AI opportunity in their own business.
- Do not force every slide to mention business impact or agentic AI directly. Early slides may only create identification or show the broader market/world evolution; each slide must simply move the prospect toward impact awareness.
- Keep discovery questions, company details, number of collaborators, tool inventory, case studies/proofs, and full commercial proposal outside the main deck unless Jonathan explicitly asks for a separate asset.
- Build a horizontal left-to-right visual deck.
- Use “less is more”: few words, strong punchlines, schémas carrying the explanation.
- Start with identification / big problem, not abstract AI education and not agentic AI too early.
- Use the narrative spine: Identification → évolution du monde → Éducation → Opportunité business → Audit.
- Strong pause slides are welcome: e.g. “ON S’ARRÊTE.”, “Automatiser le chaos accélère le chaos.”
- For visual/prototype details, use `references/vividflow-discovery-agaas-deck.md`.
- For human-led pre-production strategy/storyboard, use `references/discovery-deck-human-led-process.md`.
- For details, use `references/vividflow-discovery-agaas-deck.md` and `references/discovery-deck-anti-wizard-review.md`.

## Workflow opérationnel

1. **Lire le contexte R1**
   - transcript, notes, wiki/client, outputs existants.
   - extraire : douleurs, outils, équipe, opportunités, objections, vocabulaire client.

2. **Créer les 3 assets**
   - `maquette.html`
   - `schemas.html`
   - `cdc.html`

3. **Créer le hub**
   - `index.html` avec les 3 cartes : Maquette, Schémas, CDC.
   - inclure une phrase d’angle R2 : “On ne vend pas une app de plus…” adaptée au client.
   - ajouter `vercel.json` avec noindex.

4. **Déployer sur Vercel**
   - charger le skill `deploy-to-vercel`.
   - pour un document client partageable : `npx vercel deploy --prod --yes --public`.
   - livrer l’alias public vérifié, pas l’URL raw si protégée.

5. **Vérifier**
   - HTTP 200 sur `/`, `/maquette`, `/schemas`, `/cdc` ;
   - pas de Vercel auth ;
   - snippets attendus présents ;
   - `noindex` actif ;
   - screenshot local ou distant si possible.

## Structure de fichiers recommandée

```bash
/workspace/outputs/clients/<client-slug>/vercel-hub/
├── index.html
├── maquette.html
├── schemas.html
├── cdc.html
├── vercel.json
└── assets/
    ├── escalier-croissance.png
    └── source-verite.png
```

## Format de restitution à operator

Répondre court :

```text
C’est en ligne : <url>

Contenu :
- Maquette Data OS
- Escalier + source de vérité
- CDC phase 1

Vérifié : /, /maquette, /schemas, /cdc OK, noindex, pas de Vercel auth.
```

## Pitfalls

- Ne pas livrer seulement un CDC : le R2 doit d’abord faire voir et croire.
- Ne pas mettre le prix dans les schémas par défaut.
- Ne pas transformer le R2 en audit technique.
- Ne pas répondre avec un template texte si Jonathan demande le “template R2”, “le Vercel”, “à quoi ça ressemble”, ou veut travailler dessus avec Claude Code. Dans ce contexte, il veut d’abord les liens Vercel existants/canoniques pour inspection visuelle. Donner les URLs en premier, puis seulement ensuite proposer un prompt ou une structure.
- Quand Jonathan veut améliorer le visuel d’un R2 existant avec Claude/Claude Design, ne pas produire un prompt global “rends-le plus beau”. Respecter son workflow validé : donner le site R2 actuel + le lien exact du deck Vercel de DA VividFlow, travailler section par section, demander 3 vrais mockups visuels pour la première section, valider une direction, puis décliner. Si le lien DA exact n’est pas retrouvé, ne jamais substituer un ancien lien Netlify ou une référence voisine : dire qu’il manque et le retrouver/demander.
- Ne pas créer un nouveau lien si un hub/deck canonique existe déjà pour le même client : mettre à jour le projet existant et son alias.
- Ne jamais remplacer un deck client existant par une nouvelle page simplifiée. Pour Bula/R2 ou tout deck validé, partir de la base existante, modifier uniquement les slides/sections ciblées, puis redéployer sur le même projet. Si une mauvaise version a écrasé l’alias, rollback/promote immédiatement le dernier déploiement correct avant de continuer.
- Quand Jonathan demande “la présentation” d’un client/R2 existant, comprendre en priorité la version validée et déployée sur Vercel, pas un fichier local ou brouillon. Ordre de recherche : URL/projet Vercel canonique → dossier client/hub → emails/partages → fichiers locaux seulement en dernier recours. Si seul un PDF/HTML local est trouvé, le qualifier comme brouillon/local et continuer à chercher le lien Vercel si la demande porte sur une présentation validée.
- Quand Jonathan demande le **template R2 à trous**, répondre d’abord avec le lien canonique `https://template-theta-plum.vercel.app/`. Ne pas répondre avec un modèle texte, un deck DA VividFlow, un hub Bouquet/Kalvi, ou un autre client. Vérifier que le lien ressemble au deck Bula slide-by-slide. Si le lien exact n’est pas retrouvé, dire clairement “je ne l’ai pas retrouvé” et proposer de recréer le template neutre depuis la source Bula vérifiée (`/home/hermes/outputs/bula-r2-pitchdeck.html`) plutôt que d’envoyer un mauvais lien.
- For minor typo/name fixes on a live R2 link, do not send Jonathan back to Claude Code if the fix is trivial. First identify the live Vercel project/deployment with `npx vercel inspect <alias-url>`, locate the source if available, patch only the exact text/metadata, redeploy to the same alias, then verify the public URL. Keep scope tight: no visual/content refactor during a name correction.
- Ne pas affirmer que c’est public sans vérifier HTTP 200 + absence Vercel auth.
- Ne pas utiliser une DA différente : la cohérence visuelle fait partie de la confiance.
- Pour un deck découverte VividFlow, ne pas confondre “prototype interactif” avec “wizard/onboarding”. Si un rendu a les bons mots mais ressemble à une interface à cliquer, lire `references/discovery-deck-anti-wizard-review.md` et repartir directionnellement.
- Si Jonathan refuse Claude Code ou veut travailler ici, ne pas insister sur la délégation : lire `references/discovery-deck-human-led-process.md` et construire le storyboard avec lui.

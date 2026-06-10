---
name: client-cdc-brainstorming
description: "Créer un cahier des charges AIOS/Hermes pour un nouveau client AIOS à partir des sources client, en suivant le process validé Example Client : analyse sources, brainstorming section par section, validation utilisateur, rédaction finale, auto-review. Utiliser quand operator demande un CDC, cahier des charges, cadrage client, spec client, ou préparation d'implémentation AIOS/Hermes pour un nouveau client."
version: 1.0.0
author: AIOS / Hermes
metadata:
  hermes:
    tags: [cdc, client, aios, aios, hermes, brainstorming, delivery]
    category: clientops
    related_skills: [clientops-data-os, tldv-api, second-brain-ops, hermes-agent, claude-code]
---

# Client CDC Brainstorming — Process AIOS

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Ce skill capture le workflow validé pour créer un CDC client AIOS/Hermes. Il évite le piège classique : écrire une spec trop tôt, promettre une usine à gaz, ou changer les process du client sans nécessité.

## Déclencheurs

Utiliser quand l'utilisateur demande :
- créer un CDC client ;
- cadrer un projet AIOS/Hermes ;
- préparer l'installation d'un agent client ;
- analyser des sources client puis écrire le cahier des charges ;
- transformer un audit / Notion / tl;dv / deck / Lucidchart en spec client.

## Principe central

Ne jamais commencer par écrire le CDC complet.

Ordre obligatoire :
1. collecter et analyser les sources ;
2. vérifier/mettre à jour la fiche client Data OS si pertinent ;
3. brainstormer avec l'utilisateur section par section ;
4. obtenir validation explicite de chaque section ;
5. seulement ensuite rédiger la V1 complète ;
6. auto-review avant livraison.

## Règles de positionnement AIOS

- Hermes s'adapte aux process du client.
- No process change by default.
- Phase 1 = installer l'agent, la mémoire, les connexions prioritaires et les règles de validation.
- Ne pas vendre une refonte CRM / dashboard / automatisation totale sauf si explicitement demandé.
- Le Second Brain est obligatoire : cerveau métier, base de connaissance vivante, mémoire opérationnelle, inspiré du concept Second Brain popularisé par Andrej Karpathy.
- Le Context OS est inclus dans le Second Brain, pas présenté comme une brique séparée côté client.
- Hermes doit être présenté comme agent évolutif : le client l'éduque par l'usage, les corrections, les exemples et les méthodes.
- En support client-facing, ne pas sous-vendre Hermes comme un chatbot, un assistant ou un dashboard. Le présenter comme un **agent IA opérateur** capable d'actions réelles dans le business : lire le contexte, surveiller les outils, préparer les relances/contrôles/résumés/passages de relais, pousser les décisions sur Telegram, puis exécuter/coordonner après validation.
- Pour les projets delivery/interne, ancrer la valeur sur 3 KPI simples : (1) travailler le moins possible sur ordinateur et piloter le maximum depuis téléphone/Telegram, (2) optimiser le revenu par employé, (3) automatiser ou semi-automatiser au moins 80% des tâches répétitives identifiées.
- Les actions sensibles restent HITL : l'agent prépare, l'humain valide, Hermes exécute.

## Workflow détaillé

### 1. Charger les skills pertinents

Selon le contexte, charger :
- `clientops-data-os` pour vérifier la fiche client et la source de vérité ;
- `tldv-api` si des transcriptions sont impliquées ;
- `hermes-agent` si le CDC parle d'installation/configuration Hermes ;
- `second-brain-ops` si le Second Brain doit être créé/ingéré ;
- `claude-code` si une étape lourde doit être déléguée à Claude Code ;
- le skill Superpowers `brainstorming` si l'utilisateur demande explicitement ce mode ou si le cadrage est encore flou.

### 2. Collecter les sources

Sources typiques :
- Notion client ;
- audit Genspark / docs ;
- tl;dv / Fathom / transcript d'appel ;
- Lucidchart / schéma cible ;
- questionnaire onboarding ;
- documents commerciaux ;
- Data OS existant ;
- captures / notes Telegram.

Pour un lien public Fathom, extraire la transcription via le JSON embarqué `data-page` et `copyTranscriptUrl` avant l'analyse. Voir `references/fathom-share-transcript-extraction.md`.

Créer un dossier client propre :
`/workspace/outputs/clients/{slug}/`

Stocker les analyses et fichiers générés dedans. Ne jamais exposer de secrets dans les outputs.

### 3. Analyser avant de cadrer

Extraire :
- activité du client ;
- offres ;
- équipe ;
- outils ;
- sources de leads ;
- douleurs opérationnelles ;
- dépendance au fondateur ;
- process actuels ;
- signaux business ;
- contraintes techniques ;
- risques de périmètre ;
- quick wins ;
- connexions prioritaires ;
- actions sensibles nécessitant validation.

Si le périmètre est trop large, le dire clairement. Un CDC qui promet tout est une bombe à retardement.

### 4. Brainstormer section par section

Ne pas imposer un plan complet d'un coup. Proposer une section, demander validation, puis continuer.

Structure recommandée :
1. Positionnement du projet
2. Second Brain client
3. Fonctionnement natif Hermes Agent
4. Placement stratégique dans le process existant
5. Connexions outils prioritaires
6. Périmètre MVP phase 1
7. Sécurité, permissions et validation humaine
8. Rôle du client dans l'évolution de Hermes
9. Hors périmètre phase 1
10. Plan de livraison
11. Critères de succès

Adapter les titres selon le client, mais garder cette logique.

### 5. Questions de cadrage à poser

Poser une question à la fois quand l'arbitrage change le CDC :
- Quel est l'objectif prioritaire : agent personnel, automatisation cash, support, delivery, formation, reporting ?
- Où placer Hermes dans un geste manuel déjà existant ?
- Quels outils sont prioritaires en phase 1 ?
- Quelles actions doivent rester sous validation ?
- Que ne doit-on surtout pas changer dans les process actuels ?
- Quelle première expérience doit faire dire au client “ok, ça sert vraiment” ?

Avoir une opinion forte et recommander une option, mais laisser l'utilisateur valider.

### 6. Rédiger la V1 complète uniquement après validation

Une fois les sections validées, écrire un fichier markdown :
`/workspace/outputs/clients/{slug}/cdc-{slug}.md`

Le CDC doit être :
- lisible par le client ;
- précis pour l'équipe technique ;
- borné ;
- vendable ;
- sans jargon inutile ;
- sans promesse dangereuse ;
- compatible avec une implémentation réelle.

### 7. Auto-review obligatoire

Vérifier :
- toutes les sections validées sont présentes ;
- aucune clé/API/secret/token n'est exposé ;
- le principe “Hermes s'adapte aux process” est clair ;
- le Second Brain est obligatoire et bien expliqué ;
- les connexions prioritaires sont bornées ;
- les actions sensibles sont HITL ;
- le hors-scope protège le projet ;
- les critères de succès sont observables ;
- aucune refonte/process change n'est imposé par défaut.

### 8. Suite naturelle après CDC

Après validation du CDC, proposer :
- deck client via le skill Claude Code `/deck` ;
- plan d'implémentation technique AIOS ;
- bootstrap agent client ;
- création/mise à jour Data OS ;
- ingestion dans Second Brain.

Pour le handoff CDC → deck → Data OS, voir `references/example-immo-cdc-deck-handoff.md` : prompt Claude Code `/deck`, chemins de template fiables, vérification screenshot/HTTP 200, fix bande blanche, lookup Data OS via `clients:*` (pas `macroView`), pattern d'attachement dans la fiche client, et règle de réutilisation sanitized des skills RealAdvisor Example Client vers Example Client.

Pour transformer un CDC/deck technique en support de vente simple avec hub + maquette Data OS client, voir `references/client-sales-hub-data-os-mockup.md` : structure 3 cartes, Data OS comme cockpit propriétaire du client, performance des agents, task-board, org chart IA, chat agents, wording client, checklist déploiement/vérification visuelle.

Si l'utilisateur dit que le deck/hub/Data OS doit ressembler à **Example Client**, ne pas refaire un design SaaS générique : reprendre le pattern `deck-simple` Example Client (warm cream, 3 cartes, promesse simple, cockpit client lisible), exporter/vision-checker, redéployer, puis remplacer les docs client-facing dans Data OS. Voir `references/example-immo-style-client-hub.md`.

Pour préparer un deck R2 AIOS, utiliser la structure validée par operator : aucune mention de prix dans le deck public. La narration doit couvrir (1) économie des agents IA et mini-usine à solutions, (2) AIOS comme partenaire de croissance — pas agence dev, agence marketing, SaaS uniforme ni intégrateur no-code isolé, (3) thèse de croissance Situation A → levier → Situation B, (4) démo Data OS immersive comme vraie plateforme client. Les prix, modalités de paiement et chiffrages détaillés se traitent à l'oral et dans le CDC uniquement. Voir/mettre à jour `references/r2-sales-deck-value-anchoring.md`.

Pour les clients dont le sujet principal est de **scaler une delivery interne qui fonctionne déjà**, ne pas vendre une refonte ou un agent client final en phase 1. Cadrer Hermes comme couche IA au-dessus du process existant : onboarding/CSM, QA outils métier, coordination équipe, monitoring opérationnel, daily brief. En support client-facing, rester strictement sur la **phase 1 validée** : ne pas mentionner phase 1.5, phase 2 ou évolutions futures sauf demande explicite. Voir `references/delivery-scale-cdc-mathieu-yandoko.md` pour le pattern issu du call Mathieu Yandoko.

Pour préparer vite un **call d’audit nouveau client** à partir d’un nom de société/domaine, faire une recherche web publique structurée avant toute recommandation : site officiel, annuaires, LinkedIn/social snippets, pages offres/prix, presse, puis inspection stack web. Si WooCommerce est détecté, interroger l’API publique Store (`/wp-json/wc/store/products`) pour cartographier produits, prix, catégories, ruptures et funnels naturels. Sauver la note dans `/workspace/outputs/clients/{slug}/audit-prep-YYYY-MM-DD.md`, puis répondre avec un brief call-ready. Voir `references/public-client-audit-prep.md`.

Pour les clients premium retail/expérience qui veulent scaler des ateliers, événements, team buildings ou partenariats B2B, ne pas vendre un chatbot ni une simple automatisation email. Cadrer le projet comme couche opérationnelle permettant au fondateur de sortir de la coordination quotidienne et de scaler une expérience à forte marge : cockpit fondateur, opérations boutique/atelier, pipeline B2B/event, marges/achats, CRM discret, SOP de duplication. Voir `references/retail-experience-event-aios-cdc.md`.

Si l'utilisateur signale que le deck/CDC ne fait pas ressentir la puissance d'Hermes, appliquer le repositionnement “action-agent” : Hermes n'est pas un chatbot, c'est un opérateur IA qui fait avancer les actions business avec validation humaine. Ajouter tôt dans le deck/CDC les 3 KPI : téléphone/Telegram-first, revenu par employé, 80% des tâches répétitives. Voir `references/hermes-action-agent-value-positioning.md`.

## Format court depuis transcript R1 collé

Quand Jonathan fournit directement un transcript R1 brut et demande un **cahier des charges court** ou “style court”, ne pas repartir dans un brainstorming long ni demander une validation section par section si la matière est suffisante.

Process recommandé :
1. annoncer brièvement l’intention avant traitement si l’analyse risque de durer ;
2. extraire uniquement les signaux utiles : activité, priorité business, douleurs, périmètre Phase 1, hors-scope, critères de succès, questions R2 ;
3. produire une version courte, lisible R2, sans jargon IA ;
4. protéger le scope : ne pas promettre l’automatisation des zones sensibles si le client a exprimé une réserve ;
5. si Jonathan demande “en fichier .md”, créer immédiatement le fichier et le livrer en `MEDIA:/absolute/path`.

Structure courte conseillée :
- Contexte
- Problème principal
- Priorité business
- Ce qu’il faut construire
- Périmètre Phase 1
- Hors périmètre Phase 1
- Règles importantes / validation humaine
- MVP recommandé
- Critères de succès
- Questions à valider en R2
- Positionnement commercial R2
- Verdict

Voir aussi `references/short-r1-cdc-from-transcript.md` pour un exemple basé sur un R1 immobilier/gérance.

## Pitfalls

- Écrire le CDC directement sans brainstorming : mauvais quand le cadrage est flou ; acceptable quand Jonathan fournit déjà le transcript R1 et demande explicitement une version courte exploitable.
- Vendre “tout automatiser” : dangereux et fragile.
- Présenter Data OS comme nouveau CRM imposé : à éviter sauf besoin explicite.
- Sous-vendre Hermes en “assistant IA” ou “dashboard intelligent” : trop faible. Pour un support commercial, montrer qu'il prépare et coordonne des actions réelles, avec validation humaine.
- Oublier les KPI client-facing : téléphone/Telegram-first, revenu par employé, 80% des tâches répétitives. Sans eux, le client voit une spec, pas un levier de croissance.
- Inventer un pipeline GHL : interdit sans audit et validation.
- Séparer Context OS du Second Brain côté client : confusion inutile.
- Oublier HITL : risque opérationnel et réputationnel.
- Faire 100 pages wiki vides : mieux vaut peu de pages riches et utiles.

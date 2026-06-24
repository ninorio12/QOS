---
name: create-operations
description: Méthode pour créer un Système, un Process, ou un SOP dans le AIOS Data OS. Utiliser quand l'utilisateur demande "crée-moi un système/process/SOP", "mappe-moi le système X", "documente le process Y", ou "rédige un SOP pour Z". Applique le framework Value Engine (Michalowicz) pour les systèmes et le template Purpose/Inputs/Checklist/Outputs/FAQ pour les SOPs.
version: 1.0.0
author: AIOS
metadata:
  hermes:
    tags: [operations, value-engine, sop, process, system-map]
    category: productivity
    config:
      - key: dataos.base_url
        description: Base URL du AIOS Data OS
        default: "<url>>"
        prompt: "URL du dashboard AIOS"
      - key: dataos.hermes_api_key
        description: Clé API Hermes pour le dashboard
        prompt: "HERMES_API_KEY"
---

# create-operations

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Tu aides à créer des **Systèmes**, **Process** ou **SOPs** dans le AIOS Data OS en suivant une méthode stricte. Ton rôle : poser les bonnes questions, structurer, puis persister via l'API Hermes.

## Hiérarchie opérationnelle (toujours respecter)

```
Projet → Système → Process → Étape → SOP
```

- **Projet** : AIOS, Cohorte, Incubateur, Transversal
- **Système** : Acquisition, Delivery, Operations, Support (macro-fonction business)
- **Process** : flux concret (ex: "Sales Pipeline", "Installation AIOS")
- **Étape** : unité du process (ex: "R1 Audit", "Build VPS")
- **SOP** : procédure détaillée pour exécuter une étape

## Règle de routing — déterministe, pas d'interprétation

**Étape 1 : écoute les mots-clés dans la demande utilisateur.**

| Si l'utilisateur dit exactement... | Tu crées un... | Endpoint |
|---|---|---|
| "système", "system", "system map", "mapping du système" | **System Map** | `POST /api/agent/system-map` |
| "process", "processus", "flux", "pipeline" | **Process** | `POST /api/agent/process` |
| "SOP", "procédure", "checklist", "standard operating procedure" | **SOP** | UI Data OS ou Convex direct |

**Exemples explicites** :
- "crée-moi le **système** d'acquisition pour AIOS" → **System Map** (mot-clé: système)
- "mappe le **système** de delivery" → **System Map** (mot-clé: système + mappe)
- "crée le **process** Sales Pipeline" → **Process** (mot-clé: process)
- "rédige un **SOP** pour le debrief R1" → **SOP** (mot-clé: SOP)

**Étape 2 : si ambigu, demande AVANT de faire quoi que ce soit.**

> "Tu veux un System Map (vue macro du système entier avec start/end/décisions) ou un Process (flux détaillé d'une seule activité) ?"

**Étape 3 : ne confonds JAMAIS les deux.**

- **System Map** = UN par paire (projet, système) typiquement. Couvre TOUT un système (ex: toute l'acquisition de A à Z).
- **Process** = UN flux métier nommé qui VIT DEDANS un système (ex: "Sales Pipeline" est UN process du système Acquisition).

Si l'utilisateur dit "système d'acquisition", c'est le **System Map** de tout l'Acquisition, PAS un process dans Acquisition.

En cas de doute, demander à l'utilisateur avant d'appeler une API.

---

## Créer un SYSTÈME (System Map — méthode Value Engine)

Un système se représente par une **carte visuelle** avec 5 formes standards. C'est la méthode de Mike Michalowicz (Clockwork) — respecter les 5 étapes.

### Les 5 formes standards

| Forme | Usage |
|-------|-------|
| **Pill vert** (`start`) | Évènement déclencheur (1 seul par map) |
| **Pill rouge** (`end`) | Évènement de fin (1 ou plusieurs) |
| **Rectangle** (`process`) | Tâche / activité / process (peut pointer vers un process détaillé via `processId`) |
| **Diamond** (`decision`) | Point de décision (Yes/No) — handles `yes`, `no`, `right` |
| **Parallélogramme** (`data`) | Donnée importée/exportée (ex: questionnaire, formulaire) |

### Les 5 étapes (suivre dans l'ordre)

#### Étape 1 — Identifier le système à mapper

Poser la question à l'utilisateur :
- Quel **projet** ? (AIOS / Cohorte / Incubateur / Transversal)
- Quel **système** ? (Acquisition / Delivery / Operations / Support)
- Nom optionnel de la map si plusieurs flux existent dans ce système (ex: "Delivery AIOS", "Delivery Audit")

Rappel : si différents produits/flux, **préférer un diamond de décision dans une seule map** plutôt que plusieurs maps séparées.

#### Étape 2 — Définir le Déclencheur (Start) et la Fin (End)

Demander :
- **Déclencheur** : qu'est-ce qui lance ce système ? (ex: "Lead Facebook Ads", "CDC signé", "Ticket support reçu")
- **Fin(s)** : quelle(s) action(s) conclu(ent) le système ? (ex: "Client signé", "Agent COO live", "Ticket résolu")

Typiquement :
- Acquisition → Start: lead/prospect ; End: closing/achat
- Delivery → Start: achat complété ; End: livrabilité + relance satisfaction
- Operations → Start: déclencheur interne (cron, action team) ; End: résultat interne
- Support → Start: demande client ; End: résolution

L'**End** est souvent plus dur à définir que le Start. Ne pas hésiter à re-challenger.

#### Étape 3 — Brainstormer les activités de VALEUR entre Start et End

**⚠️ La System Map est une Value Engine (Michalowicz), PAS un flowchart linéaire.**

Demander : **"Et après ?"** après chaque étape jusqu'à arriver au End. Le système se mappe quasi tout seul.

Si la réponse est **"Ça dépend"** → c'est un **point de décision** (Diamond). Créer les 2+ branches.

Entre deux activités, si une **donnée** est échangée (formulaire, export, rapport) → créer un **parallélogramme** pour la représenter.

**Chaque rectangle (process) doit représenter une activité qui CRÉE DE LA VALEUR**, pas juste une étape opérationnelle. Exemple :
- ❌ "Envoyer email", "Faire appel", "Configurer VPS" (étapes techniques)
- ✅ "ONBOARD — Cadrer & comprendre", "BUILD — Installer & livrer", "ACTIVATE — Former & rendre autonome" (activités de valeur)

#### Étape 4 — Revue avec contributeurs

Si l'utilisateur est l'opérateur, poser :
> "Que fais-tu actuellement qui n'est pas représenté ? Qu'est-ce qu'on a oublié ?"

Ne **pas** descendre trop bas — les sous-étapes seront couvertes par les SOPs liés aux étapes.

#### Étape 5 — Publier la map

Créer la map dans le Data OS via l'API :

```
POST /api/agent/system-map
Body: { "project": "AIOS", "system": "Delivery", "name": "Delivery AIOS", "description": "..." }
→ { "id": "<mapId>" }
```

Puis sauvegarder le graphe :

```
PUT /api/agent/system-map/<mapId>
Body: {
  "nodes": [
    { "id": "n1", "type": "start", "title": "CDC signé", "position": {"x": 40, "y": 200} },
    { "id": "n2", "type": "process", "title": "Installation AIOS", "position": {"x": 300, "y": 200}, "processId": "<optional>" },
    { "id": "n3", "type": "decision", "title": "Tests OK ?", "position": {"x": 560, "y": 200} },
    { "id": "n4", "type": "end", "title": "Agent live", "position": {"x": 820, "y": 200} }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2" },
    { "id": "e2", "source": "n2", "target": "n3" },
    { "id": "e3", "source": "n3", "target": "n4", "sourceHandle": "yes", "label": "Oui" }
  ]
}
```

### Règles de positionnement (propreté visuelle)

- **Tous les nodes mesurent 200×80** — ne pas tenter de les redimensionner
- **Snap à la grille 10px** : positions en multiples de 10 (`x: 40`, `x: 300`, `x: 560`...)
- **Espacement horizontal** : 260px entre centres (soit `x + 260` pour le suivant)
- **Même ligne Y** quand c'est un flux linéaire (ex: `y: 200` pour toute la rangée)
- **Branche de décision** : descendre de 160px pour les embranchements (`y: 360` pour la branche du bas)
- **Handles du diamond** : `"sourceHandle": "yes"` (haut/droite = positif) ou `"no"` (bas = négatif)

---

## Créer un PROCESS détaillé

Un process représente **un flux métier concret** avec ses étapes numérotées. Chaque étape peut être liée à des SOPs.

### Définition stricte d'un process

Un **process** n'est pas une tâche, une feature, une responsabilité, une capacité ou un département. C'est un flux répétable qui transforme un **input clair** en **output mesurable**, avec déclencheur, owner, étapes ordonnées, règles d'exception et fin observable.

Test rapide avant de nommer un bloc "process" :
- Quel événement le déclenche ?
- Quel input entre dans le flux ?
- Quelle transformation se produit ?
- Quel output prouve que le process est terminé ?
- Qui en est owner ?
- Quel SLA / métrique de succès permet de le piloter ?

Exemples :
- ❌ "Création contenus", "Build setup", "Monitoring usage", "Mémoire Data OS" = tâches/capacités.
- ✅ "Lead Capture & Attribution", "Setter Qualification", "Post-Signature Intake", "QA & Acceptance" = process si input/output/owner sont définis.

### Pitfall — Breakdown départemental AIOS / AI Profit Map

Quand operator demande les process par département pour une AI Profit Map, ne découpe pas par outil ni par surface UI. Découpe par transformation business. **Onboarding et délivrabilité vont ensemble dans un seul département Delivery** : onboarding, audit, build et support ne sont pas des départements séparés, ce sont des phases/process du Delivery.

Structure Delivery validée :
1. **AI Audit** — Onboarding → Department Breakdown → Human Org Chart → Role Breakdown → Time Audit → Full ROI Audit → Bottleneck / Money Leak Map.
2. **Agent Org & Priorisation** — AI Profit Map → Agent Org Chart → Agent Scoring Ease/Impact/Effectiveness → CDC & rapport de priorisation → sélection des 3–5 premiers agents.
3. **Build des agents** — R&R Docs par agent → Knowledge Base → Pillared Buildout Plan → QA/Testing/Human Layer → Permission/Access Control → Escalation Logic → Delivery commerciale finale.
4. **Internal Capability & Ongoing Support** — placer/former/manager quelqu'un en interne OU rester en fractional team → support mensuel → identification continue des process à automatiser → build continu → business consulting.

Pour une slide ou une carte AI Profit Map, les départements de base deviennent généralement : **Marketing, Sales, Delivery**. Ne recrée pas un département "Onboarding" ou "Suivi/Coaching" sans validation explicite.

### Étape 1 — Identifier le process

- **Projet** + **Système** parents
- **Nom** du process (ex: "Sales Pipeline", "Onboarding Client")
- **Description** courte

### Étape 2 — Créer dans le Data OS

```
POST /api/agent/process
Body: { "project": "AIOS", "system": "Acquisition", "name": "Sales Pipeline", "description": "..." }
→ { "id": "<processId>" }
```

### Étape 3 — Lister les étapes

Demander à l'utilisateur de lister les étapes dans l'ordre chronologique. Chaque étape = 3-10 mots (titre) + 1 phrase de description.

### Étape 4 — Sauvegarder le graphe

```
PUT /api/agent/process/<processId>
Body: {
  "steps": [
    { "id": "s1", "title": "EOD Setter", "description": "...", "position": {"x": 40, "y": 200}, "sopIds": [] },
    { "id": "s2", "title": "R1 Audit", "description": "...", "position": {"x": 300, "y": 200}, "sopIds": [] }
  ],
  "edges": [
    { "id": "e1", "source": "s1", "target": "s2" }
  ]
}
```

### Étape 5 — Lier les SOPs

Pour chaque étape, demander quel(s) SOP(s) s'y applique(nt). Mettre à jour `sopIds` avec les IDs récupérés via `GET /api/agent/openapi.json` (ou créer un SOP manquant avec la section suivante).

---

## Créer un SOP

### VividFlow/Data OS — SOP + fiches R&R agents

Quand Jonathan demande de “créer la fiche pour chacun”, “respecter les SOPs du Data OS à la lettre” ou de cadrer une première tâche multi-agents, ne te limite pas à un résumé conversationnel :

1. Crée la SOP centrale au format Data OS structuré : Purpose, Inputs, Outputs, Checklist, FAQ, responsable, exécutants, statuts.
2. Crée une fiche R&R par agent impliqué : objectif court, responsabilité centrale, actions autorisées, interdictions, sources, handoff et critères de réussite.
3. Respecte la séparation des rôles : l’agent qui collecte ne valide pas, l’agent qui importe n’envoie pas, l’agent qui envoie ne crée pas le template stratégique.
4. Si l’API/MCP Data OS refuse l’écriture faute de token, ne prétends pas avoir poussé dans Data OS. Écris une version locale dans le workspace Data OS (`docs/sops/`, `docs/agents/`) puis signale clairement le blocage token et l’action restante.
5. Une fois le token/API disponible, pousse la SOP dans le module Process/SOP avec les champs structurés, pas en collant un long markdown dans `content`.

Référence détaillée : voir `references/vividflow-outbound-first-task-sop-fiches.md`.

### RÈGLE CRITIQUE — Pas d'usine à gaz

**Ne créer des SOP QUE pour les actions vitales**, pas pour chaque étape. Un SOP c'est utile quand :
- L'étape est complexe avec beaucoup de choses à retenir (ex: audit 2h)
- L'erreur coûte cher (bloque le build, perte de crédibilité)
- La procédure doit être reproductible par quelqu'un d'autre

Les étapes simples (appels de cadrage, GO/NO-GO, tests) n'ont PAS besoin de SOP.

### Format Data OS (OBLIGATOIRE)

Quand on crée un SOP via `POST /api/agent/sop`, utiliser les champs structurés, **JAMAIS mettre le SKILL.md entier dans `content`**.

Champs obligatoires :
- `title` : "SOP #N — Titre" (numéro séquentiel par système)
- `category` : "Sales" | "Onboarding" | "Delivery" | "Marketing" | "Opérations" | "Autre"
- `responsable` : "Nom (Rôle)" — ex: "operator (CTO)", "Opérateur AIOS"
- `executants` : ["Rôle"] — ex: ["Integrateur AIOS"]
- `purpose` : **one-liner** — ce que le SOP accomplit
- `whenFollowed` : conséquence positive
- `whenNotFollowed` : conséquence négative

Champs structurés :
- `inputs[]` : array de strings — ce qu'il faut AVANT de commencer
- `outputs[]` : array de strings — ce qu'on obtient APRÈS
- `checklist[]` : array de `{title, description}` — **max 8 items**
  - Description commence par **"Manuel —"** (action humaine) ou **"Skill /name"** (action automatisée)
  - Ex: `{"title": "Installer dépendances", "description": "Manuel — SSH sur le VPS, apt install git curl node python3"}`
- `faq[]` : array de `{question, answer}` — 2-4 items typiques

Champ `content` :
- **COURT** (< 1000 chars) — markdown avec Objectif / Pré-requis / Résultat attendu / Étapes / Note / FAQ
- C'est un résumé rapide, pas la procédure complète (qui est dans checklist)

Autres champs :
- `process`, `processName`, `processId` : lier au process parent
- `processStep` : nom de l'étape liée
- `processStepOrder` : numéro d'ordre
- `skills[]` : noms des skills Hermes liés
- `status` : "actif" par défaut si la procédure tourne

### Créer via l'API Data OS

```
POST /api/agent/sop
Body: {
  "title": "SOP #6 — Appel d'audit technique",
  "category": "Delivery",
  "content": "Court résumé markdown...",
  "responsable": "Opérateur AIOS",
  "executants": ["Opérateur AIOS"],
  "purpose": "Récupérer tout pour le build",
  "whenFollowed": "Audit complet, prêt à rédiger le CDC",
  "whenNotFollowed": "Build bloqué, credentials manquants",
  "inputs": ["Questionnaire rempli", "Notes kickoff"],
  "outputs": ["Audit complet", "Credentials listés"],
  "checklist": [
    {"title": "Vérifier le questionnaire", "description": "Manuel — Relire les réponses, champs vides = questions prioritaires"}
  ],
  "faq": [
    {"question": "L'appel dépasse 2h ?", "answer": "Continuer si le client est engagé."}
  ]
}
```

### Règles fortes

- **Max 8 étapes** dans la checklist. Si plus, le SOP est trop gros — le splitter.
- **Niveau CE2 en compréhension** — chaque étape exécutable par un nouveau venu
- **Chaque étape a un "résultat mini"** observable, pas une instruction floue
- **Toujours un responsable et un exécutant** — jamais "personne n'est responsable"
- **Statut par défaut** : `actif` si on documente quelque chose qui tourne, `a_faire` si on note un SOP à écrire plus tard

### Règle 90 jours

Tout SOP doit être revu par son responsable tous les 90 jours. Si un SOP a plus de 90 jours sans revue :
- Badge "À reviewer" apparaît automatiquement dans le Data OS
- L'exécutant doit demander au responsable de confirmer ou mettre à jour
  "processStepId": "s3",
  "processStep": "Appel d'audit (~2h)",
  "responsable": "Opérateur AIOS",
  "executants": ["Opérateur AIOS"],
  "status": "actif",
  "purpose": "...",
  "whenFollowed": "...",
  "whenNotFollowed": "...",
  "inputs": ["questionnaire rempli", "document ouvert"],
  "outputs": ["audit complet", "credentials listés"],
  "skills": ["sop-appel-audit"]
}
→ { "id": "<sopId>" }
```

Champs requis : `title`, `category`, `content`. Tous les autres sont optionnels.

Pour lier le SOP à une étape du process : utiliser `PUT /api/agent/process/{id}` pour mettre à jour `sopIds` sur l'étape correspondante.

**Pattern recommandé** : créer le SOP comme Hermes skill (pour que l'agent le charge), puis le pousser dans Data OS via l'API pour qu'il apparaisse dans le dashboard.

### Règle 90 jours

Tout SOP doit être revu par son responsable tous les 90 jours. Si un SOP a plus de 90 jours sans revue :
- Badge "À reviewer" apparaît automatiquement dans le Data OS
- L'exécutant doit demander au responsable de confirmer ou mettre à jour

### Post-update governance — propager le changement aux agents

**Ne jamais considérer une mise à jour de SOP comme terminée tant que les agents ne l'ont pas reçue.** Un SOP à jour dans Data OS que les agents suivent encore dans l'ancienne version crée du désordre et des erreurs.

Après chaque mise à jour significative d'un SOP dans Data OS :

1. **Identifier le périmètre touché** — Quelles colonnes/champs ont changé ? Quels agents sont concernés ? Quel canal Slack ?
2. **Communiquer dans le fil Slack du canal agent** — Une phrase de changement, l'impact concret par agent, et la référence au SOP mis à jour. Mentionner les agents avec `<@U...>` si une action leur est demandée.
3. **Mettre à jour le message de lancement quotidien** — Le prochain message de lancement (ou le prochain ordre dans le fil actif) doit refléter la nouvelle logique.
4. **Vérifier l'alignement Sheet → SOP** — Les colonnes du Sheet doivent correspondre EXACTEMENT aux colonnes décrites dans le SOP.
5. **Vérification différée (J+1)** — Au prochain cycle, vérifier que les agents appliquent la nouvelle logique. Si un agent utilise encore l'ancienne colonne, le reprendre dans le fil.

---

## Endpoints de référence (API Hermes)

Base URL : `<url>>`
Auth : `Authorization: Bearer $HERMES_API_KEY`

| Méthode | Endpoint | Usage |
|---------|----------|-------|
| GET | `/api/agent/process` | Lister les process (filtres `?project=` `?system=`) |
| POST | `/api/agent/process` | Créer un process |
| GET | `/api/agent/process/{id}` | Fetch avec steps + edges |
| PATCH | `/api/agent/process/{id}` | Update metadata |
| PUT | `/api/agent/process/{id}` | Remplacer le graphe complet |
| DELETE | `/api/agent/process/{id}` | Supprimer |
| GET | `/api/agent/system-map` | Lister les maps (filtres `?project=` `?system=`) |
| POST | `/api/agent/system-map` | Créer une map |
| GET | `/api/agent/system-map/{id}` | Fetch avec nodes + edges |
| PATCH | `/api/agent/system-map/{id}` | Update name/description |
| PUT | `/api/agent/system-map/{id}` | Remplacer le graphe complet |
| DELETE | `/api/agent/system-map/{id}` | Supprimer |
| GET | `/api/agent/sop` | Lister les SOPs (filtres `?project=` `?system=` `?status=`) |
| POST | `/api/agent/sop` | Créer un SOP (champs requis: `title`, `category`, `content`) |
| GET | `/api/agent/sop/{id}` | Fetch un SOP |
| PATCH | `/api/agent/sop/{id}` | Update n'importe quel champ |
| DELETE | `/api/agent/sop/{id}` | Supprimer |

Spec complète : `GET /api/agent/openapi.json` (v1.4.0+).

---

## Règles de comportement

1. **Pose les questions dans l'ordre du framework** — ne saute pas l'étape "Déclencheur/Fin" avant d'écrire les étapes
2. **Respecte strictement la hiérarchie** — ne mélange pas Système et Process
3. **Ne crée jamais un SOP sans responsable** — demande-le si ce n'est pas fourni
4. **HITL obligatoire** : montre ce que tu vas créer, demande validation avant `POST`/`PUT`
5. **Après création** : donne l'URL directe dans le Data OS pour que l'utilisateur vérifie visuellement
6. **Multi-maps vs décisions** : toujours suggérer **un diamond de décision** avant de proposer une 2e map

### ⚠️ Règle critique — Éditer du contenu EXISTANT vs créer du neuf

Quand l'utilisateur demande une modification sur un process/SOP qui EXISTE DÉJÀ dans le Data OS :

- **Ne remplace JAMAIS tout le contenu (`blocks[0].text`) d'un processus existant.** L'utilisateur a son propre style, format et police — écraser le bloc entier détruit son travail.
- **Fais une modification chirurgicale** : change UNE phrase ou UN statut, pas le document entier.
- **Si tu dois modifier le texte du bloc HTML, vérifie d'abord quelle est la version actuelle** (via `GET` ou `mcp_data_os_processes_list`) et modifie seulement la ligne cible.
- **Quand le doute plane** : demande avant d'écrire. "Je change juste le owner de l'étape 4 de CSM/Operations vers CSM, ok ?"
- **Ne confonds pas "éditer un process qui tourne" avec "créer un SOP vierge"**. Un process que l'utilisateur a lui-même rempli dans l'éditeur Data OS a sa mise en page et son style — c'est son contenu, pas un template à remplacer.

## Exemple de déclenchement

**User** : "Crée-moi le système d'acquisition pour AIOS"

**Réponse attendue** :
1. Confirmer : "Ok, System Map pour AIOS > Acquisition. Nom de la map ?"
2. Demander Déclencheur : "Qu'est-ce qui lance le système ? (ex: lead Facebook Ads)"
3. Demander Fin : "Quelle(s) action(s) conclut le système ? (ex: CDC signé)"
4. Demander les étapes entre les deux avec "Et après ?"
5. Détecter décisions (quand la réponse = "Ça dépend")
6. Récapituler, demander validation
7. `POST /api/agent/system-map` puis `PUT /api/agent/system-map/{id}` avec nodes + edges
8. Répondre : "Map créée : <url>>/operations — tab Processus → click sur Acquisition AIOS"

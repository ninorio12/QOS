---
name: client-implementation
description: "Bootstrap complet d’un client Client Delivery dans son container Hermes. À utiliser quand on a un client_slug + accès VPS/container et qu’il faut créer l’AIOS client complet: Second Brain /root/*, sources initiales, SOUL.md/AGENT.md, skills universels/niche/externe, crons capture/ingest/lint/health activés dans le Hermes client, intégrations si credentials présents, rapports interne + client-facing, avec agent-to-agent et vérification déterministe."
version: 1.0.0
author: Hermes / AIOS
metadata:
  hermes:
    tags: [clientops, aios, client-bootstrap, aios, second-brain, hermes, vps, skills, crons]
    related_skills: [client-vps-access, hermes-agent, second-brain-ops, clientops-data-os, skill-creator]
---

# Client Implementation

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Tu transformes un VPS/container Hermes client en **AIOS opérationnel complet**.

Ce skill n’est PAS un simple générateur de dossiers. Il orchestre une implémentation client complète, relançable sans casser, en combinant:
- bootstrap déterministe,
- agent-to-agent avec le Hermes du client,
- mining/adaptation de skills existants,
- ingestion initiale depuis toutes les sources disponibles,
- crons activés dans le Hermes client,
- vérification stricte,
- calibration comportementale par blocs d'entraînement adaptés au contexte client.

## Déclencheurs

Utilise ce skill quand operator/operator dit par exemple:
- “implémente ce nouveau client”
- “bootstrap son VPS”
- “structure son Hermes”
- “mets en place son Second Brain”
- “on a les accès VPS du client”
- “récupère les patterns AIOS/Example Client pour ce client”
- “installe les crons capture/ingest/lint”
- “importe les bons skills pour ce client”
- “entraîne/calibre son Hermes avec des blocs adaptés au client”
- “son Hermes répond trop générique”

## Inputs obligatoires

1. `client_slug` — ex: `mathieu-yandoko`, `example-client`, `example-immo`.
2. Accès cible:
   - alias SSH, ou commande SSH,
   - nom du container Hermes.
3. Sources de contexte disponibles:
   - Data OS Client Delivery si existant,
   - transcripts Fathom/tl;dv,
   - docs/CDC/deck/audit,
   - outputs locaux,
   - sources dans `/root/raw`,
   - VPS clients sources pour patterns.

Si aucun contexte client n’existe, stop: on n’implémente pas un client fantôme. Créer d’abord un brief/Data OS minimal.

## Règles dures

- Le terrain d’exécution cible est le **container Hermes client**, pas le host VPS, sauf pour `docker exec`/accès.
- Garder exactement le pattern Second Brain: `/root/raw`, `/root/wiki`, `/root/ops`, `/root/outputs`, `/root/config`, `/root/projects`.
- Le backend du **Data OS client doit être géré par Convex**. Convex est la base transactionnelle/source de vérité pour les données structurées (clients, leads, tâches, statuts, KPIs, logs métier). Le Second Brain markdown reste la mémoire/context OS, pas le backend applicatif.
- **Browser Harness est obligatoire par défaut** sur chaque VPS/container Hermes client. Toute automatisation navigateur doit utiliser `browser-use/browser-harness` par défaut, installé proprement depuis GitHub en suivant `install.md`. Voir `references/browser-harness-default.md`.
- Le Data OS client-facing doit être **100% client-native** avant livraison: aucun nom Client Delivery visible, schéma métier adapté à l'activité réelle du client, seeds plausibles issus de son workflow, et design inspiré de la maquette/deck présenté. Un preset générique/niche techniquement fonctionnel n'est pas une adaptation acceptable; voir `references/client-dataos-personalization-qa.md`.
- Si le client n'a pas encore son Data OS Convex, créer une section `config/data-os.md` + une page wiki dédiée et lister les accès/choix manquants dans `ops/access-needed.md` au lieu d'inventer un backend alternatif.
- Ne jamais modifier les sources existantes dans `/workspace/raw/`.
- Ne jamais stocker de secrets dans wiki, logs, reports, skills, mémoire ou réponses.
- Relançable sans casser: pas de doublons de crons, backups avant overwrite, merge contrôlé.
- Pas de création d’agents spécialisés par défaut. Pas de COO/CSM/Growth/Data hardcodés.
- Pas de daily brief cron par défaut. Préparer la capacité, mais le client configure lui-même la livraison.
- Les crons obligatoires doivent être **activés directement** dans le Hermes client: capture, ingest, lint, health.
- Toujours produire un rapport interne ET un rapport client-facing.
- Les accès VPS/container Hermes sont **obligatoires**. Sans accès VPS/container, il n'y a pas d'implémentation: stop et demander l'accès cible avant tout bootstrap.
- Ne pas jouer au héros silencieux quand le cadrage manque, mais ne pas poser de questions génériques débiles. Les questions doivent être **intelligentes par rapport à ce qu'on sait déjà du client**: niche, offre, sources disponibles, Data OS, transcript, CDC, stack existante, priorités déjà documentées.
- Les demandes d'accès doivent être contextualisées. Demander uniquement les accès utiles au cas client et à son plan d'implémentation probable, par exemple GHL/LeadConnector si CRM mentionné, Meta Ads si acquisition payante, Google Drive si docs/onboarding, WhatsApp/iClosed/Calendly si utilisés. Toujours demander s'il existe d'autres outils métier critiques non cités.
- Ne pas demander “qu'est-ce qui doit marcher au jour 1 ?” ni “qu'est-ce qu'on peut montrer au client ?” si la Data OS / CDC / transcript permet de le déduire. Déduire le MVP et le livrable client-facing depuis les données client, puis les exposer comme hypothèses dans le plan pour validation.
- Ne pas demander où notifier par défaut: le client configure les notifications/livraisons plus tard. Daily brief et notifications humaines ne sont pas activés par défaut.
- Convex est utilisé par défaut comme backend Data OS. Ne pas demander “Convex ou pas Convex” sauf contrainte explicite: la vraie question est plutôt “instance dédiée ou mutualisée ?” si cela devient nécessaire.
- Par défaut, le dashboard/Data OS applicatif est préparé mais réalisé dans un second temps, sauf demande explicite de l'implémenter maintenant.
- **Créer et exécuter des blocs d'entraînement comportemental adaptés au contexte client** est obligatoire avant de déclarer l'agent prêt client. Voir `references/behavior-calibration-training-blocks.md`.
- Les blocs d'entraînement doivent être dérivés de la niche, de l'offre, des accès testés/absents, des workflows métier et des risques sécurité du client. Jamais de pack générique copié-collé.
- Si les réponses du Hermes client sont trop génériques, patcher `SOUL.md`, `AGENT.md`, `/root/.hermes.md` et le contexte runtime (`/opt/hermes/.hermes.md` si applicable), puis relancer les tests.
- Respecter le process en 5 étapes avec validation humaine entre chaque étape: **Brainstorming → Rédiger plan d'implémentation → Exécuter le plan → Review → Prouver que tout fonctionne**. Stopper après chaque étape et attendre validation d'operator/operator avant de passer à la suivante, sauf urgence technique mineure et réversible.

## Architecture cible

```txt
/root/
├── SOUL.md
├── AGENT.md
├── .hermes.md
├── config/
│   ├── identity.md
│   ├── business.md
│   ├── data-os.md
│   ├── voice.md
│   └── tools.md
├── raw/
│   ├── transcriptions/
│   ├── docs/
│   ├── messages/
│   ├── screenshots/
│   └── imports/
├── wiki/
│   ├── index.md
│   ├── log.md
│   ├── entities/
│   ├── concepts/
│   ├── processes/
│   ├── sops/
│   └── queries/
├── ops/
│   ├── bootstrap-report.md
│   ├── access-needed.md
│   ├── health.md
│   ├── skill-inventory.md
│   ├── taskboard.md
│   ├── decisions.md
│   └── kpis.md
├── outputs/
│   ├── client-facing/
│   ├── reports/
│   ├── audits/
│   └── automations/
└── projects/
```

## SOUL.md vs AGENT.md

### `SOUL.md`
Identité profonde de l’Hermes client: mission business, rôle dans l’entreprise, niche, promesse opérationnelle, ton, limites, vocabulaire métier.

### `AGENT.md`
Manuel d’exécution: structure `/root/*`, workflows capture/ingest/query/lint, règles wiki, règles crons, outils, sécurité, rapports, manière de traiter les sources.

### `.hermes.md`
Contexte projet injectable pour les sessions dans le container. Il doit reprendre les règles critiques du client et du Second Brain.

Piège terrain: si le gateway/CLI Hermes tourne depuis `/opt/hermes`, un `.hermes.md` uniquement dans `/root/` ne sera pas forcément injecté. Installer/copie/symlink aussi le contexte projet dans `/opt/hermes/.hermes.md`, puis tester avec `hermes chat -q` depuis `/opt/hermes` que l'agent répond avec l'identité client spécifique et pas comme un Hermes générique.

## Workflow complet — gates obligatoires

Le process standard est séquentiel et validé par operator/operator entre chaque étape:

1. **Brainstorming / cadrage** — poser les questions utiles, surtout accès/sources/périmètre/promesse/outils existants. Stop validation.
2. **Rédiger le plan d'implémentation** — plan concret, chemins, commandes, livrables, risques, critères de succès. Stop validation.
3. **Exécuter le plan** — appliquer dans le container client, sans dériver hors plan sauf correction mineure documentée. Stop validation si changement de scope.
4. **Review** — relire/auditer ce qui a été installé, corriger les écarts, vérifier sécurité/secrets/idempotence. Stop validation.
5. **Prouver que tout fonctionne** — fournir preuves déterministes: fichiers, crons, health/lint, conversation agent-to-agent, chemins vérifiables.

Inspiration `obra/superpowers/skills/brainstorming`: ne pas transformer le workflow en tunnel autonome non validé. Créer un todo pour chaque gate, poser les questions une par une quand possible, proposer 2-3 approches avec recommandation, présenter le design/plan puis obtenir approval avant toute exécution. Chaque gate produit un artefact clair et attend validation avant le gate suivant.

## Détail opérationnel

### 1. Vérifier les prérequis

Charger/consulter si besoin:
- `client-vps-access` pour accès VPS/container,
- `hermes-agent` pour chemins/CLI/crons/skills Hermes,
- `second-brain-ops` pour règles wiki,
- `clientops-data-os` pour client Data OS,
- skills API pertinentes (`airtable`, `ghl-api`, `google-workspace`, `notion`, etc.) quand des accès/intégrations sont fournis,
- `skill-creator` si le skill doit être modifié.

Vérifier:
```bash
ssh TARGET_ALIAS 'echo HOST_OK && hostname && whoami'
ssh TARGET_ALIAS 'docker ps --format "{{.Names}}" | grep -F CONTAINER_NAME'
ssh TARGET_ALIAS 'docker exec CONTAINER_NAME sh -lc "echo CONTAINER_OK && hostname && whoami && pwd && command -v hermes || true"'
```

### 2. Brainstorming / cadrage intelligent

Avant d'écrire le plan, faire une passe **brainstorming/cadrage**. Elle couvre ce qui peut changer l'implémentation, mais elle doit partir de la data client existante.

Précondition non négociable: les accès VPS/container Hermes sont obligatoires. Sans eux, stop: demander l'accès cible, parce qu'on ne peut pas implémenter dans le vide.

Convex est le backend Data OS par défaut. Le dashboard/Data OS applicatif est généralement préparé pour un second temps. Donc ne pas bloquer le bootstrap en demandant “est-ce qu'on utilise Convex ?”. Demander seulement les détails qui changent l'exécution immédiate.

Méthode:
1. Lire d'abord la Data OS, CDC, transcript, docs, sources raw et fiche client.
2. Déduire le MVP, les priorités jour 1 et le livrable client-facing depuis ces sources.
3. Lister les accès probablement nécessaires selon ce qu'on sait du client.
4. Poser seulement les questions restantes qui débloquent l'implémentation.

Questions types autorisées:
- **Accès cible obligatoire** — quel alias SSH / IP VPS / nom container Hermes utiliser ? Si absent, stop.
- **Accès utiles au cas client** — d'après ce qu'on sait, il manque probablement: GHL/LeadConnector, Meta Ads, Google Drive/Docs, WhatsApp, iClosed/Calendly, email, GitHub/Vercel, CRM/outils métier spécifiques. Demander uniquement ceux qui sont pertinents pour ce client.
- **Accès oubliés** — est-ce qu'il existe d'autres outils métier critiques utilisés par le client que la Data OS/CDC/transcript ne mentionne pas ?
- **Sources manquantes** — si une source clé référencée dans Data OS/CDC/transcript n'est pas accessible, demander où la récupérer.
- **Contraintes sécurité** — demander seulement si le client manipule des données sensibles ou si une contrainte est visible dans les sources.
- **Data OS** — Convex sera utilisé par défaut; demander seulement instance dédiée vs mutualisée si nécessaire, et noter que dashboard/Data OS applicatif vient en second temps sauf demande contraire.

Questions interdites si les sources permettent de répondre:
- “Qu'est-ce qui doit marcher au jour 1 ?” → déduire depuis Data OS/CDC/transcript et mettre en hypothèse dans le plan.
- “Qu'est-ce qu'on peut montrer au client sans surpromettre ?” → déduire depuis le CDC/deck/promesse existante et valider dans le plan.
- “Où notifier ?” → inutile par défaut; le client configurera notifications/daily brief plus tard.

Format: 3 à 7 questions utiles maximum au total, souvent moins. **Une question par message** quand la réponse conditionne la suite. Préférer les choix multiples quand c'est possible. Stopper après ce gate et attendre validation avant le plan.

### 3. Récupérer tout le contexte client
1. Data OS Client Delivery via `client_slug`.
2. Documents attachés: CDC, deck, Data OS, notes, transcript.
3. Raw local: `/workspace/raw/transcriptions`, `/workspace/raw/docs`, `/workspace/raw/fathom`, `/workspace/outputs/clients/<slug>`.
4. Sources manuelles fournies.
5. VPS sources utiles selon niche.

Créer un bundle de contexte temporaire côté target dans `/workspace/raw/imports/bootstrap-YYYY-MM-DD/`.

Ne jamais mettre de secrets dans ce bundle.

### 3. Auditer le container cible

Dans le container:
- version Hermes,
- `~/.hermes/config.yaml`,
- `~/.hermes/skills/`,
- `hermes skills list`,
- `hermes cron list`,
- scripts dans `~/.hermes/scripts/`,
- existence de `/root/raw`, `/root/wiki`, `/root/ops`, etc.

Écrire l’audit dans `/workspace/ops/bootstrap-report.md`.

### 4. Auditer les patterns sources

Comparer:
- Client Delivery Second Brain canonical,
- Example Client si niche ou pattern utile,
- autres VPS clients passés en `source_patterns`,
- tous les skills existants dans ces bases.

Ne jamais copier une structure spécifique client brute. Extraire les patterns utiles seulement.

### 5. Skill Mining & Adaptation

Objectif: importer des **skills existants** utiles, pas les recréer depuis zéro.

Sources:
- notre `~/.hermes/skills/`,
- VPS clients existants dans `~/.hermes/skills/`,
- éventuellement `/root/.claude/skills/`,
- GitHub/marketplace en dernier recours.

Catégories:
1. **Skills universels** — Second Brain, VPS, docs, browser automation, API/webhooks, CRM générique, reporting.
2. **Skills niche** — récupérés depuis nos bases ou VPS clients similaires, puis adaptés. Ex immo: RealAdvisor, Apimo, Popety depuis Example Client/autres clients immo.
3. **Skills externes** — recherchés seulement si nos bases ne couvrent pas le besoin.

Chaque candidat passe par un safety pass:
- lire le skill en entier,
- détecter secrets/tokens/IDs privés,
- détecter noms clients/chemins internes non pertinents,
- adapter au nouveau client,
- supprimer le spécifique inutile,
- vérifier qu’il reste actionnable,
- installer dans `~/.hermes/skills/`,
- synchroniser `/root/.claude/skills/` seulement si Claude Code existe,
- documenter dans `/workspace/ops/skill-inventory.md`.

Voir `references/skill-mining-and-adaptation.md`.

Session dogfood utile: `references/mathieu-bootstrap-field-notes.md` documente le premier bootstrap réel Mathieu, avec patterns fiables pour tarball → `docker cp`, heredoc `docker exec -i`, CLI `/opt/hermes/.venv/bin/hermes`, crons avec scripts relatifs, et vérification finale.

Rollout master Agence Evo: `references/agence-evo-master-rollout-field-notes.md` documente l'alignement d'un master d'agence + templates + clients existants: Kanban préalable, patch `evo-master`, canonisation `/home/dev/evo-hermes/templates/client`, `new-client.sh` idempotent, contournement des permissions host UID 10000 via `docker cp`/`docker exec`, et distinction containers tests alignés vs live gateway actif.

Rollout Data OS client: `references/client-dataos-container-rollout.md` documente l'installation d'un Data OS Next/Convex dans un container Hermes existant, le seed Convex, la création membership/token agent, le service systemd `docker exec`, la skill locale `/opt/data/skills/...`, les smoke tests API, et les pièges pnpm/Corepack + header `X-DataOS-Client`.

Personnalisation Data OS client-facing: `references/client-dataos-personalization-qa.md` documente le standard après correction Mathieu — ne jamais livrer un simple preset/niche repeint; adapter schéma, wording, seeds, branding et design à la maquette client, puis vérifier anti-fuite Client Delivery en source + runtime + screenshot.

### 6. Installer Browser Harness par défaut

Avant ou pendant le bootstrap opérationnel, installer Browser Harness dans le container Hermes client selon `references/browser-harness-default.md`.

Règle: toute automatisation navigateur utilise Browser Harness par défaut. Playwright brut, dev-browser, Browserbase ou Selenium maison sont des exceptions à justifier explicitement.

Installation cible:
```bash
mkdir -p /root/projects
cd /root/projects
git clone <url> || true
cd /workspace/projects/browser-harness
git pull --ff-only || true
uv tool install -e .
command -v browser-harness

# VPS/headless: installer Chromium si absent, puis exposer un CDP local isolé.
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation
~/.hermes/scripts/start-browser-harness-chromium.sh >/tmp/browser-harness-chromium.log 2>&1 &
export BU_CDP_URL=<url>
browser-harness --doctor || true
browser-harness -c 'print(page_info())'
```

Créer `/workspace/ops/browser-harness.md` avec le statut d’installation, le chemin repo, la sortie doctor sanitizée, les symlinks skills, et le statut CDP/navigateur.

### 7. Bootstrap Second Brain

Créer les dossiers et fichiers manquants.

Créer/mettre à jour sans casser:
- `SOUL.md`
- `AGENT.md`
- `.hermes.md`
- `config/identity.md`
- `config/business.md`
- `config/data-os.md` — Convex obligatoire comme backend Data OS, avec statut, URL projet si connue, schéma pressenti, modules à créer, accès manquants.
- `config/tools.md`
- `wiki/index.md`
- `wiki/log.md`
- `ops/taskboard.md`
- `ops/decisions.md`
- `ops/kpis.md`
- `ops/access-needed.md`
- `ops/health.md`
- `outputs/client-facing/implementation-brief.md`

### 8. Installer scripts Second Brain

Installer/adaptater dans le container:
```txt
~/.hermes/scripts/sb-capture.py
~/.hermes/scripts/sb-context-scan.py
~/.hermes/scripts/sb-lint.py
~/.hermes/scripts/sb-health.py
```

Les scripts doivent être silencieux, idempotents, et utiliser state: `~/.hermes/state/second_brain_*.json`.

### 9. Créer les crons dans le Hermes client

Créer ou mettre à jour, sans doublon:
- Capture: every 30m
- Ingest/context scan: every 120m
- Lint: Sunday 4AM
- Health: fréquence raisonnable, local/silent

Utiliser le CLI Hermes du container quand possible, mais ne pas supposer que `hermes` est dans le `PATH`: dans les containers clients récents, le binaire fiable est souvent `/opt/hermes/.venv/bin/hermes` et la config vit dans `/opt/data/config.yaml`.

```bash
cd /opt/hermes
H=./.venv/bin/hermes
$H cron list
$H cron create "every 30m" --name "Second Brain Capture" --deliver local --script "sb-capture.py" --no-agent
```

Piège vérifié: `--script` refuse les chemins absolus (`~/.hermes/scripts/sb-capture.py`). Le script doit être référencé par nom relatif (`sb-capture.py`).

Piège terrain Mathieu: dans certains containers Hermes récents, les crons listent `Script: sb-*.py` mais le scheduler résout le chemin vers `/opt/data/scripts/sb-*.py`, pas `~/.hermes/scripts/`. Installer donc les scripts aux deux endroits par sécurité:
```bash
mkdir -p ~/.hermes/scripts /opt/data/scripts
cp ~/.hermes/scripts/sb-*.py /opt/data/scripts/
chmod +x ~/.hermes/scripts/sb-*.py /opt/data/scripts/sb-*.py
cd /opt/hermes && ./.venv/bin/hermes cron run <job_id>
sleep 30 && ./.venv/bin/hermes cron list --all  # Last run doit passer à ok
```
Ne considérer les crons valides qu’après un `cron run` + `cron list --all` montrant `Last run: ... ok`; `cron status` seul ne suffit pas.

Pour les opérations multi-lignes via `docker exec`, préférer `docker exec -i ... sh <<'EOS'` depuis SSH plutôt que des quotes imbriquées: les quotes shell peuvent casser silencieusement des variables comme `$BACK` et provoquer des erreurs débiles (`mkdir: missing operand`).

Si la CLI cron est incomplète ou interactive, utiliser `hermes chat -q` côté client pour créer les crons, puis vérifier déterministiquement avec `hermes cron list`.

Ne pas créer de daily brief par défaut.

### 10. Agent-to-agent

Lancer le Hermes client dans son container avec un prompt autonome:
- lire `SOUL.md`, `AGENT.md`, `.hermes.md`,
- confirmer son rôle,
- auditer sa structure,
- enrichir la première synthèse wiki,
- proposer les accès manquants,
- vérifier les skills installés,
- produire un résumé de compréhension.

Notre Hermes doit ensuite vérifier les fichiers/crons/skills lui-même. Ne jamais croire “done” sans preuve.

### 11. Blocs d'entraînement comportemental

Créer et exécuter des blocs d'entraînement adaptés au contexte réel du client. Voir `references/behavior-calibration-training-blocks.md`.

Objectif: faire répondre le Hermes comme l'AIOS opérationnel spécifique du client, pas comme un assistant générique.

Étapes:
1. Générer 10 à 20 prompts de calibration depuis la Data OS/CDC/transcripts/wiki/outils du client.
2. Couvrir au minimum: identité, usage client, workflow métier principal, outils/limites, Browser Harness, sécurité secrets, HITL messages externes, taskboard delivery, client-facing.
3. Exécuter depuis le vrai cwd runtime, souvent `/opt/hermes`:
   ```bash
   cd /opt/hermes
   H=./.venv/bin/hermes
   mkdir -p /workspace/ops/calibration
   $H chat -q "PROMPT ADAPTÉ AU CLIENT" --quiet
   ```
4. Stocker les résultats dans `/workspace/ops/calibration/calibration-raw-results.md` et/ou JSON.
5. Analyser les écarts: réponses génériques, limites outils fausses, confusion OAuth/API key, refus sécurité insuffisant, mauvais format taskboard, mauvais choix navigateur.
6. Patcher `SOUL.md`, `AGENT.md`, `/root/.hermes.md` et `/opt/hermes/.hermes.md` si le runtime tourne depuis `/opt/hermes`.
7. Créer/mettre à jour:
   - `/workspace/ops/calibration/calibration-report.md`,
   - `/workspace/outputs/client-facing/how-to-use-hermes.md`,
   - `/workspace/wiki/concepts/hermes-usage-playbook.md`,
   - `/workspace/wiki/index.md`,
   - `/workspace/wiki/log.md`.
8. Relancer 4 à 6 scénarios de vérification. Ne pas déclarer l'agent prêt client avant passage OK.

Critères OK:
- identité spécifique client/niche/promesse,
- outils/accès/limites exacts,
- secrets refusés,
- validation humaine avant message externe,
- Browser Harness par défaut,
- taskboards en blocs parents + sous-tâches + dépendances + critères.

### 12. Intégrations & Data OS Convex

Quand l'implémentation arrive au **second temps Data OS**, utiliser le template interne local `/workspace/projects/aios-client-dataos-template` comme base produit. Ce template fournit: Next.js + Convex, objets business configurables, vues, records, approvals HITL, auditLog, API agent-safe pour Hermes (`/api/agent/dataos/*`) et blueprints d'adaptation client. Flow attendu: lire le contexte client → Hermes propose objets/champs/vues/KPIs → validation humaine du schéma initial → application via API agent-safe/Convex → vérification auditLog. Ne pas livrer Appsmith/ToolJet/Budibase brut; trop lourd et pas assez client-safe.

Quand operator/operator fournit des accès tiers pour le Hermes client, appliquer `references/client-integration-access-injection.md`: injecter les secrets uniquement dans `~/.hermes/.env` ou fichiers credentials chmod `600`, tester depuis le container client, produire des rapports sanitizés, faire relire par le Hermes client, puis scanner les preuves pour éviter toute fuite de secret.

Le backend du Data OS client doit être **Convex**. Ne pas créer un backend alternatif ad hoc (SQLite maison, JSON server, Airtable bricolé comme source de vérité, Google Sheets comme DB principale) sauf demande explicite et temporaire.

Pattern attendu:
- Convex = données structurées et transactionnelles: clients finaux, onboardings, statuts, tâches, incidents, campagnes, KPIs, logs métier.
- Second Brain markdown = contexte, synthèses, SOPs, décisions, rapports.
- Dashboard / portail = vue packagée au-dessus de Convex.
- Hermes = moteur agentique qui lit/écrit via API Convex + sources raw.

Pendant le bootstrap:
- créer `config/data-os.md`,
- créer/mettre à jour `wiki/concepts/data-os-convex.md`,
- documenter les modules Convex pressentis,
- lister dans `ops/access-needed.md` ce qu'il faut pour créer/brancher Convex si absent,
- si un repo dashboard existe, inspecter `convex/*.ts` avant de deviner les fonctions,
- ne jamais stocker `CONVEX_DEPLOY_KEY`, `ADMIN_BACKEND_SECRET` ou tokens dans wiki/ops/reports.

- Si credentials présents, préparer le branchement Convex et documenter les accès nécessaires, mais ne pas construire le dashboard/Data OS applicatif pendant le bootstrap sauf validation explicite dans le plan approuvé.
- Si absents, créer/mettre à jour `/workspace/ops/access-needed.md`.

Format:
- outil,
- accès demandé,
- pourquoi,
- priorité,
- action côté client.

### 13. Rapports finaux

Interne: `/workspace/ops/bootstrap-report.md`

Doit contenir:
- date,
- cible,
- sources ingérées,
- structure créée/maj,
- crons actifs,
- skills installés/rejetés,
- accès manquants,
- vérifications passées/échouées.

Client-facing: `/workspace/outputs/client-facing/implementation-brief.md`

Doit être simple, non technique, sans secrets, sans prix public sauf validation.

### 14. Vérification finale obligatoire

Avant de répondre succès:
```bash
# Structure
find /root -maxdepth 2 -type d | sort

# Governance
sed -n '1,80p' /root/SOUL.md
sed -n '1,80p' /root/AGENT.md
sed -n '1,80p' /root/.hermes.md

# Skills
hermes skills list || true

# Browser Harness
command -v browser-harness || true
browser-harness --doctor || true
sed -n '1,120p' /workspace/ops/browser-harness.md || true

# Crons
hermes cron list || true

# Scripts
ls -la ~/.hermes/scripts/sb-*.py
python3 ~/.hermes/scripts/sb-health.py
```

Réponse finale courte:
- ce qui est installé,
- ce qui est vérifié,
- ce qui manque,
- chemins des rapports.

## Outils et chemins Hermes importants

D’après Hermes Agent:
- config: `~/.hermes/config.yaml`
- env: `~/.hermes/.env`
- skills: `~/.hermes/skills/`
- scripts: `~/.hermes/scripts/`
- sessions: `~/.hermes/sessions/`
- logs: `~/.hermes/logs/`

Si Claude Code existe, sync optionnelle: `/root/.claude/skills/`.

## Pitfalls

- Ne pas importer les spécificités Example Client dans un client non-immo.
- Ne pas copier un skill avec secrets ou chemins internes.
- Ne pas faire confiance à l’agent client sans vérification déterministe.
- Ne pas créer de daily brief qui spamme un humain sans configuration/validation.
- Ne pas redémarrer le gateway courant depuis une session gateway.
- Ne pas supposer que `hermes cron create` accepte tous les flags: tester/list avant.
- Ne pas écraser `/root/raw`; c’est immutable.
- Après bootstrap, lancer une calibration comportementale depuis le vrai cwd runtime du gateway/CLI (`/opt/hermes` dans les containers récents): 10-20 prompts sur identité, outils, sécurité, delivery, puis patcher `SOUL.md`, `AGENT.md`, `/root/.hermes.md` et `/opt/hermes/.hermes.md` si l'agent répond trop générique.
- Ne pas considérer l'agent "prêt client" avant un test `hermes chat -q` prouvant: identité spécifique client, accès/limites exacts, refus secrets, HITL messages externes, Browser Harness par défaut.

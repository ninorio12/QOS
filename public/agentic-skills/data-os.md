---
name: data-os
description: AIOS Data OS — Convex DB source de vérité, dashboard AIOS Data OS, agents Data Analyst + CFO, Google Sheets sync.
keywords: [data-os, convex, dashboard, kpi, cfo, clientops, google-sheets]
---

# ClientOps Data OS

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## Architecture AIOS 3 couches
- Context OS: /root/client-aios/knowledge/ (business, brand voice, formations)
- Data OS: Convex DB = source unique de vérité + Dashboard AIOS
- Capture OS: Google Sheets, Discord, API, agents IA

## Dashboard
- URL: <url>> (primary) | <url>> (alias)
- Stack: Next.js 14 + Convex + Tailwind CSS + Dark Mode
- Code: /workspace/projects/client-dashboard/
- Hébergé sur Vercel
- Pages: Dashboard, Sales, KPIs, Cohorte, Incubateur, Finance, Transcriptions, Equipe, SOP, Settings
- Roadmap membre: `/roadmap/[slug]?token=...` (page privée via `studentAuth`, check-in hebdo, tâches, progression). Anciennes routes `/cohorte/roadmap/[slug]` peuvent exister côté UI mais le lien opérationnel à envoyer est `/roadmap/{slug}?token={accessToken}`.

### Pages publiques dans le dashboard (`/capture`, `/public/*`, `/f/*`)
Quand une landing/capture publique vit dans `client-dashboard`, il faut libérer **deux couches**, sinon la page peut être HTTP 200 mais polluée par le chrome interne:
1. `middleware.ts` → ajouter le path exact dans `PUBLIC_PATHS` pour éviter le redirect/login.
2. `app/client-layout.tsx` → ajouter le path dans `NO_SIDEBAR_PREFIXES` et souvent `NO_CHROME_PREFIXES` pour retirer sidebar + `CurrentMemberModal` + wrapper admin.
3. Vérifier avec Chrome headless sur l'alias prod (`<client-dashboard-domain>`), pas seulement l'URL de déploiement Vercel: absence de `Qui es-tu`, absence de sidebar, présence du CTA/formulaire, UTM conservés dans les liens/iframes.
4. Pour une capture Typeform, utiliser le formulaire canonique unique connecté au Pipe DataOS; ne pas multiplier les formulaires pour tracker la source, préserver les UTM.

### Data OS vs Cockpit Hermes / Workspace
- **Convex + Second Brain restent la source de vérité.** Ne jamais remplacer le Data OS par une UI d'agent simplement parce qu'elle affiche mémoire/jobs/sessions.
- Les dashboards type `hermes-workspace` sont des **cockpits opérateur**: chat, sessions, jobs, mémoire, skills, fichiers, terminal, swarm. Utile pour piloter Hermes, pas pour modéliser les données business.
- Pour clients AIOS, ne pas déployer un cockpit brut avec terminal/file browser/settings providers par défaut: trop puissant, trop technique, trop risqué. Préférer une version client-safe/Lite centrée sur brief, actions HITL, outputs, leads, SOPs, taskboard, mémoire en lecture contrôlée.
- Pour Client Delivery interne, un cockpit Hermes complet peut être utile pour superviser crons/jobs/skills/multi-agent/debug. Le bon pattern: **Data OS = cerveau/base**, **Hermes Agent = moteur**, **Workspace = cockpit**, **Dashboard AIOS = vue business packagée**.
- Quand tu expliques un Data OS/RMS à une personne non-tech (ex: coach/solopreneur), éviter “brief de build”, “Atlas Dev”, architecture abstraite ou jargon. Dire simplement: “un tableau de bord central qui lit tes outils, montre tes KPIs, crée des alertes et permet de lancer des actions”. Guider en étapes courtes: lister les outils → prioriser les connexions → définir les données/actions MVP → seulement ensuite builder.
- Ne pas demander de recopier manuellement dans Drive/Notion ce qui existe déjà dans un outil source (Hubfit, Canva, Notion, Stripe, iClosed, etc.). Le Data OS doit synchroniser/lire les outils existants; Drive peut servir de stockage documentaire, pas de double saisie.
- Pour les outils sans API publique (ex: Hubfit), considérer “computer-use”/automatisation écran comme un connecteur de Capture OS: l’agent clique/lit comme un humain puis écrit le résultat dans le Data OS. Ce n’est pas la source de vérité ni aussi stable qu’une API; commencer par un test étroit (ex: détecter clientes inactives 2–3 jours) avant d’automatiser plus large.
- Référence d'évaluation: `references/hermes-workspace-cock<PRIVATE_TOKEN>`.

### Privacy Gate (Roadmap Token) — current production pattern
Les roadmaps sont privées. Le pattern actuel validé utilise `students.accessToken` via le module `studentAuth`.
- Lien opérationnel à envoyer: `/roadmap/[slug]?token=TOKEN` (ex: `<url>>/roadmap/jeremy-paymal?token=...`).
- Récupérer le token existant: `studentAuth:getAccessTokenForAdmin` avec `ADMIN_BACKEND_SECRET`.
- Générer si absent: `studentAuth:generateAccessToken` avec `studentId` + `adminSecret`.
- Ne PAS stocker le token dans le wiki/log. Si un message prêt à envoyer contient le token, écrire dans `/tmp/...txt` et livrer le fichier plutôt que recopier le token dans une réponse longue.
- Ancien pattern rencontré: `metadata.roadmapToken` + `/cohorte/roadmap/[slug]`. Le vérifier avant usage; ne pas l’assumer comme source de vérité.

### Vercel Deploy (CRITICAL)

**Vercel auth** — le vieux token explicite documenté ici peut être invalide. En pratique, le CLI local est déjà auth sur le team `contact-2435s-projects`; commencer par un deploy sans `--token`:
```bash
npx vercel deploy --yes --force --prod
```
Si Vercel répond `TEAM_ACCESS_REQUIRED` ou auth/scope error, seulement là chercher/renouveler un token valide.

**Remote build fonctionne** — contrairement à une croyance antérieure, le remote build marche avec `--prod`. Le "Unexpected error" n'était PAS un problème Node 24.x — c'était un **scope d'env vars**.

**Env vars scope** : les `NEXT_PUBLIC_*` vars doivent exister dans **Production ET Preview**. Un déploiement preview (`vercel deploy --yes`) sans env vars Preview crashera silencieusement. Vérifier avec:
```bash
npx vercel env ls --token "$TOKEN"
```
Si les vars sont en "Production" seulement, ajouter aussi en "Preview" (via dashboard Vercel, pas CLI — le CLI demande un branch interactif).

**Deploy flow** (TOUJOURS `--prod` pour que les env vars Convex soient disponibles):
```bash
cd /workspace/projects/client-dashboard
TOKEN=<SECRET>

# Standard — force rebuild sans cache
npx vercel deploy --yes --force --prod --token "$TOKEN"

# OU prebuilt (si remote build échoue)
npx vercel build --prod
npx vercel deploy --prebuilt --prod --yes --token "$TOKEN"
```

⚠️ NE PAS utiliser `vercel deploy` sans `--prod` → crée un déploiement Preview qui n'a PAS les env vars (elles sont en "Production" seulement). Le build crashera avec `No address provided to ConvexReactClient`.

**Convex build-time fix** : si le build crash avec `No address provided to ConvexReactClient`, ajouter les env vars dans `vercel.json` pour garantir la dispo au build time:
```json
{
  "env": {
    "NEXT_PUBLIC_CONVEX_URL": "<url>",
    "NEXT_PUBLIC_CONVEX_SITE_URL": "<url>"
  }
}
```

**Pitfall `seatBlock`** : si `vercel deploy --debug` montre `TEAM_ACCESS_REQUIRED`, c'est un faux positif — le `--token` le contourne. Le token OAuth local fonctionne pour les déploiements.

## Team access / révocation Data OS

Quand un membre d'équipe sort et qu'il faut retirer son accès Data OS, suivre `references/revoke-team-member-access.md`.
- Accès Setter = mot de passe partagé hashé dans Convex (`authSettings.setter_password`) + cookie signé `kdos_setter`; on ne peut pas lire le mot de passe, on le **rotate**.
- Rotation seule insuffisante: invalider aussi les cookies Setter existants via `middleware.ts` en comparant `setterPayload.iat` à `authSettings.setter_password.updatedAt`, sinon une session déjà ouverte peut survivre jusqu'à 7 jours.
- Si le repo canonique est sale, déployer via worktree isolé puis reporter le patch minimal dans le repo canonique pour éviter un rollback au prochain deploy.
- Si `scripts/set-setter-password.ts` renvoie Convex `forbidden`, le `ADMIN_BACKEND_SECRET` local est probablement stale: utiliser les env vars production via une route one-shot authentifiée, l'appeler une fois, puis supprimer la route et redéployer. Vérifier `404` sur la route temporaire avant de finaliser.
- Ne jamais exposer le nouveau mot de passe Setter dans wiki/logs/canaux publics; livrer uniquement au staff autorisé.

## Google Sheets Sources
- KPIs quotidiens: 1BbPbCtOAcIIABIp7Wcz2nXa9cGzCuTjg
- Ventes & Commissions: 1Eiv4kBYqiwc7phRhLREqxUp6F8LaSiaPoRqXKFzqHRY

## Finance OS / CFO cash guidance

Quand operator/operator partage un sheet finance, un solde cash, une avance perso ou demande comment répartir la trésorerie, utiliser `references/finance-os-envelope-pilotage.md`.
- Raisonner en enveloppes virtuelles: OPEX, CLOSER/Sales Com, TAX, VAULT, OWNER PAY, PROFIT.
- Ne pas appliquer des pourcentages mécaniques si l'OPEX/runway n'est pas d'abord couvert.
- OPEX ClientOps révisé après corrections d'operator: 7 200 € bas / 7 700 € haut par mois **hors founder pay**. Founder pay operator/operator = 4 000 €/mois en OWNER PAY séparé. Pour un runway mensuel complet incluant le fondateur, viser 11 200–11 700 € ; toujours calculer l'OPEX restant payé/non payé avant d'allouer le cash.
- Dépense perso depuis compte entreprise = OWNER PAY / avance perso en pilotage interne, pas OPEX, sauf validation comptable contraire.
- R1/operator peut avoir fixe CTO + 10% de commissions agence: séparer les deux lignes, et recommander de payer les commissions sur cash encaissé plutôt que sur deal signé/facturé tant que le solde n'est pas reçu.
- Quand operator demande une **balance par rapport aux chiffres d'hier**, repartir du dernier plan validé (ex: cash prévu, avance perso/appart, cash business utile, plan prudent, tampon restant) puis ajouter uniquement le **delta total confirmé**. Ne pas additionner des captures/lignes individuelles si le user dit ensuite que c'est un total global en plus; répondre en correction nette: ancien tampon → nouveau tampon, delta réel, commissions variables déduites si incluses.
- Pour les virements SEPA/paiements en attente: classer en **cash à recevoir / contracté**, jamais en cash encaissé tant que la banque/processor ne confirme pas. SEPA classique = généralement 1–2 jours ouvrés, parfois 3; SEPA instantané = minutes.

## Agents
- Data Analyst: KPIs hebdo lundi 9h → Telegram
  Script: ~/.hermes/scripts/agent-data-analyst.py
- CFO: Finance lundi+jeudi 9h → Telegram
  Script: ~/.hermes/scripts/agent-cfo.py
  Commissions: Team Member 2.5%, Team Member 13%, operator 10% (Team Member sortie équipe — ne pas recréer d'accès sans validation explicite)

## Convex
- Config: /root/client-aios/.env (CONVEX_URL, CONVEX_DEPLOY_KEY)
- Helper: /root/convex_helper.py
- Schema: /root/client-aios/convex/schema.ts
- Deploy: cd /root/client-aios && npx convex deploy

## Programmes
- Cohorte (B2B): Mastermind IAO, agences techniques
- Incubateur (B2C): reconversion → lancement agence IA
- Les deux sont séparés dans AIOS Data OS

### Cohorte vs Incubateur — Data Model

**Cohorte = agences** (B2B). Chaque canal Discord dans "SALONS AGENCES" = une agence.
- Une agence peut avoir plusieurs associés (ex: jungle-agency = Rodolphe + Sébastien Arraïs)
- Tous les associés partagent la même roadmap (1 student record par agence, noms listés dedans)
- `students.program` doit être `"cohorte"` (pas `"incubateur"` ni null)

**Incubateur = individus** (B2C). Chaque personne = 1 student record.

**Discord client/cohort channels** (Guild `<discord_guild_id>`):
- Category ID: contient les channels agences
- Pour lister: GET /guilds/{guild_id}/channels → filter parent_id = category, type = 0
- Identifier les associés: fetch messages du channel, extraire les authors uniques (exclure AIOS AI, operator, operatorfx, hmz20_22 = coachs/staff)
- Cross-ref avec Convex: POST {CONVEX_URL}/api/query path "dashboardQueries:macroView"

**Audit cohorte DB**: Les students avec program=null ou "incubateur" mais qui sont dans un channel SALONS AGENCES doivent être re-tagués program="cohorte". Les students incubateur ne doivent PAS apparaître sur /cohorte (filtré dans macroView via `students.filter(s => s.program === "cohorte")`).

## Convex API query pattern (pas besoin du helper Python):
```python
r = requests.post(f"{CONVEX_URL}/api/query", json={"path": "dashboardQueries:macroView", "args": {}})
students = r.json()["value"]["members"]
```

## Convex Modules — Content OS / Pipeline éditorial

Quand operator/operator veut accélérer la production contenu, créer/maintenir une surface **Content** dans le Data OS plutôt que de laisser les inspirations, scripts et liens Vercel éparpillés en chat.

Pattern validé : inspiration YouTube → variation AIOS → fiche Vercel scriptée → à tourner → tournée → montage → programmée → publiée.

Surface attendue :
- Route `/content`, sidebar **Content**.
- Onglets : `Fondamentaux`, `YouTube`, `LinkedIn`, `Instagram`, `Copywriting`.
- YouTube en kanban avec les statuts ci-dessus.
- LinkedIn doit pouvoir servir de **planning exécutable** : une ressource centrale `contentResources` vers la fiche copiage/programming + des `contentItems` par post avec `status: "scheduled"`, `stageOrder: 6`, `publishAt`, `vercelUrl` ancré vers le bon jour, et `assets[]` pour l’image PNG associée.
- Tables Convex dédiées `contentItems` + `contentResources`, module `convex/content.ts`.
- Chaque vidéo scriptée doit garder son `vercelUrl` dans le pipeline.
- Quand operator/operator corrige le titre ou le packaging d'une vidéo déjà ajoutée, **patcher la fiche Content OS existante** (`content:getItemBySlug` → `content:patchItem`) au lieu de créer une nouvelle fiche. Mettre le nouveau titre en `title` + `adaptedTitle`, garder les anciens titres en variantes/backups dans `packagingNotes`, et noter la correction dans `notes`.
  - Recette rapide fiable: lire `NEXT_PUBLIC_CONVEX_URL` depuis `/workspace/projects/client-dashboard/.env.local`, appeler `content:listItems` avec `{business:"AIOS", channel:"youtube"}`, retrouver la fiche par slug/titre/adaptedTitle/termes clés, puis `content:patchItem` avec seulement les champs à modifier. Vérifier ensuite via `content:getItemBySlug` et afficher les champs modifiés dans la réponse.
  - Ne jamais supposer le slug exact depuis un vocal approximatif: chercher large (`title`, `adaptedTitle`, `slug`, `angle`, `notes`, `packagingNotes`) puis choisir la fiche la plus probable. Si deux candidats plausibles restent après recherche, demander confirmation au lieu d'écraser une vidéo voisine.
- Quand une vidéo est tournée, la fiche Content OS doit recevoir les ressources monteur directement dans `contentItems.assets[]` (fiche Vercel/téléprompteur, schéma fullscreen, Frame.io rushs) et passer en statut `recorded` / `stageOrder: 4`. Ne pas se contenter d’ajouter le lien Frame.io dans la page Vercel : Content OS est la source de vérité éditoriale.
- Quand une miniature YouTube est validée/remplacée, patcher la fiche Content OS existante avec `content:patchItem` en mettant `thumbnailUrl` directement sur l’item. Si l’image est locale et qu’aucun asset hosté fiable n’est disponible, une `data:image/...;base64,...` dans `thumbnailUrl` fonctionne pour affichage immédiat dans `/content` et évite un deploy Vercel inutile. Ajouter une note interne courte dans `notes` (ex: miniature validée/remplacée + date) puis vérifier via `content:getItemBySlug` que `thumbnailUrl` et `notes` sont bien persistés.
- UI Content OS actuelle: chaque vidéo peut stocker le lien rushes Frame.io via `assets[]` avec `type: "frame"`, le style vidéo dans `format` (`Value Bomb`, `Vlog`, `Trailer`, `VSL`) et la deadline production dans `publishAt`; `/content` a une vue Kanban + une vue Calendrier filtrable par style.
- Vérification protégée : un curl public sur `/content` qui redirige vers `/login?from=/content` est normal ; vérifier les données via `content:listItems` / `content:listResources`.
- Accès monteur/content-only : ne pas donner un accès admin ou setter bricolé. Utiliser le pattern `kdos_content` + `kdos_role=content`, mot de passe hashé dans `authSettings.content_password`, middleware limité à `/content`, et vérification Playwright (`/finance` doit rediriger vers `/content`). Voir `references/content-only-editor-access.md`.

### Programmation LinkedIn via Buffer / outil externe
- Pour une batch LinkedIn simple **texte + image**, Buffer est un bon premier choix, mais ne promets pas l’automatisation tant que le compte LinkedIn n’est pas connecté et qu’un post test n’a pas été publié.
- Plan recommandé : tester en **Free** avec 1 post; si la batch dépasse 10 posts programmés, passer à **Essentials 1 channel** (Free limite à 10 posts programmés par channel; paid = scheduling illimité/fair-use). Pas besoin de Team sauf validation équipe/workflows.
- Flow conseillé : connecter le profil/page LinkedIn dans Buffer → programmer un post test à +30min → si publié correctement, programmer la série depuis la fiche Content OS.
- Ne pas confondre : Buffer gère bien texte + image; les carrousels PDF/documents natifs LinkedIn ou une automatisation Data OS → Buffer API doivent être testés séparément.

Voir `references/content-os-youtube-pipeline.md` pour le modèle, les champs, le seed initial et les pièges Vercel/Convex.

## Convex Modules — R&D / Funnel Hacking

Pour ajouter des teardowns concurrents, créateurs, funnels, swipes marketing ou recherches marché dans le AIOS Data OS, utiliser la surface **R&D** plutôt que `docs`, `knowledge` ou des fichiers isolés.

Pattern validé :
1. **Toujours inspecter l’existant d’abord** : `docs:list`, `knowledge:search`, et grep du code dashboard pour éviter de créer un doublon marketing/R&D.
2. **Modèle Convex dédié** : tables `researchFolders` et `researchDocuments`, module `convex/research.ts`.
   - `researchFolders` = un dossier par funnel/créateur/campagne (`title`, `slug`, `creator`, `market`, `funnelType`, `status`, `period`, `summary`, `sourceUrls`, `tags`).
   - `researchDocuments` = contenus dans le dossier (`folderId`, `title`, `slug`, `type`, `content`, `sourcePath`, `sourceUrls`, `order`, `tags`, `metadata`).
3. **UI dédiée** : route `/research`, sidebar item **R&D**, recherche par créateur/marché/tag, vue dossier, lecteur markdown.
4. **Seed d’un dossier** via mutations Convex HTTP :
```python
requests.post(f"{CONVEX_URL}/api/mutation", json={
  "path": "research:upsertFolder",
  "args": {
    "title": "Iman Gadzi — Make Money Online — Mai 2026",
    "slug": "iman-gadzi-make-money-online-mai-2026",
    "creator": "Iman Gadzhi",
    "market": "Make Money Online",
    "funnelType": "WhatsApp challenge / webinar launch",
    "period": "Mai 2026",
    "status": "active",
    "summary": "...",
    "sourceUrls": ["<url>"],
    "tags": ["funnel-hacking", "whatsapp", "challenge"]
  },
  "format": "json"
})
```
5. **Vérifier** avec `research:getFolderBySlug`, puis `npm run build`, `npx convex deploy --cmd "echo skip" --typecheck=disable`, `npx vercel deploy --yes --force --prod`.

Pitfalls :
- Ne pas entasser ce contenu dans **Docs AIOS** : Docs = documentation système/intégrateur ; R&D = intelligence marché/funnels.
- Corriger les dates absurdes du user quand évident (`Mai 2096` → `Mai 2026`) au lieu de polluer les slugs.
- `/research` reste une route protégée par login ; un curl public qui redirige vers `/login?from=/research` est normal.
- Après `npx convex deploy`, les types `convex/_generated/api.d.ts` se mettent à jour ; avant ça, l’UI peut nécessiter `(api as any).research` temporairement.

## Convex Modules — Processus, SOPs, System Maps

Ces données vivent dans des modules séparés (pas dans dashboardQueries) :

```python
CONVEX_URL = "<url>"

# Tous les processus (BUILD, ONBOARD, ACTIVATE, Sales Pipeline...)
r = requests.post(f"{CONVEX_URL}/api/query", json={"path": "processes:list", "args": {}})
processes = r.json()["value"]

# Toutes les SOPs (#1-#7 + EOD setter, debrief closer, etc.)
r = requests.post(f"{CONVEX_URL}/api/query", json={"path": "sops:list", "args": {}})
sops = r.json()["value"]

# System Maps (Acquisition AIOS, Delivery AIOS...)
r = requests.post(f"{CONVEX_URL}/api/query", json={"path": "systemMaps:list", "args": {}})
maps = r.json()["value"]
```

**Filtres disponibles** :
- `processes:listBySystem` args `{system: "Acquisition"|"Delivery"|"Operations"|"Support", project?: "AIOS"|"Cohorte"|"Incubateur"|"Transversal"}`
- `systemMaps:listByProjectSystem` args `{project, system}`
- `systemMaps:getByProjectSystem` args `{project, system}` — retourne la première
- `sops:get` args `{id}` — SOP individuelle par ID

**Structure SOP** : `_id`, `title`, `category` (Sales/Onboarding/Delivery/Marketing/Opérations/Autre), `process` (Acquisition/Delivery/Operations/Support), `project`, `status` (a_faire/actif/inactif/backlog), `content`, `checklist[]` (title+description), `faq[]` (question+answer).

**Structure Process** : `_id`, `name`, `description`, `project`, `system`, `steps[]` (id/title/description/position/sopIds[]), `edges[]` (source→target).

**URL Convex** : `/workspace/projects/client-dashboard/.env.local` → `NEXT_PUBLIC_CONVEX_URL` (pas `CONVEX_URL`). Le `CONVEX_URL` dans `/root/client-aios/.env` peut ne pas exister — toujours vérifier `.env.local` en fallback.

### Mettre à jour une roadmap cohorte depuis un call coaching (sans UI)
Quand on doit personnaliser la roadmap d'un membre après un vocal/call, utiliser aussi `references/roadmap-from-tldv-coaching-call.md` pour le pattern complet tl;dv → Convex → lien privé.

1) Identifier ou créer le student
```python
# lookup direct — ne pas supposer que Discord/wiki = Convex
requests.post(f"{CONVEX_URL}/api/query", json={
  "path": "students:getStudentBySlug",
  "args": {"slug": "jungle-agency"}
})
```
Si `null`, créer via `students:createStudent` avec `program: "cohorte"`, `status: "active"`, profil/objectifs/challenges issus du call. Si existe, `students:updateStudent`.

2) Initialiser checkpoints + phase
```python
requests.post(f"{CONVEX_URL}/api/mutation", json={
  "path": "checkpoints:initForStudent",
  "args": {"studentId": STUDENT_ID, "program": "cohorte"}
})
requests.post(f"{CONVEX_URL}/api/mutation", json={
  "path": "checkpoints:changePhase",
  "args": {"studentId": STUDENT_ID, "newPhaseNumber": 4}
})
```

3) Vérifier tasks existantes et dédupliquer par titre
```python
requests.post(f"{CONVEX_URL}/api/query", json={
  "path": "cohorteTasks:getForStudent",
  "args": {"studentId": STUDENT_ID}
})
```

4) Ajouter des tâches personnalisées contextualisées
- Utiliser `cohorteTasks:createCustom`
- Toujours renseigner: `studentId`, `checkpointId`, `phaseNumber`, `title`, `responsable`
- Ajouter `description`, `deliverable`, `resourceUrl`, `priority` quand pertinent
- Garder les tâches actionnables et business, pas un dump transcript.
```python
requests.post(f"{CONVEX_URL}/api/mutation", json={
  "path": "cohorteTasks:createCustom",
  "args": {
    "studentId": STUDENT_ID,
    "checkpointId": CHECKPOINT_ID,
    "title": "Mener 5 pre-audits en visio et capturer les transcripts",
    "phaseNumber": 2,
    "responsable": "member",
    "description": "Conduire des calls avec trame QDR",
    "deliverable": "5 transcripts + synthese pains",
    "resourceUrl": "<url>",
    "priority": "urgent"
  }
})
```

5) Générer/récupérer le lien privé à envoyer
```python
# protégé par ADMIN_BACKEND_SECRET
studentAuth:getAccessTokenForAdmin
studentAuth:generateAccessToken  # si absent
# lien: <url>>/roadmap/{slug}?token={accessToken}
```
Ne jamais écrire le token en clair dans le wiki/log. Pour un message prêt à envoyer, écrire dans `/tmp/member-roadmap-message.txt` et livrer le fichier.

6) Vérifier immédiatement
- Requery `dashboardQueries:memberDetail` et `dashboardQueries:memberPortal`
- Contrôler `student`, `checkpoints[]`, `tasks[]`, phase active, type=custom.

Notes pratiques:
- Le tri de la roadmap côté portail est `phaseNumber` puis `createdAt` (pas de drag&drop API natif).
- Si le "call de ce matin" n'est pas encore sync dans `transcriptions`, travailler depuis transcript/vocal fourni puis faire une passe 2 quand la sync arrive.
- Éviter les doublons: comparer les `title` existants avant `createCustom`.

**Initialiser la roadmap d'un nouveau membre cohorte** (checkpoints + tasks):

Flow complet : créer/màj student → init checkpoints → ressources → vue Business libre → Discord channel/message → routing CSM.

Quand operator dit “j’ai créé un salon pour X, ajoute-le au Data OS avec ressources des derniers coachings et une vue Excel libre” :
1. Chercher d’abord le membre dans Convex/Data OS: les ventes/debriefs peuvent avoir auto-créé un `students` partiel avec slug suffixé et zéro tâche. Dans ce cas, **mettre à jour l’ID existant** (`students:updateStudent` + `ficheAgence:updateFromAdmin`) au lieu de créer un doublon.
2. Chercher le salon Discord live (`SALONS AGENCES`, nom `🏛️│slug`) et récupérer `discordChannelId`; ne recrée pas le canal. Si aucun salon n’existe et qu’operator demande de le créer, créer le canal sous `SALONS AGENCES` avec permissions privées + operator/operator/Coach + membre si trouvé.
3. Créer/màj `students` avec `program: "cohorte"`, `status: "active"`, `discordChannelId`, profil placeholder si le contexte business est encore inconnu.
4. Initialiser `checkpoints:initForStudent` si aucun checkpoint.
4. Ajouter les ressources Mastermind officielles dans `student.metadata.resources` via `ficheAgence:updateFromAdmin` : le moyen le plus sûr est de cloner/merger le pack ressources d’un membre cohorte actif déjà propre (ex: `thomas-alves-do-rio`) puis d’ajouter une carte spécifique.
5. Pour la “vue Excel libre”, ne construis pas une nouvelle table si l’onglet **Business** existe déjà : ajoute une carte ressource `Vue libre — tableau de travail / “Excel” Data OS` pointant vers `/roadmap/{slug}?tab=business` et explique que l’élève y suit prospects, notes, statuts, next actions. C’est plus rapide, cohérent, et ça évite de créer une surface inutile.
6. Créer 4-5 tâches onboarding minimales : ouvrir ressources, remplir Ma Fiche, créer assets de vente, poser premiers prospects dans Business, préparer premier message de prospection.
7. Générer/récupérer le token privé `studentAuth:getAccessTokenForAdmin`/`generateAccessToken`; ne jamais afficher le token dans logs/wiki, mais tu peux l’envoyer dans le salon Discord privé du membre si c’est l’objet de l’onboarding.
8. Mettre à jour `/workspace/wiki/entities/students/cohorte-nexus-routing.json`; sinon le CSM fail-close dans le nouveau canal.
9. Créer/màj la fiche wiki élève + `wiki/index.md` + append `wiki/log.md`.
10. Envoyer le message Discord de bienvenue via API REST directe avec liens Roadmap / Ressources / Business.
11. Vérifier : `memberDetail` (`resources_count`, `checkpoints_count`, `tasks_count`), `studentAuth:verifyAccessToken`, redirect magic link qui conserve `?tab=...`, dernier message Discord.

```python
import requests, json, time, secrets

CONVEX_URL = "<url>"

# 1. Créer le student (ou update si existe déjà)
r = requests.post(f"{CONVEX_URL}/api/mutation", json={
    "path": "students:createStudent",
    "args": {
        "slug": "prenom-nom", "firstName": "Prenom", "lastName": "Nom",
        "discordChannelId": "DISCORD_CHANNEL_ID", "program": "cohorte",
        "status": "active",
        "profile": "...", "objectives": "...", "strengths": "...",
        "challenges": "...", "coachingStyle": "...",
        "enrolledAt": int(time.time() * 1000),
        "metadata": {"roadmapToken": secrets.token_urlsafe(12)}
    }
})
# ⚠️ Si "Student with slug already exists" → use updateStudent avec l'id de l'erreur:
# "already exists (id=XXXXXXXXXX). Use updateStudent instead"
# → r = requests.post(f"{CONVEX_URL}/api/mutation", json={
#     "path": "students:updateStudent",
#     "args": {"id": "THE_ID_FROM_ERROR", "firstName": "Prenom", ...}
# })

# 2. Vérifier si checkpoints existent déjà
r = requests.post(f"{CONVEX_URL}/api/query", json={
    "path": "dashboardQueries:memberDetail",
    "args": {"slug": "prenom-nom"}
})
checkpoints = r.json()["value"].get("checkpoints", [])
if not checkpoints:
    # Init checkpoints (5 phases) — seulement si pas déjà fait
    r = requests.post(f"{CONVEX_URL}/api/mutation", json={
        "path": "checkpoints:initForStudent",
        "args": {"studentId": student_id, "program": "cohorte"}
    })

# 3. Discord — trouver le canal existant ou en créer un
# Les canaux Discord suivent le pattern 🏛️│{slug}
# Vérifier dans channel_directory.json :
with open("~/.hermes/profiles/csm/channel_directory.json") as f:
    channels = json.load(f).get("platforms", {}).get("discord", [])
    matching = [c for c in channels if c.get("name","").endswith(f"│{slug}")]
    if matching:
        discord_channel_id = matching[0]["id"]
        print(f"Canal trouvé: {matching[0]['name']} (ID: {discord_channel_id})")

# 4. Envoyer message de bienvenue via Discord API
# ⚠️ Si le CSM gateway a un token lock, utiliser l'API directe :
DISCORD_TOKEN = "..."  # from ~/.hermes/profiles/csm/.env → DISCORD_BOT_TOKEN
headers = {"Authorization": f"Bot {DISCORD_TOKEN}", "Content-Type": "application/json"}
welcome_msg = f"""👋 **Bienvenue dans le Mastermind IAO, {firstName} !**

Ton espace personnel est prêt :
📋 Ta roadmap: <url>>/roadmap/{slug}
📊 Ton portail: <url>>/cohorte/{slug}
🎯 Phase 1 (Fondations) est active — consulte ta roadmap pour les premières tâches."""

requests.post(
    f"<url>}/messages",
    headers=headers, json={"content": welcome_msg}, timeout=10
)
```

### Pitfalls — ajout nouveau membre
- **Duplicate slug** : `createStudent` throw une erreur si le slug existe déjà avec l'ID existant. Utiliser `updateStudent` avec cet ID au lieu de changer le slug.
- **Checkpoints déjà initialisés** : si le student existait déjà (créé partiellement), les checkpoints peuvent déjà être `in_progress`. Vérifier via `memberDetail` avant de ré-initialiser.
- **Canal Discord** : le canal est souvent créé avant le profil Data OS. Chercher dans `channel_directory.json` par nom `🏛️│{slug}` plutôt que de recréer.
- **CSM gateway token lock** : si le gateway CSM a `error_code: discord_token_lock`, le bot ne peut pas envoyer de messages via le gateway. Fallback : appel direct API Discord `POST /channels/{id}/messages`.
- **Program field** : toujours mettre `program: "cohorte"` explicitement — sinon le membre n'apparaît pas sur `/cohorte` (filtré dans macroView).
- **Roadmap éditable membre** : ne pas patcher `/roadmap/[slug]` pour l'UI, ce fichier ne fait qu'un redirect. La vraie page est `app/cohorte/roadmap/[slug]/page.tsx`. Pour un rollout ciblé, gate par slug et utiliser les mutations existantes `cohorteTasks:update` + `cohorteTasks:submitDeliverable`; voir `references/member-roadmap-editable-portal.md`.

## tl;dv / Fathom recordings lookup (Capture OS → Data OS)

### tl;dv
- CLI: `tldv` installé globalement, clé API dans /root/client-aios/.env (TLDV_API_KEY)
- API REST peut fonctionner via `<url> avec header `x-api-key`; si REST retourne 401, utiliser le CLI `tldv` (auth différente).
- Pour vérifier "hier à 19h", ne pas se contenter du titre: convertir UTC → Europe/Paris, lister les meetings autour de la fenêtre, puis croiser avec `/workspace/raw/transcriptions/` et Convex `transcriptions:listTranscriptions`.

### Fathom (Team Member)
- Export local actuel: `/workspace/raw/fathom/api-export-2026-05-04/INDEX.md` + fichiers markdown. Il est **static**: utile pour chercher dans les appels exportés, mais pas une synch live garantie minute par minute.
- Les fichiers Fathom contiennent en frontmatter `recording_start_time`, `recording_end_time`, `recorded_by`, `share_url`. Toujours convertir les timestamps UTC en Paris avant de répondre.
- Pour un lien public Fathom partagé, le transcript peut être extrait depuis le HTML `data-page`: lire `copyTranscriptUrl` puis parser le JSON/HTML retourné. `bs4` peut manquer; utiliser `html.parser`/stdlib si besoin. Ne pas exposer les tokens de share/copy.
- Si aucun call à l'heure demandée n'apparaît dans l'export local, dire clairement: "pas trouvé dans l'export disponible" et demander le lien Fathom précis si Team Member l'a.

- Import script: ~/.hermes/scripts/tldv-import.py
- Import script: ~/.hermes/scripts/tldv-import.py
- Cron nocturne: "tl;dv Sync Nuit" à 1h UTC (deliver=local)
- Flow: tldv CLI → catégorise (sales/coaching/onboarding/interne) → push Convex webhook → auto-catégorisation IA (Gemini 2.5 Flash) → auto-linking leads/students
- Webhook endpoint: POST /transcriptions/webhook (convex/http.ts)
- State tracking: ~/.hermes/scripts/tldv-sync-state.json (delta-based, ne reimporte pas)
- Transcripts also saved locally: /workspace/raw/transcriptions/*.md (for indexing)
- Coaching calls → update student wiki pages with call context

## Convex Deploy
```bash
cd /workspace/projects/client-dashboard
export CONVEX_DEPLOY_KEY="$(grep CONVEX_DEPLOY_KEY /root/client-aios/.env | cut -d= -f2-)"
npx convex deploy --cmd "echo skip" --typecheck=disable
```
Deploy Convex BEFORE pushing to Vercel (git push triggers auto-deploy).

⚠️ **Vercel aliases**: `--prod` auto-aliases `<client-dashboard-domain>` but NOT `<client-dashboard-url>`. After deploy, run: `npx vercel alias set <new-deployment-url> <client-dashboard-url>`

## Workflow récurrent — MAJ roadmap membre après coaching

Quand operator/operator demande une roadmap membre cohorte centrée sur la “fiche” / “fiche contact-business” :
- La **Fiche Agence** (`student.metadata`) devient la source unique de vérité pour le membre : niche, business, offre, prix, pitch, assets, méthode prospection, scripts, livrables. Ne pas disperser dans Notion/Docs sauf liens collés dans la fiche.
- Si les champs n’existent pas dans l’UI, ajouter au minimum : `clarificationOffre`, `offreAncrage`, `offreAppel`, `assetsLinks`, `methodeProspection`, `scriptsProspection`, et les autoriser dans `convex/ficheAgence.ts` `MEMBER_EDITABLE_KEYS`.
- Roadmap type : accès roadmap + Ma Fiche → installation/prise en main Hermès → connecter Hermès à roadmap/fiche → remplir fiche business → clarifier offre avec exemple → distinguer offre d’ancrage/offre d’appel → produire assets et coller liens → choisir méthode prospection → rédiger scripts/cheval de Troie → envoyer copies/liens à operator/operator → réserver call validation go-to-market.
- Resources récurrentes cohorte, ordre temporel/logique à respecter : Hermès install 2026-04-15 `<url> **assets/supports de vente 2026-04-24** `<url> (carte à mettre avant offre, avec SOP `<url> + exemples `<url>), offre d’ancrage 2026-04-27 `<url> (seulement replay + deck offre; ne pas dupliquer les assets), prospection 2026-05-01 `<url> prospection multi-angles 2026-05-08 `<url>
- Portail membre cohorte: l’onglet `Ressources` vit entre `Ma Fiche` et `Business` dans `app/cohorte/roadmap/[slug]/page.tsx`. Il lit `student.metadata.resources[]` (`title`, `url`, `description`, `category`, `type`, `links[]`) + fallback `assetsLinks[]`, et affiche aussi les `coachingCalls`. Seeder les ressources d’un membre via `ficheAgence:updateFromAdmin` avec `metadata.resources`; pas besoin de changement schema Convex car `students.metadata` est flexible. Pour éviter les ressources dispersées, utiliser une carte par coaching avec `links[]` pour mettre replay + deck + transcript/supports dans le même rectangle; garder `url` comme lien principal/fallback. Quand operator demande “dans sa fiche, ajoute la section ressources” ou signale que les ressources “ne se voient pas”, ne te contente pas de l’onglet `Ressources`: afficher aussi un bloc résumé des mêmes ressources sous `Ma Fiche`, juste après `FicheAgenceEdit`, pour que l’élève voie les liens pendant qu’il complète sa fiche business.
- Quand operator demande d’enrichir les ressources avec “les documents/templates vus dans Discord”, scanner les canaux live via le token CSM: `📚│ressources`, `📢│annonces-coaching`, `cohorte`, `SALONS AGENCES`, et `SALONS PRIVÉS`. Extraire liens/attachments contenant `template|modèle|doc|pitch|deck|script|audit|maquette|offre|prospection|fiche|vente`, puis curer: ressources officielles + exemples élèves réutilisables. Éviter de mettre des URLs CDN Discord éphémères comme source long terme; préférer Notion/Google Docs/Canva/Vercel/Lovable/Fathom/tl;dv/Skool, ou publier proprement un fichier si nécessaire. Pour appliquer à toute la cohorte, merger les ressources communes dans chaque `student.metadata.resources` via `ficheAgence:updateFromAdmin` sans écraser les ressources personnalisées.
- Nettoyage ressources Cohorte validé par operator: ne pas afficher les exemples élèves isolés `ExampleAgencyA`, `ExampleAgencyB`, `ExampleAgencyC`, ni le tracker `Challenge 90 jours — closer des offres IA` / `clientops-sales-tracker...` dans les cartes ressources membre. Garder plutôt le hub central `Bibliothèque d’exemples outils de vente` dans la carte **Assets & supports de vente**. Quand ces éléments existent déjà, les retirer de tous les `students.metadata.resources` actifs via `ficheAgence:updateFromAdmin`, puis vérifier `0 occurrence` et un count homogène.
- Ne pas déployer une modification UI si le repo contient beaucoup de changements non liés sans validation explicite : build local OK ne veut pas dire prod-safe.
- Pour déployer/tester une petite modification UI sur la roadmap membre depuis un repo sale, utiliser un worktree isolé : `git worktree add --detach /tmp/client-dashboard-<feature> HEAD`, appliquer uniquement le patch ciblé, puis build. Si le worktree n’a pas ses dépendances, symlinker `node_modules` depuis `/workspace/projects/client-dashboard` pour le build local (`ln -s .../node_modules /tmp/.../node_modules`).
- Avant `vercel deploy` depuis un worktree, copier `.vercel/project.json` et `.vercel/.env.production.local` du projet canonique, sinon Vercel peut créer un nouveau projet sans env vars et crasher avec `No address provided to ConvexReactClient`. Ne pas exposer les secrets copiés.
- Quand `studentAuth:getAccessTokenForAdmin` est utilisé, la réponse est un objet `{ accessToken, accessTokenCreatedAt, slug }` — extraire `value.accessToken`, ne pas concaténer l’objet entier dans l’URL.
- Pour vérifier un magic link roadmap, un simple `requests.get` peut être insuffisant : le middleware vérifie `?token=...`, pose le cookie membre puis redirige vers l’URL propre. Utiliser Playwright/Chromium pour confirmer le rendu client, l’onglet actif (`?tab=ressources`) et les titres/links visibles. Toujours masquer le token dans les logs/réponses et livrer le lien via fichier `/tmp/...txt`.

Quand un coach demande de "mettre à jour la roadmap" d’un membre cohorte après un call:

1) Identifier le member slug dans Convex (`dashboardQueries:macroView` puis `dashboardQueries:memberDetail`).
2) Vérifier checkpoints + tasks existantes avant toute mutation.
3) Mettre à jour les statuts des tâches déjà prouvées par le call (ex: call de clarté = `completed`).
4) Ajouter/mettre à jour les `resourceUrl` sur les tâches clés (fondations, pré-audit, docs de vente, replay call).
5) Créer des tâches custom ciblées via `cohorteTasks:createCustom` (priorité `urgent` si action immédiate).
6) Vérifier post-mutation via `dashboardQueries:memberDetail` (ne jamais supposer que c’est passé).
7) Envoyer un message Discord dans le canal privé du membre avec:
   - lien roadmap privé tokenisé (`/roadmap/{slug}?token=...` sur `<client-dashboard-domain>`)
   - top 3-4 priorités immédiates
   - livrables attendus (ex: transcripts, shortlist prospects)

### Notes pratiques
- Les appels Discord API directs (`POST /channels/{id}/messages`) sont fiables pour un envoi immédiat.
- Si un cron one-shot est utilisé pour notifier, vérifier l’exécution réelle; en cas de latence, fallback en envoi API direct.
- S'il existe plusieurs `ADMIN_BACKEND_SECRET` dans différents `.env`, ne pas prendre le premier au hasard. Tester `studentAuth:getAccessTokenForAdmin` avec le secret candidat sans afficher la valeur; en pratique `/workspace/projects/client-dashboard/.env.local` est souvent la source valide pour les tokens roadmap.

## Workflow récurrent — planifier des blocs Deep Work AIOS dans Google Agenda

Quand operator demande par vocal de créer les tâches importantes pour demain/dimanche sur la delivery, le tunnel d’acquisition, ou “avec AIOS”:

1. Charger aussi `google-workspace` et lire l’agenda existant des jours concernés avant création.
2. Grounder le contenu dans le Data OS, pas dans du conseil générique:
   - Delivery AIOS = process `ONBOARD — Cadrage & Audit`, `BUILD — Installation AIOS`, `ACTIVATE — Formation & Monitoring`.
   - SOPs clés = #6 audit technique, #7 questionnaire onboarding, #1-5 build/validation, checklist onboarding client.
   - Acquisition AIOS = `Sales Pipeline`, EOD setter, debrief closer, Ads → Typeform → RDV → show-up → closing → paiement.
3. Créer des blocs “Deep Work” courts et exécutables avec:
   - Objectif business du bloc.
   - Sous-tâches numérotées.
   - “Comment faire avec AIOS/Data OS”.
   - Output obligatoire à la fin du bloc.
4. Sur jour de voyage, ne pas remplir chaque trou: préserver les blocs logistiques, vol, fatigue, timezone destination. Pré-flight = timezone départ; post-arrival = timezone destination.
5. Résumé final: horaires + intitulés, pas de dissertation.

## Workflow récurrent — brief matin cash / calls / War Map

Quand operator/operator demande de modifier les briefs du matin, ou quand un job morning brief doit être créé/patché, le format attendu n'est pas un digest wiki générique. Le brief doit réduire le bruit et protéger le focus cash/acquisition.

Structure obligatoire:
1. **Objectifs de la journée** — 3 à 5 actions concrètes, avec le premier bloc réservé aux 4 premières heures: personal brand agentique / aGaaS.
2. **Calls du jour** — total + liste courte heure Europe/Paris, nom/prospect, type, owner/closer, source, signal qualité si disponible.
3. **Stats de la veille** — cash encaissé, cash contracté, ventes, RDV bookés, show-up/no-show, calls pitchés, leads/conversations, contenus organiques publiés. Ne jamais inventer: écrire `non renseigné Data OS` si absent.
4. **Actions cash / acquisition** — podcasts, YouTube, LinkedIn, preuves vidéo, collaborations, conversations qualifiées.
5. **Phrase de guerre** — rappeler le cap: trafic organique gratuit via podcasts + YouTube + LinkedIn → cashflow → environ 40k€ de réserve → attaque du big market webinaire.

Sources à croiser: Data OS/Convex (`dailyKpis:getKpisRange`, `rdv:listRdvByDateRange`, `ventes:listVentesByDateRange`), Google Calendar, Calendly, iClosed live si nécessaire. Pas de tableau Telegram; format court, dense, tutoiement.

## Workflow récurrent — recap commercial hebdo / semaine à date

Quand operator/operator demande un “recap commercial de la semaine, fin de hier”, les “appels Team Member aujourd’hui”, ou pourquoi un RDV annoncé par Discord n’apparaît pas dans un calendrier, utiliser **Data OS + Calendly + iClosed live**, pas GHL en premier.

1) Définir la période en Europe/Paris:
- “semaine à date, arrêté hier” = lundi de la semaine courante → hier inclus.
- Si on est mardi, ça couvre uniquement lundi.
- Si ambigu, produire aussi une mini-note “si tu voulais 7 jours glissants”.

2) Query Data OS live:
```python
POST {CONVEX_URL}/api/query {"path":"rdv:listRdvByDateRange","args":{"from":FROM_MS,"to":TO_MS},"format":"json"}
POST {CONVEX_URL}/api/query {"path":"ventes:listVentesByDateRange","args":{"from":FROM_MS,"to":TO_MS},"format":"json"}
POST {CONVEX_URL}/api/query {"path":"dailyKpis:getKpisRange","args":{"from":"YYYY-MM-DD","to":"YYYY-MM-DD"},"format":"json"}
```

3) Pour les appels du jour / Team Member ou une alerte Discord suspecte:
- Requête Data OS `rdv:listRdvByDateRange` sur la journée.
- Requête Calendly `/scheduled_events` + invitees sur la même fenêtre si le RDV vient d’un calendrier Calendly.
- Requête iClosed live `<url> avec `ICLOSED_API_KEY` et `User-Agent` explicite. Ne pas utiliser `api.iclosed.io` nu: DNS/host incorrect dans notre setup; le base URL validé est `public.api.iclosed.io/v1`.
- Croiser par closer/host si le champ Data OS est `unknown`.
- Si Discord annonce un booking qui n’existe ni dans Data OS, ni Calendly, ni iClosed, répondre que l’alerte vient probablement d’une source/bot désynchronisé — ne pas traiter l’alerte comme source de vérité.

4) Réponse attendue — courte, opérationnelle:
- Période exacte.
- RDV bookés par source si disponible (`rdvBookedSetter`, `rdvBookedInbound`, `rdvFromSkoolTriage`).
- Si l'utilisateur demande les **RDV fixés/bookés** sur une période, compter les RDV dont `calendlyScheduledAt` / `createdAt` / `_creationTime` tombe dans la période, pas seulement les RDV dont `dateRdv` tombe dans la période. Donner séparément le nombre de RDV qui **ont lieu** sur la période si utile.
- Show-up, pitches, ventes, cash contracté, cash encaissé, taux cash encaissé.
- Liste des RDV importants avec heure + nom + statut.
- Signal qualité si `closer=unknown`, débriefs absents, ou mismatch Data OS/iClosed.

### Qualité des RDV à venir — check rapide avant call
Quand operator demande “la qualité des rendez-vous demain / qu’il va voir demain”, ne réponds pas juste le nombre: fais une lecture qualité RDV-first.
1. Définir demain en Europe/Paris, puis croiser **Data OS `rdv:listRdvByDateRange` + Google Calendar + iClosed live** sur la journée.
2. Si le RDV vient de Calendly, récupérer l’event + les invitees via Calendly API (`/scheduled_events/{uuid}` puis `/invitees`) pour confirmer host, email, téléphone, Q&A, UTM, statut actif/cancelled. Ne pas se contenter du calendrier Google.
3. Chercher l’historique dans Data OS avant de juger: `crm:listContacts` par email/domaine/nom/téléphone et `callDebriefs:searchLeads` si l’ancien lead store existe encore.
4. Signal externe rapide si utile: domaine email/site (`<url>) pour détecter site vide, page parking, business clair, preuve marché. Ne pas sur-analyser ni inventer.
5. Scorer verbalement, pas avec une fausse précision:
   - **Bon signal**: Q&A rempli, source/UTM claire, historique qualifié, business visible, offre/CA/problème explicite.
   - **Moyen**: contact identifiable mais peu de contexte, quelques signaux business.
   - **Faible / à qualifier strictement**: aucune Q&A, aucun UTM, aucun historique, domaine vide/parking, nom masqué ou source inconnue.
6. Donner une recommandation closer: ex. “qualification stricte 10 premières minutes; pas de pitch si business/CA/offre flous”. C’est plus utile qu’une note molle.

5) Statut paiement / vente — ne pas inventer:
- `callDebriefs.result="vente"` déclenche `finalizeVenteFromDebrief` et doit créer/patcher une ligne `ventes` + transactions.
- `callDebriefs.result="pas_de_vente"` avec `raisonNonVente="suivi_prevu"` signifie follow-up/paiement potentiel, pas vente signée. Si le paiement est “prévu” ou l’intégration “à venir”, répondre comme `paiement à suivre` jusqu’à confirmation.
- Pour vérifier un cas précis: `rdv:listRdvByDateRange`/search variants → `callDebriefs:listByRdvId` → `ventes:getVenteForRdv` → `transactions:listTransactionsByVente`.

Pitfalls:
- Ne pas utiliser GHL si le token/scope bloque: depuis kill-leads, Data OS suit l’activité **RDV → debrief → ventes** et GHL reste seulement CRM amont.
- `rdv` peut contenir des RDV de test (ex: “operator TEST”) sur 7 jours glissants; les signaler au lieu de gonfler le bilan.
- iClosed `/v1/eventCalls` accepte `eventType=PAST|UPCOMING|ALL`; `CANCELLED` renvoie 400. Les annulations sont à repérer dans Data OS (`cancelledAt`) ou via `ALL` + champs d’état si exposés.

## Workflow récurrent — nettoyer les fausses alertes dashboard

Quand le dashboard affiche des alertes bruitées/faux positifs, faire une purge propre en base Convex.

1) Vérifier la surface API publique
- Charger `GET /api/agent/openapi.json` et confirmer que `/api/agent/alerts` expose seulement GET (liste open) + POST (création).
- Ne pas supposer un endpoint REST de dismiss s’il n’est pas dans la spec.

2) Passer par Convex mutations (source de vérité)
- Interroger `alerts:getOpenAlerts` pour récupérer les IDs ouverts.
- Dismiss en boucle via `alerts:dismissAlert` (args `{ id }`).
- Requêter `alerts:getOpenAlerts` après purge pour confirmer `0`.

3) Validation minimale obligatoire
- Logguer: `OPEN_ALERTS_BEFORE`, `DISMISSED`, `OPEN_ALERTS_AFTER`.
- Exemple attendu après nettoyage: `OPEN_ALERTS_AFTER=0`.

4) Important (anti-récidive)
- Si le générateur d’alertes n’est pas corrigé, les faux positifs reviennent.
- Après purge, prévoir un patch des règles de génération (seuils/check-in, fenêtres temporelles, dedup).

## Delivery System — Value Engine (référence actuelle)

### AI Profit Map / Delivery départemental — définition validée operator

Pour les cartes AI Profit Map et breakdowns départementaux AIOS, **Onboarding + Délivrabilité + Support vont dans un seul département : Delivery**. Ne pas les présenter comme trois départements séparés sauf demande explicite.

Process/phases Delivery validés :
1. **AI Audit** — Onboarding, Department Breakdown, Human Org Chart, Role Breakdown, Time Audit, Full ROI Audit, Bottleneck / Money Leak Map.
2. **Agent Org & Priorisation** — AI Profit Map, Agent Org Chart, scoring des agents par Ease / Impact / Effectiveness, CDC, rapport de priorisation, sélection des 3–5 premiers agents.
3. **Build des agents** — R&R Docs par agent, Knowledge Base, Pillared Buildout Plan, QA / Testing / Human Layer, Permission / Access Control, Escalation Logic, Delivery commerciale finale.
4. **Internal Capability & Ongoing Support** — placer quelqu’un en interne, former/manager quelqu’un, ou rester en fractional team ; support mensuel, identification continue des nouveaux process à automatiser, build continu, business consulting.

Règle de naming : un process est un flux input → transformation → output mesurable. Éviter les faux process qui sont seulement des tâches/capacités (`Création contenus`, `Build setup`, `Monitoring usage`) et les reformuler en flux business pilotables (`Lead Capture & Attribution`, `Post-Signature Intake`, `QA & Acceptance`, etc.).

### Documents financiers internes liés à la delivery
Quand operator/operator demande de documenter une grille de rémunération delivery / marge / commissions dans le Data OS, **ne pas la mettre dans une SOP opérationnelle visible par développeurs/intégrateurs**. Créer ou mettre à jour un document Docs AIOS admin-only avec un titre explicite `[ADMIN] ...`, et préciser dans le contenu les droits d'accès.
- Pattern validé: `docs:getBySlug` puis `docs:create`/`docs:update` sur slug `admin-remuneration-delivery-rms`, section `sop`, icon `lock`.
- Accès textuel à écrire: operator + operator uniquement; operator doit être libellé **associé collaborateur / admin**, pas “R1”.
- Accès interdit à écrire: développeurs, intégrateurs externes, freelances delivery, setters/closers hors validation explicite.
- Toujours formuler la rémunération sur **cash réellement collecté**, jamais sur signé/facturé/promis.
- Grille actuelle AIOS RMS: ticket 5K, delivery plafonnée à 800€ = 16% du cash collecté; si paiement 2x2 500€, débloquer 400€ delivery par tranche; closer 10% cash collecté; setter 3% standard jusqu’à 5% bonus; part associé 10% du profit net après delivery+closer+setter; marge nette observée ≈ 62–64%.
- Ne pas promettre “70% net après tout” avec closer+setter+associé: l’expliquer comme marge brute élevée après delivery ou objectif de pilotage, sinon c’est mathématiquement faux.

System Map "Delivery AIOS — Process unique" (ID: r17062m6vgde7skjbnbfmcarnd84rktb) — modèle simplifié pour recruter des intégrateurs et éviter l’usine à gaz :
- **1 seul process** : `Delivery Client AIOS — Signature → Autonomie` (créé en 2026-05, 9 étapes : signé → onboarding → audit → GO build → build → recette → validation → live/monitoring).
- **4 SOPs vitales uniquement** : onboarding/collecte accès, audit/cadrage, build MVP, recette/mise live/handoff.
- **Pipe client dans `/clients`** : `pre_onboarding`, `onboarding`, `audit`, `build`, `validation`, `live`, `maintenance`.
- **Champs clients Delivery** : `deliveryStage`, `deliveryOwner`, `kickoffAt`, `targetLaunchAt`, `blocker`, `livrables[]` (`title`, `status`, `owner`, `url`, `dueAt`, `notes`).
- Règle de fond : le process mappe le flux, les SOPs n’existent que là où l’erreur coûte cher. Une prochaine action et un blocage visible valent mieux que dix documents que personne ne suit.

- **Pipe Delivery UX**: `/clients` doit être un cockpit de livraison, pas un Trello miniaturisé. Si operator/operator dit que les étiquettes ne se voient pas ou que c’est tassé, regrouper la vue défaut en 5 zones (`À cadrer`, `Build actif`, `Bloqués`, `À valider`, `Live / suivi`), garder les 7 étapes détaillées en filtres, ajouter `À traiter aujourd’hui`, et grossir les cartes/badges autour de: client, prochaine action, owner, valeur, livrables, blocage, échéance. Vérifier via screenshot local + prod sur `<client-dashboard-url>/clients` après alias.

SOP endpoint : `/api/agent/sop` — CRUD complet.

### Refonte Delivery AIOS — workflow sûr
Quand operator/operator demande de structurer la délivrabilité client AIOS :
1. Auditer d’abord `processes:list`, `sops:list`, `systemMaps:list`, `clients:listClients`; ne jamais recréer sans regarder Data OS.
2. Sauvegarder les process/SOP/systemMaps concernés dans `/workspace/outputs/aios-delivery-refonte-backup-YYYYMMDD-HHMMSS.json` avant suppression/remplacement.
3. Remplacer les anciens process Delivery éclatés par un process unique si l’objectif est recrutement/exécution à la lettre.
4. Garder seulement les SOPs vitales ; supprimer/archiver les doublons qui fragmentent l’exécution.
5. Déployer Convex avant Vercel quand le schema client change, puis vérifier Convex live + build + alias prod.
6. Après un `vercel deploy --prod`, réassigner aussi `<client-dashboard-url>` si nécessaire : l’alias utilisateur ClientOps peut rester stale sinon.

## Trouver les bonnes fonctions Convex (CRITICAL)

**NE JAMAIS deviner les noms de fonctions.** Toujours lire le code source :
```bash
grep -r "export const" /workspace/projects/client-dashboard/convex/*.ts
```

Les noms de fonctions Convex suivent le pattern `module:functionName` où `module` = nom du fichier `.ts` (sans extension). Exemples vérifiés :
- `convex/processes.ts` → `processes:list`, `processes:get`, `processes:listBySystem`, `processes:saveGraph`
- `convex/sops.ts` → `sops:list`, `sops:get`, `sops:update`, `sops:setStatus`
- `convex/systemMaps.ts` → `systemMaps:list`, `systemMaps:getByProjectSystem`
- `convex/dashboardQueries.ts` → `dashboardQueries:macroView`, `dashboardQueries:memberDetail`, `dashboardQueries:globalKpis`

**URL Convex** : `<url> (depuis `NEXT_PUBLIC_CONVEX_URL` dans `.env.local`)

## CRUD Operations — Mettre à jour SOPs, Processus, Clients

### Mettre à jour une SOP (contenu + checklist)
```python
r = requests.post(f"{CONVEX_URL}/api/mutation", json={
    "path": "sops:update",
    "args": {
        "id": "SOP_DOC_ID",
        "content": "nouveau contenu markdown",
        "checklist": [
            {"title": "Étape 1", "description": "Description Manuel — ..."},
            {"title": "Étape 2", "description": "Description"}
        ]
    }
})
```
Champs optionnels de `sops:update`: `title`, `category`, `content`, `project`, `process`, `status`, `purpose`, `whenFollowed`, `whenNotFollowed`, `inputs[]`, `outputs[]`, `checklist[]`, `faq[]`, `skills[]`.

### Mettre à jour un Processus (steps + edges)
```python
# Pour changer description/name uniquement:
r = requests.post(f"{CONVEX_URL}/api/mutation", json={
    "path": "processes:update",
    "args": {"id": "PROCESS_ID", "description": "nouvelle description"}
})

# Pour remplacer steps+edges (graph complet):
r = requests.post(f"{CONVEX_URL}/api/mutation", json={
    "path": "processes:saveGraph",
    "args": {
        "id": "PROCESS_ID",
        "steps": [{"id": "step-1", "type": "process", "title": "...",
                   "description": "...", "position": {"x": 50, "y": 200},
                   "sopIds": ["SOP_ID"]}],
        "edges": [{"id": "e1", "source": "step-1", "target": "step-2"}]
    }
})
```
⚠️ `saveGraph` REMPLACE tout — toujours récupérer le graph actuel d'abord via `processes:get`, modifier, puis envoyer le tout.

### Mettre à jour un Client dans Data OS

Pour un nouveau client AIOS issu d'un audit externe (Notion/Genspark/tl;dv/Lucidchart), suivre aussi `references/aios-client-dossier-intake.md`: vérifier `clients:getClient` avant création, attacher les documents en `content` inline, puis produire une synthèse MVP brainstorm-ready avant tout CDC.

⚠️ **Client lookup — ne pas utiliser `dashboardQueries:macroView` pour conclure qu'un client n'existe pas.** `macroView` couvre surtout la vue dashboard/membres et peut ne pas exposer les clients AIOS. Pour vérifier un client, interroger le module dédié :
```python
# Liste clients AIOS
requests.post(f"{CONVEX_URL}/api/query", json={"path": "clients:listClients", "args": {}})

# Fiche client par slug — ex: example-immo
requests.post(f"{CONVEX_URL}/api/query", json={"path": "clients:getClient", "args": {"slug": "example-immo"}})
```
Si le slug est incertain, liste `clients:listClients` puis cherche par `name/contact/tags` avant de créer une fiche. Cette erreur a déjà failli faire traiter Example Client comme absent alors qu'il était signé avec CDC + deck attachés.

```python
# Update status/context/next action
r = requests.post(f"{CONVEX_URL}/api/mutation", json={
    "path": "clients:updateClient",
    "args": {
        "slug": "example-client",
        "status": "build",
        "statusMarkdown": "# Statut\n...",
        "nextAction": "prochaine action"
    }
})

### Ajouter/remplacer des documents client-facing

Quand un hub/deck/CDC/Data OS est refait, ne pas juste ajouter la nouvelle version en plus de l’ancienne : supprimer ou clairement superséder les anciens documents client-facing pour éviter que l’équipe présente la mauvaise V1.

```python
# 1) Lister la fiche
client = requests.post(f"{CONVEX_URL}/api/query", json={
    "path": "clients:getClient",
    "args": {"slug": "example-client"}
}).json()["value"]

# 2) Supprimer les docs obsolètes par index, en ordre décroissant
for index in sorted(indices_to_remove, reverse=True):
    requests.post(f"{CONVEX_URL}/api/mutation", json={
        "path": "clients:removeDocument",
        "args": {"slug": "example-client", "index": index}
    })

# 3) Ajouter la nouvelle version
r = requests.post(f"{CONVEX_URL}/api/mutation", json={
    "path": "clients:addDocument",
    "args": {
        "slug": "example-client",
        "name": "Bootstrap Hermes — Atlas",
        "type": "other",  # cdc|notes|deck|transcript|other
        "url": "<url>"
    }
})
```

### Ajouter un document AVEC contenu inline (markdown lisible dans le dashboard)
Le champ `content` est optionnel — si fourni, le document est cliquable dans l'onglet Documents et déploie le markdown inline.
```python
with open("/path/to/bootstrap.md") as f:
    content = f.read()

r = requests.post(f"{CONVEX_URL}/api/mutation", json={
    "path": "clients:addDocument",
    "args": {
        "slug": "example-client",
        "name": "Bootstrap Hermes — Atlas (COO IA)",
        "type": "other",
        "content": content  # markdown inline, dépliable dans le dashboard
    }
})
```
⚠️ Ne jamais passer `content: null` — si pas de contenu, omettre le champ entièrement (Convex rejette null sur v.optional(v.string())).
```
Client status values: `prospect`, `cdc`, `signed`, `build`, `live`, `paused`, `archived`.

## Daily KPI Form — Per-Member Breakdown Pattern

When the team needs to fill daily KPIs with both global data and per-member breakdowns (Setting/Triage/Sales), use this pattern:

### Schema (dailyKpis table)
Add new marketing fields + `team: v.optional(v.any())` for per-member data:
```typescript
// Marketing (global)
adSpend: v.optional(v.number()),
newFollowersIg: v.optional(v.number()),
newSubscribersYtb: v.optional(v.number()),
postsIg: v.optional(v.number()),
videosYtb: v.optional(v.number()),
stories: v.optional(v.number()),
// Per-member: { team-member: { setting_dm_sent: 45, ... }, team-member: { ... } }
team: v.optional(v.any()),
```

### Mutation — updateMemberKpi
Patches only one member's section without touching others or global data:
```typescript
export const updateMemberKpi = mutation({
  args: { date: v.string(), member: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("dailyKpis")
      .withIndex("by_date", (q) => q.eq("date", args.date)).first();
    const currentTeam = (existing?.team as Record<string, unknown>) ?? {};
    const updatedTeam = {
      ...currentTeam,
      [args.member]: { ...(currentTeam[args.member] ?? {}), ...args.data },
    };
    if (existing) {
      await ctx.db.patch(existing._id, { team: updatedTeam, submittedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("dailyKpis", { date: args.date, team: updatedTeam, submittedAt: Date.now() });
  },
});
```

### Aggregation — computeMemberDerived
```typescript
function computeMemberDerived(member: Record<string, number | undefined>) {
  const safe = (n: number | undefined) => n ?? 0;
  const div = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) / 100 : 0);
  return {
    conversionSettingBook: div(safe(member.callsBooked), safe(member.dmSent)) * 100,
    showRate: div(safe(member.callsPresent), safe(member.callsBooked)) * 100,
    closeRate: div(safe(member.dealsClosed), safe(member.callsPresent)) * 100,
    cashPerCall: div(safe(member.cashCollected), safe(member.callsPresent)),
  };
}
```

### Form Page Structure
- Date navigation (prev/next arrows + "Aujourd'hui" button)
- Global Marketing section (team-wide)
- Per-member sections (Team Member/Team Member/Team Member) with subsections: Setting, Triage, Sales
- Pre-fill from existing data, always editable (last write wins)
- `/kpis/saisie?date=YYYY-MM-DD` for any date

### Dashboard principal — filtres de période qui changent vraiment les chiffres

Quand le sélecteur du dashboard principal (`7j` / `30j` / `Mois` / personnalisé) ne change pas les KPIs, ne pas patcher au hasard `dashboardQueries:globalKpis` en premier. Le module Convex peut avoir des erreurs TypeScript historiques/legacy qui bloquent `npx convex codegen` ou un deploy Convex même si ton changement est correct.

Pattern sûr validé:
1. Inspecter `app/page.tsx` : si le state `range` n'est utilisé que par le composant `Segment`, c'est un bouton décoratif.
2. Réutiliser une query déjà déployée quand possible : `dailyKpis:comparePeriods` accepte `{ from1, to1, from2, to2, business }` et retourne `period1.totals`.
3. Calculer côté frontend les bornes:
   - `7j` = aujourd'hui inclus + 6 jours précédents
   - `30j` = aujourd'hui inclus + 29 jours précédents
   - `Mois` = du 1er du mois à aujourd'hui
   - `Perso` = deux inputs `type="date"`
4. Mapper les cartes dashboard depuis `period1.totals`:
   - `cashCollecte`
   - `cashContracte`
   - RDV = `rdvBookedSetter + rdvBookedInbound + rdvFromSkoolTriage`
   - ventes = `ventes` ou fallback `dealsClosed`
5. Garder `dashboardQueries:globalKpis` pour les stocks/all-time qui ne sont pas naturellement périodiques: membres actifs, alertes ouvertes, paiements en retard.
6. Vérifier via API Convex live avant/après avec `dailyKpis:comparePeriods` sur 7j vs 30j; les valeurs doivent différer si la donnée existe.

Pitfall: `npx convex codegen` peut lancer un typecheck serveur et échouer sur des fichiers legacy (`leadId` supprimé, `leads` table retirée, etc.). Si tu peux résoudre le besoin avec une query Convex déjà déployée, évite un deploy backend inutile.

### Adding New EOD KPI Fields (checklist)

Quand on ajoute des champs au formulaire EOD `/kpis/saisie`:

1. **Schema** → `convex/schema.ts` (table `dailyKpis`): ajouter `myField: v.optional(v.number())` (ou `v.string()` pour texte)
2. **Mutation** → `convex/dailyKpis.ts` (args de `createOrUpdateDailyKpi`): même champ + même type
3. **Aggregation** → `convex/dailyKpis.ts` (tableau `NUMERIC_KEYS`): ajouter la clé si c'est un nombre à agréger
4. **Frontend** → `app/kpis/saisie/page.tsx`:
   - Ajouter le champ dans un tableau de fields existant (`MARKETING_FIELDS`, `OUTREACH_FIELDS`, `FUNNEL_FIELDS`) ou créer un nouveau tableau
   - Si nouveau tableau: ajouter une section `<div>` dans le JSX (même pattern que les autres sections)
   - Si le formulaire pré-remplit depuis `existingKpi`, inclure les nouveaux fields dans la boucle de prefill (`ALL_NUMERIC_FIELDS` ou équivalent), sinon l'édition d'une date existante semble “perdre” les données
   - Pour un champ texte (ex: topObjection): state séparé `useState`, ajout au `payload` dans `handleSubmit`, préfill dans `useEffect`
5. **Dashboard KPI** → `app/kpis/page.tsx`: ajouter les champs dans la vue jour + agrégats semaine/mois si l'utilisateur veut les voir dans DataWise, pas seulement les saisir
6. **Build** → `npx next build` (vérifier 0 erreurs)
7. **Deploy Convex** → `npx convex deploy --cmd "echo skip" --typecheck=disable`
8. **Deploy prod** → `npx vercel deploy --yes --force --prod`, puis réassigner l'alias secondaire si nécessaire:
   `npx vercel alias set <deployment-url> <client-dashboard-url>`
9. **Smoke test Convex** → upsert une date future via `dailyKpis:createOrUpdateDailyKpi`, re-query `dailyKpis:getDailyKpi`, puis supprimer avec `dailyKpis:deleteDailyKpi`

⚠️ Toujours deployer Convex AVANT Vercel — le schema doit être à jour avant que le frontend ne tente d'écrire les nouveaux champs.

### Workflow récurrent — EOD Delivery Incubateur via note vocale Hamza

Quand operator demande de mesurer l’“IOD/EOD delivery” de Hamza ou l’activité incubateur:
- Terme interne: répondre **EOD**, pas IOD.
- Champs Data OS validés dans `dailyKpis`: `deliveryClarityCalls`, `deliveryIncubatorReplies`, `deliveryRoadmapUpdates`, `deliveryBlockersResolved`.
- Surface de saisie: `/kpis/saisie`, section **Delivery Incubateur — Hamza**.
- Surface de lecture: `/kpis`, section **Delivery Incubateur** + agrégats semaine/mois.
- Rappel opérationnel: Telegram à Hamza tous les soirs **19h Paris** pour envoyer une note vocale 30–60s.
- Trame vocale à demander:
  1. calls de clarté réalisés
  2. personnes répondues dans l’incubateur
  3. roadmaps / fiches mises à jour
  4. blocages élèves résolus
  5. élèves à risque / points chauds
  6. next steps pour demain
- Important: la première version peut être “rappel + traitement par agent” sans full auto; pour automatiser de bout en bout, il faut brancher vocal Telegram → transcription → mutation Convex.

### Pitfalls
- Use `v.any()` for team field — Convex schema doesn't support dynamic object keys easily
- `aggregateTeam()` must iterate all days then merge by member name
- Keep legacy fields (newFollowers, reelsPosted, etc.) for backward compatibility with existing KPI dashboard
- Champs texte (v.string()) ne vont PAS dans NUMERIC_KEYS — seulement les nombres

## Workflow récurrent — Outbound Instagram AIOS dans le Data OS

Quand operator/operator demande de créer ou corriger le process Outbound Instagram, opérer dans Data OS → Processes → Acquisition → `Ressources extérieures — Outbound Instagram` plutôt qu’en fichier isolé. Le lien utilisateur doit utiliser le domaine préféré par operator : `<url>>/sop?sop=<SOP_ID>` (ne pas envoyer `<client-dashboard-domain>` par défaut pour ClientOps Data OS).

Pattern validé :
1. Créer/mettre à jour un process AIOS/Acquisition nommé `Ressources extérieures — Outbound Instagram`.
2. Structurer en SOPs liées :
   - `Outbound Instagram — ICP & critères visuels`
   - `Outbound Instagram — Scripts DM par ICP`
   - `Outbound Instagram — EOD quotidien`
3. La ressource doit être **user-friendly et copier-coller**, pas seulement une SOP : intro stratégique, objectif du setting outbound, règles de marque operator, ICP général, exclusions, scripts par ICP, follow-ups, fiche prospect, checklist avant envoi. Si operator dit que la mise en forme est “dégueulasse”, traiter ça comme un bug produit: rendu Notion-like obligatoire (vrais titres, spacing, listes lisibles, cartes scripts/code, hiérarchie simple), pas un markdown brut `whitespace-pre-wrap`.
4. Pour une proposition à valider ou un export de SOP outbound, ne pas livrer uniquement `.md` ni `.docx` : operator ne lit pas le markdown et n’utilise pas Word. Livrer par défaut un **PDF** ou une page web lisible, idéalement générée via HTML + Chrome headless (`google-chrome --headless --print-to-pdf=...`). Le `.md` peut rester source interne, pas format final utilisateur.
5. Les critères ICP doivent être **visuels et vérifiables sur le profil**, pas des critères internes inconnus : coche bleue, témoignages clients, screenshots résultats, cas clients, CTA call/VSL/webinaire/audit, highlights, équipe visible (CSM/setters/closers/coachs/media buyer), recrutement, outils visibles (Skool/Discord/Notion/Slack/GHL/Circle), contenu récent, audience engagée, positionnement premium/B2B/high-ticket.
6. Pour une **liste de prospects à DM en outbound**, rester strictement collé à l’ICP donné dans la SOP/le brief. Ne pas élargir par opportunisme à “toutes les agences”, au SaaS pur, aux outils, ou aux business vaguement B2B. Une agence n’entre que si elle vend un service avec delivery complexe et signaux humains (clients, reporting, account managers, équipe, relances). Un SaaS pur est exclu sauf s’il est aussi porté par un fondateur vendant un accompagnement high-ticket DM-able. Si le prospect ne permet pas d’écrire un DM contextualisé sur élèves/clients/delivery/sales ops, il ne va pas dans la liste finale.
7. Quand la SOP Outbound est fournie comme source, l’utiliser pour produire un **brief de scraping exploitable** : ICP acceptés, exclusions strictes, signaux obligatoires, scoring, requêtes de recherche, colonnes CSV, `dm_angle` et `first_dm_template`. Les outputs doivent servir à un setter, pas à un exercice de marché.
8. Les scripts Instagram doivent être **informels**, comme un texto à un pair : minuscules OK, “hey”, “ok je vois”, phrases courtes, zéro corporate. Flow : connexion humaine → question simple sur élèves/clients/delivery → mini-conversation → “je me permets de te piquer un peu, si t’es ok” → petite vidéo.
9. Adapter les mots au segment : infopreneur = élèves/membres ; coach/consultant = clients/sessions ; agence = delivery/client/reporting ; sales agency = objections/no-shows/calls.
10. Protéger la marque/réseau de operator : qualité > volume, pas de spam, pas de forcing, pas de promesse garantie. Règle validée : “si je serais gêné que operator soit associé publiquement à ce profil, je ne le DM pas.”
11. Exclusions par défaut : trading, crypto opportuniste, NFT/meme coin, OFM, dropshipping bas de gamme, ecom get-rich-quick, paris sportifs, affiliation douteuse, casino/argent facile, profils lifestyle sans preuve business, débutants sans clients.
12. Follow-up clean : J0 DM1, J2/J3 relance légère, J6/J7 dernier follow-up propre, puis stop sauf réaction. Follow-up = contexte business, jamais pression/culpabilisation.
13. L’EOD Outbound doit suivre : prospects ajoutés/qualifiés, DM1, follow-ups, vidéos/Looms envoyés, conversations ouvertes, calls proposés, R1 bookés, meilleur segment, meilleur hook, objection principale, prochaines actions.
14. **Lisibilité SOP obligatoire** : les ressources opérationnelles doivent être user-friendly façon Notion, pas un markdown brut. Hiérarchie claire, sections courtes, scripts en blocs copier-coller, bullets actionnables, densité mobile/desktop propre. Si l’UI SOP n’affiche pas bien le contenu, corriger la surface `/sop` plutôt que blâmer le document.
15. Pour donner accès à un setter (Team Member/Team Member) à une SOP, vérifier deux couches : `middleware.ts:isSetterAllowed()` ET `app/api/login/route.ts:isSetterRedirectAllowed()`. Ajouter `/sop` aux deux si nécessaire, build + deploy, puis envoyer le lien direct.

Pitfalls :
- Ne pas produire une trame trop propre type SOP corporate pour les DMs — elle doit rester documentée dans Data OS mais les messages eux-mêmes doivent sonner Instagram, pas brochure IA.
- Ne pas appeler operator “operator” dans les documents ou liens opérationnels. Telegram peut afficher operator, mais la marque outbound est operator.
- Ne pas livrer seulement un résumé dans la réponse : mettre réellement à jour les SOPs Convex et donner le lien direct `<client-dashboard-url>/sop?sop=...`.
- Attention à la page `/sop`: historiquement elle n’affichait `sop.content` que si `checklist` était vide. Le bon fix est un rendu markdown/Notion-like qui affiche toujours `content`, pas vider artificiellement la procédure si la checklist est utile.
- Le mot de passe Setter est stocké hashé dans Convex et n’est pas récupérable en clair. Si le user demande “envoie le mdp setter”, soit il fournit le mot de passe actuel, soit il faut reset/rotater via `scripts/set-setter-password.ts`. Ne pas prétendre pouvoir lire le secret.
- La page `/sop` peut masquer `sop.content` si une `checklist` existe selon l’implémentation UI: vérifier le rendu réel. Pour une ressource longue/scriptée, soit rendre `content` toujours visible via un composant markdown/Notion-like, soit vider les champs structurés qui masquent le guide. Ne jamais laisser l’utilisateur cliquer vers un organigramme/process au lieu du script.
- Avant d’envoyer un SOP à Team Member/Team Member en accès Setter, vérifier le middleware: historiquement `isSetterAllowed()` n’inclut pas `/sop`. Le mot de passe Setter seul ne suffit pas si la route redirige. Les mots de passe Setter sont hashés dans Convex (`authSettings`), donc non récupérables en clair: soit utiliser le mot de passe déjà connu par l’équipe, soit reset via `SETTER_PASSWORD=... npx tsx --env-file=.env.local scripts/set-setter-password.ts` puis partager le nouveau mot de passe.

## Workflow récurrent — Podcast Sprint / Médias dans Data OS

Quand operator/operator veut structurer une campagne podcast/interviews/médias, ne laisse pas la liste de prospects dans une page Vercel statique. La page publique doit rester le brief stratégique; les prospects validés vont dans une section Data OS **Médias / Podcast Sprint** avec kanban partagé.

Règles clés:
- Accès prévu: Team Member, Team Member, operator, Hamza.
- Scraper/drafter les prospects hors Data OS, les renvoyer en chat pour validation, puis seulement pousser les validés.
- Démarrer par Niveau 1 (petits médias/petits influenceurs) pour créer les preuves vidéo, puis monter vers Niveau 2/3 avec clips, vues, commentaires et apparitions précédentes.
- Ordre contact Niveau 1: Instagram DM → LinkedIn DM → email/formulaire si nécessaire.
- Mai = visio par défaut; physique uniquement si profil Dubai/UAE. Juin = possibilité de déplacement physique si opportunité stratégique.
- Éviter les concurrents directs IA agentique et les profils trop no-code/tool/lifestyle sans audience business de service.

Voir `references/podcast-sprint-media-kanban.md` pour la structure kanban, les champs, les niveaux de pyramide, les objectifs mensuels et les critères de qualification.

## Workflow récurrent — Pipe Setter depuis Typeform

Quand on crée un pipe opérationnel pour les setters alimenté par Typeform dans `client-dashboard`:

1) **Inspecter avant de créer**
- Lire `convex/schema.ts`, les modules Convex existants, `middleware.ts`, `components/sidebar.tsx`, et les pages `/sales/*`.
- Ne pas deviner les accès setter: vérifier `isSetterAllowed()` dans `middleware.ts`.

2) **Data model Convex**
- Ajouter une table dédiée (`setterLeads` ou équivalent) avec index utiles: `by_business`, `by_status`, `by_typeform_response`.
- Créer un module Convex (`convex/setterPipe.ts`) avec au minimum:
  - `list`
  - `createFromTypeform`
  - `updateStatus` / `logCall`
  - `remove` pour nettoyer les tests
- Déployer Convex avant de compter sur les types générés côté frontend:
```bash
cd /workspace/projects/client-dashboard
export CONVEX_DEPLOY_KEY="$(grep CONVEX_DEPLOY_KEY .env.local | cut -d= -f2- | tr -d '\"')"
npx convex deploy --cmd "echo skip" --typecheck=disable
```

3) **UI setter**
- Créer la page sous `/app/sales/setter-pipe/page.tsx`.
- Ajouter le lien dans `components/sidebar.tsx`.
- Ajouter la route dans `isSetterAllowed()` sinon le cookie setter sera redirigé vers `/sales/eod` ou `/sales/setter-eod`.
- Mobile/access setter: vérifier aussi `kdos_role=setter` (cookie UI non-secret) en plus du cookie httpOnly `kdos_setter`. Le middleware doit “heal” les anciennes sessions en réémettant `kdos_role=setter` quand `kdos_setter` est valide; sinon la sidebar mobile peut afficher le mauvais shell ou masquer Pipe Setter.
- `CurrentMemberModal` ne doit pas s'afficher sur le shell setter (`/sales/setter-pipe`, `/sales/setter-eod`, surfaces setter-only), sinon le modal “Qui es-tu ?” peut intercepter les clics sur le hamburger mobile et rendre le pipe inaccessible.
- Login setter: respecter `from` si la route demandée est une route setter autorisée (`/sales/setter-pipe`, `/sales/crm`, `/sales/debrief`, `/sales/tracking`, `/formulaires`, `/creative-intake`, `/sales/setter-eod`) au lieu de renvoyer systématiquement vers EOD.

4) **Webhook Typeform**
- Créer un endpoint public sous `app/api/typeform/.../route.ts`.
- Ajouter explicitement la route dans `PUBLIC_PATHS` de `middleware.ts`; sinon le webhook reçoit `401 unauthorized` avant d'atteindre le handler.
- Parser Typeform via `form_response.definition.fields[]` + `form_response.answers[]`.
- Map flexible: utiliser les titres/questions pour extraire `name`, `email`, `phone`, mais conserver toutes les réponses dans `qualification`.
- Anticiper les UTM depuis Typeform hidden fields: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`. Les stocker sur le lead et les afficher sur les cartes pipe si dispo.
- Dedup critique: ne jamais dédupliquer uniquement par `typeformResponseId`. Typeform peut générer plusieurs response IDs pour le même humain (reload, double-submit, partial/completed events). `setterPipe:createFromTypeform` doit dédupliquer aussi par email normalisé OU téléphone normalisé avant insert; la route Next ne doit envoyer l’alerte Discord que si la mutation retourne `deduped:false`.

5) **Webhook Calendly pour bookings self-booked**
- Créer un endpoint public sous `app/api/calendly/.../route.ts` et l'ajouter dans `PUBLIC_PATHS`.
- Sur `invitee.created`, retrouver le lead setter par email puis téléphone normalisé.
- Si match trouvé: passer le lead en `call_booke`, stocker les infos Calendly, et mettre `bookingSource = "self_booked"`.
- Si le setter booke depuis l'UI pipe: mettre `bookingSource = "setter_booked"`.
- Dans l'UI/stats, distinguer clairement les bookings setter vs self-booked; sur la carte, afficher “Setter” ou “Lead lui-même”.

6) **Piège Convex critique: clés objet ASCII seulement**
Convex rejette les objets dont les clés contiennent des accents (`Téléphone`, `Objectif marché`, etc.), même avec `v.any()`:
```txt
Field name Téléphone has invalid character 'é': Field names can only contain non-control ASCII characters
```
Toujours normaliser les titres Typeform avant de les stocker comme clés:
```ts
function normalize(s: string) {
  return s.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function safeObjectKey(s: string) {
  return normalize(s).replace(/\s+/g, "_") || "question";
}
// mapped[safeObjectKey(title)] = value
```

6) **Vérification obligatoire**
- `npm run build`
- `npx convex deploy ...`
- `npx vercel deploy --yes --force --prod`
- Réassigner l'alias secondaire si besoin:
```bash
npx vercel alias set <deployment-url> <client-dashboard-url>
```
- Faire un POST réel sur `<url>>/api/typeform/...`, vérifier que le lead apparaît via `setterPipe:list`.
- Faire ensuite un POST réel sur `<url>>/api/calendly/...` avec le même email/téléphone, vérifier que le lead passe en `call_booke`, que `bookingSource` vaut `self_booked`, et que les UTM Typeform sont conservés.
- Vérifier l'accès setter mobile en production avec une session setter: viewport ~390px, route `/sales/setter-eod`, ouvrir le hamburger, cliquer `Pipe Setter`, confirmer URL `/sales/setter-pipe`, titre `Pipe Setter`, absence du modal `Qui es-tu ?`, et `document.documentElement.scrollWidth === innerWidth`.
- Vérifier aussi par HTTP qu'une session avec seulement `kdos_setter` valide reçoit bien `Set-Cookie: kdos_role=setter` sur `/sales/setter-pipe`.
- Attention: Calendly peut bloquer un booking navigateur automatisé avec `This booking cannot be completed` / anti-bot. Pour tester l'intégration Data OS, la preuve fiable est: webhook Calendly actif via API + payload `invitee.created` réaliste posté sur l'endpoint prod + requery Convex.
- Quand `markSelfBookedFromCalendly` matche un lead existant, ne jamais patcher les champs UTM à `undefined/null`; préserver `lead.utmSource`, `lead.utmMedium`, etc. si Calendly ne fournit pas d'UTM, sinon le passage en RDV booké efface l'attribution Typeform.
- Supprimer le lead de test via `setterPipe:remove`. Vérifier `remaining_after_cleanup = 0`.

## Pitfalls
- **Convex object keys from external forms**: ne jamais stocker les labels Typeform bruts comme clés d'objet Convex. Les accents et caractères non-ASCII cassent la mutation; normaliser en snake_case ASCII.
- **Public webhook behind app middleware**: une route API webhook doit être whitelisted dans `PUBLIC_PATHS`, sinon Typeform/curl reçoit `401 unauthorized` et le handler n'est jamais appelé.
- **Member API behind app middleware**: une route API appelée depuis le portail membre (ex: `/api/member/fiche`) doit aussi être dans `PUBLIC_PATHS`; la route vérifie ensuite elle-même le cookie signé `aios_portal_token`. Sinon le middleware bloque en 401 avant le handler, même si la page roadmap est accessible.
- **Calendly API Cloudflare 1010**: les appels Python `urllib` nus peuvent recevoir `403 error code: 1010`. Ajouter un `User-Agent` explicite type `Mozilla/5.0 (compatible; AIOSWebhookSetup/1.0)` sur les appels Calendly API (`/users/me`, `/webhook_subscriptions`).
- **Convex type generation lag**: After adding new tables/queries to `schema.ts` and `convex/*.ts`, the auto-generated `convex/_generated/api.d.ts` does NOT update until `npx convex deploy` runs. Until then, `api.clients.xxx` (or any new module) causes TS errors like "Property does not exist on type". Interim fix: cast with `(api as any).clients` and add eslint-disable comments. Always deploy Convex before the typecheck will pass cleanly.
- **TypeScript template literal `/*` trap**: Writing markdown paths like `/api/agent/clients/*` inside a JS template literal causes TS to parse `/*` as comment start. Fix: use `\`` (single backslash + backtick) to escape, matching the existing pattern on line 312 of docs.md/route.ts. Never use `\\\\`` (double backslash) — it breaks the template literal.
- **`vercel deploy --prebuilt` requires `vercel build` NOT `next build`**: The `--prebuilt` flag only reads from `.vercel/output/`, which is created by `vercel build`. Running `next build` creates `.next/` but NOT `.vercel/output/`, so `--prebuilt` will error "no prebuilt output found". Always use `vercel build` (or `vercel build --prod`) for prebuilt deploys.
- **`vercel build` vs `vercel build --prod` environment mismatch**: `vercel build` (without `--prod`) builds for "preview" environment. If you then run `vercel deploy --prebuilt --prod`, it errors with "prebuilt output was built with target environment preview". Always match: `vercel build --prod` → `vercel deploy --prebuilt --prod`.
- **Vercel "Unexpected error"**: Si `vercel deploy` (sans token) renvoie "Unexpected error" mais que le build local marche, c'est probablement un problème d'auth/scope, PAS de Node version. Utiliser `--token` pour bypasser. Si le build échoue avec `No address provided to ConvexReactClient`, c'est un problème de scope d'env vars (deploy en Preview alors que les vars sont en Production) — voir section Deploy flow.
- **CONVEX_DEPLOY_KEY location**: The key may not be in a `.env` file on the server. It can be found in plan documents (`.planning/`), session transcripts, or CLAUDE.md references to `/root/client-aios/.env` (which may not exist on the current machine). Use `grep -r "CONVEX_DEPLOY_KEY" /root/ --include="*.md" --include="*.json"` in session files or plan docs to locate it.
- **Admin password reset**: The password is hashed in `authSettings` table (PBKDF2). The stored hash OVERRIDES the `ADMIN_PASSWORD` env var. To reset: delete the row from authSettings (it falls back to env var). No public mutation exists — create a temporary `authSettingsAdmin:resetToEnvPassword` mutation using `ADMIN_BACKEND_SECRET`, deploy, run via Convex HTTP API, then delete the temp file. Never commit the reset function.
- GHL: token actif (<PRIVATE_TOKEN>) mais peut retourner 403 (Cloudflare IP block temporaire)
- tl;dv: API REST 401, utiliser le CLI `tldv` à la place
- Convex schema validation: les données existantes en DB peuvent avoir des valeurs pas dans les unions.
  Utiliser v.string() au lieu de v.union(v.literal(...)) pour les champs flexibles (type, priority).
  Champs qui ont causé des erreurs: cohorteTasks.type, cohorteTasks.priority, ventes.program,
  students.program (était roadmapType, extra field), ventes sans leadId/rdvId (rendre optional).
- TranscriptReady webhook: le handler original mettait `title: "Transcript ${meetingId}"` au lieu
  du vrai nom du meeting. Fixé pour lire body.meeting.name.
- Les commissions sont dans le Sheet 2 avec les ventes

## Faux positifs alertes check-in — fix durable (2026-04-10)

Quand le dashboard remonte des `checkin_manquant` massifs/faux, ne pas juste nettoyer: corriger la règle source.

### 1) Nettoyage immédiat (runbook)
1. Lister alertes ouvertes: `alerts:getOpenAlerts`
2. Dismiss en boucle: `alerts:dismissAlert` sur chaque `_id`
3. Re-vérifier que `OPEN_ALERTS_AFTER=0`

### 2) Patch source anti-récidive
Fichier: `convex/alertChecks.ts`, mutation `checkMissingCheckins`.

Garde-fous à appliquer:
- Déclenchement seulement à partir de **jeudi 18:00 Europe/Paris**.
- Cibler uniquement `students` avec `program === "cohorte"` et `status === "active"`.
- Exclure profils `test|seed|demo` (slug).
- **Opt-in explicite**: `metadata.requireWeeklyCheckin === true` (sinon aucune alerte check-in).
- Respecter les flags de bypass: `metadata.skipCheckinAlerts === true` ou `metadata.disableAlerts === true`.

### 3) Validation post-déploiement
- Déployer Convex.
- Exécuter `alertChecks:checkMissingCheckins` manuellement.
- Attendu en prod si aucun membre opt-in: `{ checked: 0, created: 0 }`.
- Vérifier ensuite `alerts:getOpenAlerts` (doit rester vide ou contenir uniquement des cas attendus).

### 4) Note opérationnelle
Si l'équipe veut activer ce contrôle pour un membre précis, ajouter `metadata.requireWeeklyCheckin=true` sur sa fiche student. Sans opt-in, pas d'alerte check-in.


## Consolidated references: Data OS operational surfaces

The previous Daisy, AIOS dashboard bootstrap, member-management, public form links, team task board control, and setter-pipe E2E skills are now references under this umbrella. Use those files for surface-specific API endpoints, verification recipes, and production pitfalls while keeping ClientOps Data OS as the class-level entrypoint for Convex/Data OS work.

- `references/ads-follows-tracking-mvp.md` — MVP rapide pour mesurer les créas ads qui génèrent les meilleurs follows/leads: Google Sheet/Airtable, attribution période/creative_id, scoring Typeform, décisions scale/cut/iterate, et migration future Data OS + Meta API.
- `references/ads-follow-tracking-mvp.md` — MVP Creative → Follow → Typeform quality tracking: `/creative-intake`, `adTracking` Convex module, Typeform hidden fields/webhook, scoring, attribution rules, verification and pitfalls. For Meta Follow Ads, prioritize `followers_ig`, `cost_per_follower_ig`, and `profile_visits_ig`; if Graph API hides Ads Manager follower columns, ingest via CSV/browser export or daily IG follower snapshots rather than pretending link clicks/messages are follows. If a non-admin ads operator (ex: Hamza) needs creative access, expose `/creative-intake` through the restricted setter/operator auth surface, not as a public page: patch `middleware.ts:isSetterAllowed`, add the link in `components/sidebar.tsx` `SetterSidebar`, build/deploy, then verify with a signed `kdos_setter` cookie and without cookie (must 307 to `/login`).
- `references/revoke-team-member-access.md` — runbook pour révoquer l'accès Data OS d'un membre d'équipe: rotation du mot de passe Setter, invalidation des cookies existants, worktree de déploiement, fallback route one-shot si secret admin local stale, vérifications post-prod.
- `references/ads-lead-quality-audit.md` — read-only audit recipe for “ads bring unqualified prospects”: correlate Meta spend/ad insights, canonical Typeform responses/hidden UTMs, Convex `adTracking`/KPI/RDV validation, and report CPLQ/cost per validated RDV instead of surface CPL/bookings.
- `references/crm-dataos-custom-fields.md` — CRM/Data OS pattern for Fructu/Airtable-style custom fields: Convex field definitions, contact-level values, local display prefs, deploy/verification checklist.
- `references/capture-page-typeform-routing.md` — public `/capture` landing/VSL pattern: middleware + client-layout public gates, canonical Typeform `sBg0c1Vu`, UTM preservation, headless visual/DOM verification.
- `references/roadmap-from-tldv-coaching-call.md` — pattern validé pour transformer un call tl;dv en roadmap personnalisée Data OS: lookup/create student, checkpoints, tâches custom, token `studentAuth`, vérification portail, message prêt à envoyer.
- `references/member-roadmap-editable-portal.md` — rendre une roadmap membre éditable via lien privé: slug gate, mutations `cohorteTasks:update` / `submitDeliverable`, vérification cookie magic-link, pièges headless DOM.
- `references/aios-client-dossier-intake.md` — workflow for turning external audit sources (Notion, Genspark, tl;dv, Lucidchart) into a verified Data OS client fiche with inline documents and a brainstorm-ready MVP synthesis.
- `references/aios-delivery-process-refonte.md` — workflow for simplifying AIOS Delivery into one process, four vital SOPs, client pipe fields/livrables, safe backup, Convex/Vercel deploy, and alias verification.
- `references/upstream-digital-planet-intake.md` — concrete intake example for a newly signed client with tl;dv + website + user notes; shows raw transcript storage, Data OS client creation, wiki sync, and a scoped Digital Planet back-office copilot MVP.
- `references/fathom-share-intake-to-client-dataos.md` — extract a public Fathom share link via Inertia `data-page` + `copyTranscriptUrl`, optionally sample video frames with ffmpeg, then create/update a Data OS client fiche with transcript/analysis/metadata inline documents.
- `references/client-onboarding-portal.md` — tokenized AIOS client onboarding portal pattern: public `/onboarding/[token]`, internal `/clients/[slug]/onboarding`, Convex tables/module, public route gates, premium UX, security posture, deploy and smoke-test checklist.
- `references/collaborator-onboarding-portal.md` — internal/freelance AIOS collaborator onboarding portal: public tokenized funnel, DataOS/Discord/calendar access, AIOS-only SOPs, assigned-project cockpit, admin/billing form, principles, Loom test, and privacy pitfalls.
- `references/collaborator-dataos-dashboard.md` — internal AIOS collaborator DataOS surface: what the page should contain, access model, personal todo vs central taskboard, SOP/meetings/useful links, and UX pitfalls.
- `references/collaborator-compensation-hermes.md` — collaborator-facing compensation fiche for Hermes installations/workshops/recurring consulting upsells, with strict separation from admin-only margin docs, canonical 800€ install split 400€/400€, and Convex update pitfalls.
- `references/client-dataos-webhook-readiness-audit.md` — audit pattern to decide if a client VPS/Hermes/Data OS is installable, webhook-ready, or prod-ready for event-driven onboarding workflows; includes remote Hermes self-check, Convex auth/schema probes, Vercel vs Convex vs Hermes webhook decision rules, and minimum schema fields for payment/form/task automations.
- `references/client-convex-webhook-outbox.md` — production pattern for client Data OS webhooks: Convex HTTP ingest, sanitized event log, `hermesWakeRequests` outbox, cron runner, `/opt/data/state` paths for non-root Second Brain crons, and live smoke-test checklist.
- `references/onboarding-form-v2-blueprint.md` — universal post-signature onboarding V2: Data OS implementation collector, client-derived fields, vertical modules, `onboardingBusinessObjects`, readiness score V2, and why portal > Typeform for this use case.
- `references/closing-form-sheet-sync.md` — ClientOps closing report sync pattern: Google Form/Sheet `Rapport de Closing` → match RDV → `callDebriefs:fillDebrief` → `ventes`/transactions → clean Discord `#💰paiements`; includes pitfalls for multi-tab Sheets and Sheet-vs-DataOS mismatch.
- `references/kpi-pitch-closing-deploy.md` — KPI sales rule + deploy recipe: closing rate is ventes/appels pitchés, pitch rate is pitches/show-up; includes EOD closer/team mapping (`sales_calls_pitched`), UI surfaces, Convex-before-Vercel verification, and repo-red typecheck caveats.
- `references/content-os-youtube-pipeline.md` — Content OS pattern for YouTube/LinkedIn/Instagram production: inspiration packaging → AIOS variation → Vercel fiche → recording/editing/publishing kanban, with Convex tables/functions and seed/verification recipes.
- `references/content-os-kanban-editor.md` — UI/Convex pattern for upgrading `/content` into a real editorial Kanban: drag & drop stages, visual thumbnail/screens, detail modal, `content:patchItem`, and deployment/verification checklist.
- `references/content-only-editor-access.md` — content-only auth pattern for a YouTube editor/monteur: `kdos_content` signed cookie, `kdos_role=content` UI hint, Convex password hash rotation, middleware route restriction, Vercel alias and Playwright smoke test.
- `references/buffer-linkedin-scheduling.md` — Buffer GraphQL API recipe for scheduling AIOS/operator LinkedIn posts from Content OS/Vercel packs: auth probe, channel discovery, createPost mutation with PNG assets, verification query, Free-plan 10-post limit, and Content OS sync notes.
- `references/outbound-instagram-prospect-list-scraping.md` — guardrails for turning an Outbound Instagram SOP/ICP into a strict setter-ready scraping brief and CSV prospect list; excludes broad agencies/SaaS and defines scoring, required signals, columns, and DM-readiness rule.
- `references/vividflow-dataos-editor-mode-header-convex-audit.md` — VividFlow/Data OS pattern for auditing whether Convex is truly wired (not just schema present), plus Thomas-validated header/editor-mode rules: sticky simple page header, functional search, realtime-ish notification bell, compact profile photo upload, and normal-weight text inputs.

---
name: client-delivery-starter-pack
description: Recettes d'execution composees pour les workflows AIOS. A utiliser quand tu dois enchaner plusieurs skills sur un cas concret Client Delivery.
version: 1.0.0
author: Hermes
metadata:
  hermes:
    tags: [AIOS, ClientOps, AIOS, Workflows]
    related_skills:
      - frontend-design
      - react-best-practices
      - brand-guidelines
      - deploy-to-vercel
      - vercel-cli-with-tokens
      - webapp-testing
      - web-design-guidelines
      - mcp-builder
      - skill-creator
      - ui-ux-pro-max
---

# AIOS Starter Pack

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Des recettes, pas des ingredients. Chaque recette est un workflow compose de skills existants, ordonnance pour un cas d'usage reel Client Delivery.

## Contexte technique

Stack ClientOps Dashboard : Next.js 15 + React 19 + Convex + shadcn + Tailwind 4 + lucide-react
Deploiement : Vercel (build local + --prebuilt, Node 24.x incompatible en remote)
Infra IAO : 5 couches (Capture > Data > Context > Sub-agents > Automatisations)
Business : white-label, setup 3-5K EUR, recurrent 300-500 EUR/mois
Clients actifs : example-client, cocorosoji, mohamed-ait-brahim, sculpt-my-body, selva-nanda

---

## Recette 1 — Front Premium

Declencher quand : nouveau client, nouvelle landing, redesign dashboard, white-label a livrer.

### Sequence

1. **ui-ux-pro-max** -> generer le design system initial (palette, typo, structure)
2. **frontend-design** -> choisir la direction visuelle forte
3. **brand-guidelines** -> harmoniser avec l'identite du client
4. **react-best-practices** -> contraintes d'implementation Next.js

### Ce que ca produit
- direction visuelle validee
- design system coherent
- palette/typo/structure documentees
- contraintes techniques claires avant le premier composant

### Commande rapide
"Front premium pour [client]"

---

## Recette 2 — Audit Front Complet

Declencher quand : QA avant livraison, dashboard qui merde, performance degradee.

### Sequence

1. **webapp-testing** -> tester le comportement reel (navigateur, console, interactions)
2. **web-design-guidelines** -> auditer accessibilite, focus, forms, dark mode
3. **react-best-practices** -> verifier waterfalls, bundle, rerenders, server/client boundary

### Ce que ca produit
- bugs UI identifies avec preuves
- violations d'accessibilite listees
- optimisations React classees par impact
- rapport actionnable avec priorites

### Commande rapide
"Audit front complet sur [URL ou projet]"

---

## Recette 3 — Deploiement Vercel Propre

Declencher quand : preview, prod, relink foireux, deux projets qui s'ecrasent.

### Sequence

1. **vercel-cli-with-tokens** -> verifier auth, projectId, orgId
2. **deploy-to-vercel** -> executer le deploiement (preview par defaut, prod sur demande)

### Regle critique
Le build remote Vercel casse sur Node 24.x. Toujours build local + --prebuilt :
```bash
npm run build && vercel deploy --prebuilt
```

### Ce que ca produit
- deploiement preview ou prod
- URL finale
- linking verifie
- env vars confirmees

### Commande rapide
"Deploie [projet] sur Vercel"

---

## Recette 4 — Build IAO Client

Declencher quand : nouveau client onboarde (CDC signe + paiement + questionnaire).

### Sequence

1. **generate-cdc** -> fiche de contexte client a partir des notes R1/transcripts
2. **aios-client-folder** -> structurer le dossier client standard
3. **supermemory-migration** -> generer le contexte client dans Supermemory
4. **aios-blueprint** -> deployer les 5 couches IAO

### Ordre non negociable
Data OS > Context OS > Capture OS > 3 automatisations prioritaires > Sub-agents

### Ce que ca produit
- dossier client structure
- contexte ingere dans Supermemory
- IAO deployee par couche
- 3 automatisations actives
- STATUS.md mis a jour

### Commande rapide
"Build IAO pour [client]"

---

## Recette 5 — Pack Contexte Claude Code / Obsidian

Declencher quand : operator/operator veut “feed” un projet Claude Code perso, synchroniser un vault Obsidian, créer une base de connaissance portable, ou donner à un agent un corpus Client Delivery structuré.

### Sequence

1. Charger les sources wiki/projets pertinentes (`wiki/index.md`, pages entities/concepts, docs de formation, outputs existants).
2. Produire un dossier portable dans `/workspace/outputs/{slug}-knowledge-pack/`.
3. Créer des `.md` courts par concept + un `00_INDEX.md` avec wikilinks.
4. Ajouter un `*_Context_Block.md` prêt à coller dans le `CLAUDE.md` du projet cible.
5. Générer un markdown combiné + PDF lisible + archive `.zip`.
6. Livrer le zip et le PDF, pas seulement un lien de dossier local.

### Ce que ca produit
- Pack Obsidian-friendly avec notes reliées.
- Contexte Claude Code actionnable, pas une doc morte.
- Positionnement durci (ex : AIOS ≠ chatbot, AIOS = Data OS + agents IA + HITL).
- Archive portable pour usage sur machine personnelle.

### Reference
Voir `references/claude-code-obsidian-knowledge-pack.md` pour la structure exacte, le mapping de fichiers recommandé et les commandes d’export PDF/zip.

### Commande rapide
"Crée un pack contexte Claude Code/Obsidian pour [projet/sujet]"

---

## Recette 6 — Nouveau Skill / MCP

Declencher quand : workflow recurrent a industrialiser, API externe a integrer.

### Pour un skill

1. **skill-creator** -> capturer le workflow, definir perimetre, ecrire le corps
2. synchroniser Hermes + Claude Code
3. tester avec claude -p et verifier dans permission_denials

### Pour un serveur MCP

1. **mcp-builder** -> concevoir les tools, choisir le transport, implementer
2. tester avec mcporter ou le client MCP natif
3. documenter les tools et leurs schemas

### Commande rapide
"Cree un skill pour [workflow]" ou "Construis un MCP pour [API]"

---

## Routage ultra-rapide

"front premium" -> Recette 1 (ui-ux-pro-max, frontend-design, brand-guidelines, react-best-practices)
"audit front" -> Recette 2 (webapp-testing, web-design-guidelines, react-best-practices)
"deploie Vercel" -> Recette 3 (vercel-cli-with-tokens, deploy-to-vercel)
"build IAO" -> Recette 4 (generate-cdc, aios-client-folder, supermemory-migration, aios-blueprint)
"pack contexte" / "feed Claude Code" / "vault Obsidian" -> Recette 5 (portable markdown + CLAUDE.md block + PDF/zip)
"nouveau skill" -> Recette 6a (skill-creator)
"nouveau MCP" -> Recette 6b (mcp-builder)
"pivot AIOS" / "plan lancement high-ticket" / "document équipe" -> Recette 7 (doc interne offre + funnel + rôles + KPI)

---

## Recette 7 — Document pivot / lancement AIOS high-ticket

Declencher quand : operator/operator demande un long document interne pour expliquer un pivot AIOS, une offre high-ticket, une stratégie VSL/outbound/podcast, une organisation d'équipe, des deadlines ou des KPI.

### Sequence

1. Relire les dernières sources contexte AIOS si disponibles (wiki/outputs/mémoires/session search).
2. Distinguer **promesse marché** (résultat business) et **mécanisme** (Hermes/RMS/Data OS/sous-agents/VPS).
3. Structurer le document autour de : décision stratégique, ICP, offre, pricing, value stack, funnel, organigramme process client, rôles, deadlines, KPI, tracking.
4. Mettre les 48-72h suivantes en tâches concrètes; garder les objectifs 14/30 jours en projections.
5. Ne pas appeler le user “operator” dans le document; c'est un label Telegram, pas une consigne de naming.
6. Exporter a minima `.md`; si besoin, générer `.html` + PDF via Chrome headless. Si Google Docs échoue en scope insuffisant, livrer fichiers et dire clairement qu'il faut réautoriser Docs pour créer directement dans Drive.

### Reference
Voir `references/aios-high-ticket-pivot-document.md` pour la structure exacte, le diagramme funnel et les règles de style.

### Commande rapide
"Prépare le document complet du pivot AIOS high-ticket"

---

## Pitfalls

- declencher frontend-design avant ui-ux-pro-max -> direction sans systeme, resultat incoherent
- deployer sur Vercel sans build local -> Node 24.x casse le build remote
- construire les couches IAO dans le mauvais ordre -> dependances cassees
- creer un skill sans synchroniser Claude Code -> dette de sync
- auditer sans webapp-testing d'abord -> conclusions sans preuves reelles
- quand l'utilisateur parle d'un projet Claude Code perso, ne pas chercher un repo local introuvable trop longtemps : construire un pack portable livrable (.md + PDF + zip)

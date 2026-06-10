---
name: value-bomb-diagram-video
description: Créer une vidéo YouTube BOF / Value Bomb structurée autour d’un document visuel navigable type Miro/Lucidchart/HTML. À utiliser quand operator veut préparer une “value bomb”, une vidéo BOF, un schéma, un organigramme, un canvas animé, ou un support qu’il commente à l’écran plutôt qu’une face cam classique.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [YouTube, BOF, Value Bomb, Diagram, Miro, Lucidchart, VSL, AIOS]
    related_skills: [copywriter-pro, claude-design, excalidraw, deploy-to-vercel]
---

# Value Bomb Diagram Video

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Workflow pour créer les vidéos BOF / Value Bomb d’operator : un **asset visuel navigable** qu’il commente, avec zooms/slides à l’écran, puis le monteur incruste les passages dynamiques.

## Quand utiliser

Déclenche ce skill si l’utilisateur dit :
- “vidéo BOF”, “value bomb”, “value asset”
- “crée-moi un Miro / Lucidchart / diagramme”
- “je veux parler par-dessus un document”
- “support pour monteur”, “screen recording”, “canvas navigable”
- “comment j’automatiserais…”, “architecture”, “organigramme”, “process”

## Principe

Ne pas produire une vidéo face cam linéaire. Produire un **terrain visuel** :
- fond blanc / off-white
- texte noir
- quelques couleurs utiles
- post-its / icônes / zones espacées
- gros blocs lisibles en zoom
- flèches claires
- canvas large et navigable
- peu d’annotations parasites

L’objectif : donner l’impression qu’on explore l’architecture interne d’un vrai système.

## Format de livrable recommandé

Créer une page HTML statique déployée sur Vercel, plutôt qu’un simple markdown.

Fonctions utiles :
- canvas large horizontal
- scroll / drag pour naviguer
- boutons : `Plein écran`, `Zoom +`, `Zoom −`, `Reset`
- `noindex`
- responsive minimum, mais priorité desktop/screen recording

Chemins usuels :
- dossier : `/workspace/outputs/<slug-video>/`
- fichiers : `index.html`, `vercel.json`
- déploiement : `npx vercel deploy --prod --yes`

Toujours vérifier l’URL publique avec `urllib.request` ou équivalent.

## Structure narrative standard

Chaque Value Bomb doit suivre un chemin clair :

1. **Ancien modèle / chaos actuel**
   - montrer ce qui casse aujourd’hui
   - icônes concrètes : calls, Slack, WhatsApp, CRM, Notion, Drive, équipe, fondateur

2. **Base de données / matière première**
   - montrer les données déjà disponibles
   - exemples : transcripts, logs clients, finances, créatifs publicitaires, SOP, livrables, résultats clients

3. **Source de vérité**
   - centraliser la mémoire du business
   - clients, statuts, objectifs, risques, tâches, calls, SOP, décisions, historique

4. **Système / couche agentique / process cible**
   - montrer les agents, workflows ou modules
   - préciser pour chaque agent : mission, inputs, outputs, droits d’action, critères qualité
   - distinguer **copilote** vs **super agent** quand pertinent

5. **Cockpit KPI**
   - santé clients
   - churn / rétention
   - marge delivery
   - vitesse d’exécution
   - revenu par employé
   - dépendance fondateur / temps téléphone si pertinent

6. **Résultat business**
   - plus de marge
   - moins de churn invisible
   - delivery plus prévisible
   - moins de dépendance fondateur
   - revenu par employé plus élevé

7. **Boucle d’amélioration**
   - résultats → feedbacks → data → système plus précis → meilleure delivery
   - la boucle doit passer visuellement **derrière** les encarts, pas au-dessus

## Règles visuelles

- Canvas large, pas grille compacte.
- Créer de l’espace : mieux vaut un terrain un peu vaste qu’un tableau étouffé.
- Les flèches doivent raconter l’ordre exact des étapes.
- Les flèches passent derrière les encarts (`z-index` bas), les blocs passent au-dessus.
- Éviter les labels flottants inutiles si le schéma est déjà clair.
- Supprimer les sous-titres gris et textes d’aide si l’utilisateur veut un rendu plus clean.
- Utiliser des icônes simples pour rendre le système plus humain : téléphone, message, dossier, finance, créatif, KPI, cerveau, alerte.
- Les post-its doivent être des punchlines, pas des paragraphes.
- Chaque zone doit pouvoir être comprise en 3 secondes sans le son.

## Style copy

Ton : stratégique, concret, premium, pas “cours scolaire”.

Bonnes formulations :
- “Ton agence ne manque pas d’outils. Elle manque de mémoire.”
- “Chaque interaction client devient une donnée.”
- “Chaque donnée devient une action.”
- “Chaque livraison enrichit la machine.”
- “Tu ne veux pas un chatbot. Tu veux une équipe.”

Éviter :
- jargon technique gratuit
- 25 blocs minuscules
- liste Make/Zapier d’automatisations gadgets
- schéma trop symétrique / trop PowerPoint
- face cam scriptée trop longue

## Exemples de référence

### Vidéo : **Comment automatiser la delivery d’une agence avec des agents IA**

Références produites :
- ancienne référence : `<url>
- document/script validé : `<url>

Structure validée :
- Étape 1 : Agence traditionnelle
- Étape 2 : Base de données / donnée client
- Étape 3A : Source de vérité
- Étape 3B : Delivery agentique
- Étape 4 : Cockpit KPI
- Étape 5 : Résultat business
- Boucle : résultat business → base de données

Notes validées par operator :
- fond blanc/off-white, écritures noires
- canvas navigable, zoomable
- icônes et post-its user-friendly
- plus d’espace entre les zones
- flow exact : 3A → 3B → 4 → 5
- enlever sous-titre gris, annotations flottantes, texte bas de page quand le rendu doit être clean
- livrer le document Vercel avec intro face cam + bullet points détaillés + schéma à filmer + ordre de tournage + CTA + mode téléprompteur
- pour cette vidéo, le cœur copy validé est : “Ton agence ne manque pas d’outils. Elle manque d’un cerveau opérationnel qui transforme l’information en action.”

### Séquence YouTube AIOS validée autour de cette vidéo

Quand operator construit la série vidéo autour du modèle agentique, garder des territoires distincts :
1. `Comment automatiser la delivery de son agence avec des agents IA` → système delivery concret.
2. `Tu ne vendras plus jamais du coaching ou du service comme en 2022` → modèle business : DIY / Done With You / Done For You → Done With AI → Done By AI.
3. `Comment j’automatiserais mon agence à +400K€/an avec 7 agents IA` → agents concrets, incarné à la première personne.
4. `Les 5 CEO qui ont tous prédit le même modèle agentique` → vision macro / validation marché (Nvidia/Jensen Huang, Microsoft/Satya Nadella, Salesforce/Marc Benioff, OpenAI/Sam Altman, Anthropic/Dario Amodei).

Pitfall : ne pas proposer une deuxième vidéo BOF qui ressemble trop à la première. `Le schéma complet d’une agence agentique` ou `cerveau opérationnel d’une agence` peut faire doublon avec la vidéo delivery. Préférer un angle business model distinct ou une vidéo agents incarnée.

## Process opératoire

1. Clarifier le titre/angle si absent.
2. Proposer le chemin narratif en 5-7 zones maximum.
3. Construire une première version HTML ou diagramme.
4. Déployer sur Vercel si demandé ou utile.
5. Vérifier l’URL publique.
6. Itérer sur : espacement, ordre des flèches, noms des étapes, propreté visuelle.
7. Finaliser avec un mini guide de tournage : ordre des zooms/slides, punchline centrale, CTA.

## Checklist finale

Avant de livrer :
- [ ] URL publique fonctionne
- [ ] noindex actif si Vercel/public
- [ ] ordre des étapes correct
- [ ] flèches derrière les blocs
- [ ] canvas assez aéré
- [ ] textes courts et lisibles
- [ ] pas d’annotations parasites
- [ ] icônes/post-its utiles
- [ ] boucle d’amélioration visible
- [ ] exploitable en screen recording par le monteur

---
name: iao-audit-pitch-deck
description: "Créer un deck de présentation éducatif pour un audit IAO physique. Structure pédagogique éprouvée : positionnement Chief AI Officer, métaphore biologique, couche agent, Data OS, Daily Brief. Export HTML + PDF 16:9."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [clientops, iao, audit, pitch-deck, pdf, presentation]
    related_skills: [aios-blueprint, clientops-csm-agent, sop-appel-audit]
---

# IAO Audit Pitch Deck

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Génère un deck de présentation éducatif et vulgarisé pour un audit IAO en physique (chez le client). Le deck sert à expliquer ce qu'est une Infra IAO, pourquoi ça change tout, et comment on la déploie.

## Structure obligatoire (14 slides)

| # | Slide | Contenu |
|---|-------|---------|
| 1 | **Cover** | Titre accrocheur, badge "Audit IAO — [Nom Client]", date |
| 2 | **Le constat** | Outils dispersés, leads qui se perdent, 60% de temps administratif, pas de cerveau central |
| 3 | **Positionnement Chief AI Officer** | Tableau comparatif SaaS/Outil vs Chief AI Officer. **Message clé** : on ne vend pas un outil, on devient un partenaire stratégique long terme |
| 4 | **Métaphore biologique** | 🧠 Cerveau (Claude Code) → 🗡️ Système nerveux (Data OS) → 🦾 Membres (outils existants). Avant/après |
| 5 | **Couche d'agent** | Schéma en 3 couches : Couche Agent (Hermes) / Couche Cerveau (Claude) / Stack actuelle (CRM, portails...). **Message** : on ne remplace rien, on ajoute une couche d'intelligence |
| 6 | **Architecture 3 couches** | Data OS → Agents IA → Tools & Dev. Analogie OS (Windows/macOS) |
| 7 | **Data OS détaillé** | Spécifique niche client (immo, BTP, etc.) + pourquoi c'est puissant (pipeline unifié, actions auto, tableau de bord temps réel) |
| 8 | **Claude Code** | Senior dev IA qui travaille dans l'infrastructure. Ce qu'il fait concrètement + avantage |
| 9 | **Hermes Agent** | 6 cartes : Qualification 24/7, Relances auto, Daily Brief, Veille marché, Second cerveau, Workflows |
| 10 | **Daily Brief** | Rituel quotidien. Contenu (leads chauds, tâches, alertes, veille) + impact (cap clair, rien ne se perd) |
| 11 | **ROI** | 4 cartes : Temps gagné, Conversion +30%, Plus de mandats, Décisions data |
| 12 | **Méthodologie** | 4 étapes : R1 Diagnostic → Audit → CDC → Livraison (48h + monitoring 30j) |
| 13 | **Next Steps** | 3 étapes de l'audit du jour : Audit stack → Démo live → Feuille de route |
| 14 | **Questions** | Call-to-action. Préparer accès CRM et liste des outils |

## Règles de contenu

- **Jamais** de jargon technique non expliqué (pas de "webhook", "API", "LLM" sans vulgarisation)
- **Toujours** adapter les exemples à la niche du client (immo = fiches biens, mandats, portails, estimations)
- **Toujours** inclure la métaphore biologique — c'est le framework pédagogique clé pour un audit éducatif
- **Toujours** inclure le positionnement Chief AI Officer — ça justifie le recurring
- **Toujours** expliquer le Daily Brief — c'est le "wow" opérationnel

## Variante client-facing : outil de vente simplifié

Si le deck/CDC est destiné à un dirigeant non technique, un R2 commercial, une validation client ou un onboarding, **ne livre pas le format technique complet comme support principal**. Produis un bundle plus simple : hub + deck court + CDC lisible.

- Promesse claire : “un bras droit IA dans la poche”, “assistant métier”, “brief du matin”, “actions à valider”.
- 8–10 slides max : douleur, promesse, exemples concrets, avant/après, phase 1, plan de déploiement.
- CDC client : expliquer ce qu’on installe, ce que ça change au quotidien, ce qu’on ne fait pas, critères de réussite.
- Garder le CDC technique long pour l’équipe interne, pas pour le client.
- Pour un asset Loom commercial court sur Hermes / Second Brain / Data OS, préférer **un seul diagramme 16:9 + script 5–7 min** plutôt qu’un deck complet. Référence : `references/loom-hermes-infra-diagram.md`.
- Quand le deck AIOS/Hermes part dans tous les sens ou reste trop abstrait, utiliser l’angle **“cerveau opérationnel”** : mémoire métier + système nerveux + outils existants + brief quotidien. Référence : `references/aios-operational-brain-deck.md`.
- Pour vulgariser l’usage quotidien de l’AI OS, ajouter une séquence **routine dirigeant** : brief du matin → détection des failles → instruction vocale → COO IA → sous-agents → validation humaine → suivi cockpit dans le chat. Message clé : le dirigeant ne porte plus l’opérationnel, il pilote par intention. Référence : `references/dirigeant-aios-routine-slides.md`.
- Si la slide 1 est trop technique, la raccourcir radicalement : **“Votre entreprise pilotée par un cerveau IA.”** Puis ouvrir avec une séquence marché visuelle : révolutions industrielles → ère agentique → signal Stargate / infrastructure IA. Référence : `references/aios-agentic-era-deck.md`.
- Après une ouverture éducative forte, éviter la répétition : slides suivantes = risque de chaos sans pilotage → thèse AIOS → poste de pilotage/cockpit → usage concret → comparaison modèle agence vs modèle AIOS. Référence : `references/aios-offer-positioning-deck.md`.
- Référence détaillée : `references/client-facing-sales-tool-simplification.md`.

## Format technique

1. Générer un fichier HTML avec CSS inline (design dark, dégradés violets/bleus, Inter font)
2. Navigation clavier (flèches) pour présentation live
3. Export PDF 16:9 via Chrome headless :
   ```bash
   google-chrome --headless --disable-gpu --no-sandbox --disable-setuid-sandbox \
     --print-to-pdf=/tmp/output.pdf \
     --page-width=960pt --page-height=540pt \
     --run-all-compositor-stages-before-draw input.html
   ```
4. Vérifier avec `pdfinfo` : attendu `960 x 540 pts`

## Pitfalls

- **Ne pas oublier le Daily Brief** dans la première version (erreur fréquente)
- **Ne pas oublier la métaphore biologique** — c'est ce qui fait comprendre le concept
- **Ne pas oublier le positionnement** — sans ça le client compare à un SaaS
- **Adapter les couleurs** si le client a une charte graphique (optionnel)
- **Tester l'impression PDF** avant l'audit — Chrome headless peut couper des éléments si les slides débordent

## Variantes

- **Niche immo** : pipeline lead→RDV→estimation→mandat→vente, portails immobiliers, fiches de visite
- **Niche BTP** : devis, chantiers, sous-traitants, facturation, relance devis
- **Niche finance** : courtage, compliance, dossiers clients, rendez-vous
- **Niche e-commerce** : panier abandonné, SAV, réapprovisionnement, meta ads


## Consolidated reference: audit deck variant

The previous `iao-audit-deck` skill is now a reference under this umbrella. Treat it as the shorter educational-deck variant; this umbrella remains the canonical IAO physical audit presentation workflow.

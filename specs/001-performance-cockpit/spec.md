# Feature Specification: Module Performance (cockpit de conversion)

**Feature Branch**: `001-performance-cockpit`
**Created**: 2026-06-21
**Status**: Draft (exemple rétrospectif — le module est déjà construit)
**Input**: "Un cockpit qui montre la performance de bout en bout : acquisition → booking → closing → cash, avec objectifs et santé par pôle."

## User Scenarios & Testing *(mandatory)*

Le module sert un manager (Thomas) qui veut, en un écran, savoir si la machine commerciale performe et où ça coince.

### User Story 1 — Lire la performance commerciale sur une période (Priority: P1)
Le manager choisit une période (calendrier) et voit les 5 KPI clés (Leads→R1, Taux de show, Taux de close, CA, ROI) avec l'écart à l'objectif (vert/rouge).

**Why this priority**: c'est la valeur cœur — sans ça, pas de cockpit.
**Independent Test**: ouvrir `/cockpit`, choisir « 30 derniers jours », vérifier que chaque card affiche valeur + variant vs objectif + cible.
**Acceptance Scenarios**:
1. Étant donné une période, quand des leads/R1/ventes existent, alors les 5 KPI reflètent les vraies données Convex de la période.
2. Étant donné un KPI sous son objectif, alors le variant s'affiche en rouge (▼) ; au-dessus, en vert (▲).

### User Story 2 — Diagnostiquer chaque pôle (Priority: P1)
Le manager voit, par pôle (Setters, Closers, Meta Ads), un score /100, les KPI clés avec tendance, et un diagnostic auto.

**Why this priority**: transforme « rouge » en « pourquoi rouge » → actionnable.
**Independent Test**: vérifier que chaque scorecard a un score, une barre de progression colorée, et un diagnostic cohérent avec les chiffres.
**Acceptance Scenarios**:
1. Étant donné un taux de close < 70% de l'objectif, alors le diagnostic Closers = « coaching closing ».
2. Étant donné un CTR en baisse > 15% vs période précédente, alors le diagnostic Meta Ads = « fatigue créative ».

### User Story 3 — Définir et suivre les objectifs (Priority: P2)
Le manager ouvre « Objectif » (par section) et fixe les cibles ; les variants et seuils s'y réfèrent.

**Independent Test**: changer un objectif → vérifier que les variants des cards se recalculent et que la valeur persiste (rechargement).
**Acceptance Scenarios**:
1. Le bouton Objectif de « Performance commerciale » n'édite QUE les cibles commerciales ; celui de « Performance globale » que les financières.

### Edge Cases
- Période sans donnée → tout à 0, aucun crash, diagnostics neutres.
- Aucun objectif défini → valeurs par défaut (table `prospection_objectives`).
- Pas de dépense pub → CPL/ROI non divisés par zéro.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Le système DOIT calculer chaque KPI à partir d'une source Convex réelle (aucune valeur fictive).
- **FR-002**: Le système DOIT scoper les KPI commerciaux à la période choisie (calendrier from/to/tzOffset).
- **FR-003**: « Performance globale » DOIT être en cumul total (indépendant du calendrier).
- **FR-004**: Le no-show DOIT être [NEEDS CLARIFICATION: source du no-show — résolu : `crm_contacts.lostReason='non_presentation'`, lostStage r1 ; shows = R1 bookés − no-shows].
- **FR-005**: « Taux de close » DOIT = ventes ÷ [NEEDS CLARIFICATION: R1 bookés ou R1 tenus — résolu : R1 bookés].
- **FR-006**: « Total ventes » DOIT = [NEEDS CLARIFICATION: deals closés ou clients ayant payé — résolu : clients ayant payé ≥1 encaissement, distinct de « Ventes » funnel].
- **FR-007**: La monnaie DOIT être [NEEDS CLARIFICATION: € ou CHF — résolu : CHF, format fr-FR].
- **FR-008**: « En retard » DOIT s'appuyer sur une échéance par versement [NEEDS CLARIFICATION: pas de date due en base — résolu : ajout `onboarding.dueDates`].
- **FR-009**: Le Score Santé /100 DOIT agréger [NEEDS CLARIFICATION: formule/poids — résolu : 30% show + 30% close + 20% CPL + 20% CA].
- **FR-010**: La « fatigue » humaine DOIT dériver de [NEEDS CLARIFICATION: source — résolu : complétion des objectifs auto Cockpit Setter] ; la fatigue Meta Ads = tendance CTR.
- **FR-011**: Le design DOIT réutiliser le langage visuel existant (tokens soren, icônes lucide, accent #FF4D00).

### Key Entities
- **prospection_objectives** : cibles par workspace (leadsR1, tauxShow, tauxClose, ca, roi, ventes, cashContracte, panierMoyen).
- **prospection_health_history** : snapshot quotidien du score (évolution 7j/30j).
- Lectures : `performance.funnel`, `mediaBuyer.dashboard`, `paiement.overview`, `prospectionCockpit.{healthScore,teamScorecards}`.

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: 100% des chiffres affichés ont une source Convex traçable (0 valeur inventée).
- **SC-002**: Le manager identifie le pôle en difficulté en < 5 secondes (score + diagnostic).
- **SC-003**: Changer un objectif met à jour tous les variants concernés sans rechargement.
- **SC-004**: Aucune erreur console au rendu ; `/cockpit` répond 200.

## Assumptions
- Le module lit la prod Convex `standing-malamute-439`.
- Les objectifs auto Cockpit Setter (`setter_tasks`) alimentent le signal de charge/fatigue.

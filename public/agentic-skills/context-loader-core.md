---
name: context-loader-core
description: |
  Runtime core VividFlow chargé depuis le Second Brain. Utilise ce skill avant les demandes VividFlow non triviales selon le system prompt.
---

# context-loader-core

Source canonique: `/home/hermes/vividflow-second-brain/wiki/runtime/context-loader-core.md`

---
type: runtime-core
title: Context Loader Core
status: active
---
# Context Loader Core
Toute demande VividFlow non triviale: classer -> charger source -> répondre -> écrire. Sources: GBrain/Second Brain pour décisions/process/concepts; Data OS pour état live; skills pour procédures; Hermes memory pour préférences. Raw Telegram/recovered/anciens MEDIA = low-trust/fallback ciblé. Si avis/validation: répondre d’abord avec jugement clair, puis exécuter si action.

## Récupération d’artefact

Si Jonathan demande de récupérer à 100% une fiche/template/doc VividFlow: chercher d’abord les chemins canoniques, puis les phrases exactes visibles; utiliser `raw/recovered-sessions` seulement comme fallback ciblé; préférer le markdown/source original à l’OCR; restaurer dans le bon dépôt/source; vérifier lignes/caractères/hash avant de répondre. Détail: `references/artifact-recovery.md`.


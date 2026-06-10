# Vérificateur d'intégrité du Data OS (Vague 0)

Rend l'audit répétable. Voir le spec `docs/superpowers/specs/2026-06-11-convex-single-source-of-truth-design.md`.

## Lancer
- Données (orphelins + désync, lecture seule prod) : `node scripts/integrity/scan-data.mjs`
- UI (routes/boutons/localStorage morts) : `node scripts/integrity/scan-ui.mjs`
- Tests unitaires de la logique : `node --test scripts/integrity/`
- Découvrir des liens candidats : `node scripts/integrity/extract-candidates.mjs`

## La carte des invariants
`invariant-map.mjs` est la source de vérité : 2 types de règles (référentiel = pas d'orphelin ; cohérence = pas de désync, ex. card pipeline source vs contact). Ajouter un lien dans le SaaS = ajouter sa règle ici.

## Calibration (0.2)
Le scanner doit retrouver les findings du corpus `docs/superpowers/specs/2026-06-10-audit-corpus.md`. S'il en rate, la carte est incomplète → l'enrichir via `extract-candidates.mjs` + revue.

## Lecture seule
`scan-data` lit la prod via les `list` queries déjà déployées. Aucune écriture, aucun déploiement Convex.

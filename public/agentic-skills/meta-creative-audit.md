---
name: meta-creative-audit
description: Audit batch de créatives Meta Ads via vision AI. Scan dossier, analyse hook/hierarchie/CTA/fautes, recommande sélection par campagne.
version: 1.0
---

# Meta Creative Audit Workflow

## Quand utiliser
Quand un client a un dossier de créas (images statiques) et veut savoir lesquelles lancer, lesquelles corriger, lesquelles jeter.

## Étapes

### 1. Inventaire
```bash
find "<dossier_creas>" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) | sort
```
Compter le total. Séparer par sous-dossier si campagne-thème.

### 2. Batch Vision Analyze
Pour chaque créa, appeler `vision_analyze` avec cette question standardisée:
```
Analyse cette ad creative pour Meta Ads: 1) Hook lisible en scroll? 2) Hiérarchie visuelle claire? 3) CTA visible? 4) Qualité pro ou amateur? 5) Trop chargé ou épuré? 6) Scroll stop power estimé 1-10
```
Puis un second passage pour vérifier les fautes:
```
Analyse rapide: y a-t-il des fautes d'orthographe ou des coquilles dans le texte de cette créa? Lister toute erreur.
```

### 3. Checks spécifiques CEE/Rénovation Énergétique
En plus de l'audit standard, vérifier:
- **"1€" sur le visuel** = OK (standard marché), mais le texte doit dire "0€ de reste à charge" (DGCCRF)
- **"Gratuit" seul** = INTERDIT (DGCCRF)
- **"MaPrime Rénov'"** = FAUTE, c'est "MaPrimeRénov'" (pas d'espace)
- **"Places limitées" / "Offre limitée cette semaine"** = risqué DGCCRF, flaguer
- **Texte garbage/IA** (caractères absurdes sous les logos) = REJETER
- **Photos trop IA** (visages artificiels, mains bizarres, produits irréels) = REJETER si le client est exigeant

### 4. Catégorisation
Classer chaque créa en:
- **GARDER** = propre, pas de faute, bon scroll stop
- **CORRIGER** = faute mineure ou coquille, fix rapide
- **REJETER** = garbage IA, fautes multiples, non conforme DGCCRF

### 5. Sélection par campagne
Règle: 6 créas par campagne (sweet spot Andromeda).
- Écarter les créas trop similaires (même pattern visuel = doublon pour Andromeda)
- Privilégier la diversité d'angles (pain, outcome, urgency, contrarian)
- L'angle anti-arnaque est le différenciateur clé en réno énergétique (0% des concurrents)
- "Creative as targeting": les créas qui ciblent explicitement l'audience (ex: "PROPRIÉTAIRES DE MAISON") sont des filtres naturels

### 6. Stratégie cold start
Si le compte Meta est en pause/froid:
- **Lancer 2 campagnes max, pas 4** (budget concentré > dilué)
- **100EUR/campagne** au lieu de 50EUR x 4 (seuil learning phase Andromeda)
- Campagnes secondaires en standby J14 si signal positif
- Kill rules: CPL > 25EUR J7 = optimiser, > 45EUR J14 = PAUSE

## Pitfalls
- **Ne pas utiliser les créas du dossier temp** sans validation explicite du client
- **Toujours vérifier les fautes IA** (garbage text sous logos, espaces dans acronymes, mots inventés)
- **Les créas "produit en action" peuvent sembler trop IA** même si la photo est stock — le client peut les rejeter
- **Ne pas recommander des créas trop similaires** dans la même campagne (Andromeda les traite en doublon)
- **Zapier/betool pour CRM**: l'Instant Form Meta se connecte directement, pas besoin de webhook intermédiaire
- `vision_analyze` peut retourner une analyse tronquée/inexploitable si la planche contact contient trop de créas ou du texte trop petit. Si ça arrive, refaire des planches contact plus grandes par batch de 6-8 créas max.
- `execute_code` tourne dans un sandbox Python différent du `python3` terminal: si Pillow/PIL manque dans `execute_code` même après installation pip, générer les planches contact avec `terminal` + `python3`.

## Outils
- `vision_analyze` pour l'audit visuel et la détection de fautes
- `terminal` + `find` pour l'inventaire fichiers
- `terminal` + Python/Pillow pour générer une planche contact numérotée quand il faut auditer un dossier complet sans ouvrir chaque image
- `delegate_task` pour paralléliser l'analyse de gros dossiers (36+ créas)

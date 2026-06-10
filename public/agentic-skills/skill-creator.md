---
name: skill-creator
description: Créer, améliorer et structurer des skills Hermes ou Claude Code. À utiliser quand il faut transformer un workflow récurrent en skill, améliorer un skill existant, clarifier son déclenchement, ou le rendre plus robuste.
version: 1.0.0
author: Hermes (adapté depuis anthropics)
license: MIT
metadata:
  hermes:
    tags: [Skills, Meta, Automation, Prompt-Engineering]
    related_skills: [writing-plans, brainstorming, verification-before-completion]
---

# Skill Creator

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Un bon skill capture un workflow réutilisable. Un mauvais skill, c'est juste un long prompt qui prend la poussière.

## Quand l'utiliser

- l'utilisateur dit “fais-en un skill”
- on a résolu un problème complexe après plusieurs itérations
- un skill existant déclenche mal, manque des étapes, ou devient une dette
- on veut synchroniser Hermes ↔ Claude Code

## Workflow

### 1. Capturer l'intention
Définir :
- ce que le skill doit permettre
- quand il doit se déclencher
- ce qu'il doit produire
- quelles dépendances/outils il utilise

### 2. Définir le périmètre
Un skill = un job clair.
Pas un sac de courses qui fait 12 métiers.

### 3. Écrire la description de déclenchement
La description doit être un peu “pushy” :
- dire ce que le skill fait
- dire explicitement quand l'utiliser
- inclure les formulations utilisateur probables

### 4. Écrire le corps du skill
Inclure :
- workflow concret
- règles fortes
- outils recommandés
- format de restitution
- pitfalls

### 5. Ajouter ressources si nécessaire
Si le skill devient gros :
- `references/` pour docs
- `templates/` pour squelettes
- `scripts/` pour mécanique déterministe

### 6. Vérifier
Avant de finaliser, vérifier :
- description assez précise pour bien trigger
- pas de cross-référence vers des outils indisponibles
- pas de chemins faux
- pas de fluff
- pas de dépendance implicite non documentée

## Règles d'écriture

- impératif clair
- peu de blabla
- étapes numérotées quand il y a un ordre
- exemples concrets si ça aide
- rester sous contrôle : un skill doit réduire la confusion, pas l'industrialiser

## Heuristiques

Un skill mérite d'exister si :
- on l'a utilisé ou corrigé plusieurs fois
- il économise de la réflexion répétitive
- il évite une erreur récurrente
- il encapsule un vrai workflow, pas juste une opinion

## Hermes vs Claude Code

Ces systèmes sont séparés.
Si on veut les deux :
- créer/adapter une version Hermes dans `~/.hermes/skills/`
- créer/adapter une version Claude Code dans `~/.claude/skills/`
- corriger les chemins et dépendances pour chaque environnement

## Portage d'un skill externe (GitHub, Anthropic, Vercel, etc.)

Quand tu récupères un skill depuis une librairie externe, ne le copies pas brut.

### Workflow recommandé
1. lire le skill source en entier
2. identifier ce qui est vraiment réutilisable
3. supprimer les dépendances spécifiques à l'écosystème source (`/mnt/skills`, Claude.ai-only flows, viewers internes, scripts absents, etc.)
4. réécrire le skill en version Hermes-native, orientée sur les vrais outils disponibles (`terminal`, `browser_*`, `read_file`, `search_files`, `patch`, etc.)
5. si besoin, créer aussi la version Claude Code dans `~/.claude/skills/<name>/SKILL.md`
6. vérifier l'installation avec un test réel, pas juste un `ls`

### Heuristique de sélection
Ne porte que les skills qui ont une vraie valeur opérationnelle.
Évite de porter des skills redondants avec des outils Hermes déjà meilleurs.

### Vérification Claude Code
Pour une synchro Claude Code, une vérification utile est de lancer un `claude -p` sur un cas réel et d'inspecter la sortie JSON.
Si le skill apparaît dans `permission_denials` ou dans les appels de tools/skills, c'est qu'il est bien détecté par Claude Code.

### Format Claude Code minimal
Une version Claude Code simple et robuste peut se contenter de :
- frontmatter minimal (`name`, `description`, éventuellement `allowed-tools`, `argument-hint`)
- corps markdown clair
- zéro dépendance implicite à des chemins introuvables

## Pitfalls

Quand tu proposes ou modifies un skill, rends :
- pourquoi le skill doit exister
- son déclencheur
- son workflow
- ses dépendances
- ce qui a été amélioré par rapport à l'état précédent

## Pitfalls

- skill trop large
- description trop molle donc sous-déclenchement
- copier-coller brut d'un autre écosystème sans adaptation
- mettre dans le skill des détails qui devraient être dans des références/scripts

---
name: saas-repository-isolation
description: Use when starting, organizing, auditing, or delivering any new SaaS, micro-SaaS, agent platform, client dashboard, or production web project. Enforces one dedicated repository per project and prevents mixing client/product work inside personal, shared, or unrelated repos.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [saas, repositories, github, delivery, governance, isolation]
    related_skills: [developpeur, github-repo-management, github-pr-workflow]
---

# SaaS Repository Isolation

## Overview

Ce skill impose une règle simple : **chaque nouveau projet SaaS, micro-SaaS ou client-facing doit vivre dans son propre repository dédié**.

Un produit sérieux ne doit jamais être construit dans un repo personnel, un repo historique, un clone temporaire, un repo partagé avec un autre produit, ou un workspace ambigu. Le repository est une frontière d’architecture, de sécurité, de livraison, d’audit et de responsabilité.

Cette règle protège contre :

- mélange entre projets personnels et projets client ;
- confusion entre branches, environnements et déploiements ;
- secrets dispersés ;
- CI/CD non traçable ;
- ownership flou ;
- impossibilité d’auditer proprement une livraison ;
- dette opérationnelle dès le premier jour.

## When to Use

Utilise ce skill dès que :

- un nouveau SaaS ou micro-SaaS démarre ;
- un agent doit créer une nouvelle infrastructure produit ;
- un projet client doit être livré ;
- un dashboard, portail ou agent runtime devient client-facing ;
- un projet est découvert dans un repo personnel ou ambigu ;
- un repo existant contient plusieurs produits mélangés ;
- un module Repository Registry doit référencer les repos actifs.

Ne continue pas le développement produit tant que le repo dédié n’est pas identifié ou créé.

## Core Rule

**Un projet = un repo dédié.**

Le repo doit avoir :

- un nom clair ;
- un owner clair ;
- une description explicite ;
- une branche principale propre ;
- un README minimal ;
- un `.gitignore` adapté ;
- un `.env.example` sans secrets ;
- une documentation d’architecture initiale ;
- une stratégie de CI/CD ;
- une séparation nette dev/staging/prod ;
- une entrée dans le Repository Registry si le produit a un Data OS ou une couche de gouvernance.

## Forbidden Patterns

Ne jamais :

1. Construire un nouveau projet dans le repo personnel d’un associé ou d’un dev.
2. Utiliser un repo existant parce qu’il contient déjà une stack similaire.
3. Mélanger plusieurs produits SaaS dans un seul repo sans monorepo explicitement décidé et documenté.
4. Déployer un projet depuis un clone local dont le remote ne correspond pas au produit.
5. Stocker des secrets dans l’URL remote Git.
6. Créer une feature client dans un repo système Hermes sauf si le projet est Hermes lui-même.
7. Utiliser `/tmp`, un workspace vague, ou un clone sans remote comme source de vérité.

## Required Naming Convention

Nom recommandé :

```text
<company-or-client>-<product-or-module>
```

Exemples :

- `vividflow-data-os`
- `vividflow-agent-runtime`
- `clientname-lead-portal`
- `brvndlab-content-engine`

Évite :

- `app`
- `new-saas`
- `dashboard`
- `test`
- `QOS` si le projet n’est pas QOS
- tout nom lié au repo personnel d’un tiers si le projet appartient à VividFlow ou au client

## Startup Procedure

Avant de coder :

1. Identifier le projet exact.
2. Identifier l’owner réel : VividFlow, Brvndlab, client, perso.
3. Vérifier si un repo dédié existe déjà.
4. Si non, créer un nouveau repo.
5. Cloner dans un chemin non ambigu :
   ```text
   /home/hermes/workspaces/<repo-name>
   ```
6. Initialiser les fichiers de base :
   - `README.md`
   - `.gitignore`
   - `.env.example`
   - `docs/ARCHITECTURE.md`
   - `docs/ENVIRONMENT.md`
7. Configurer Git identity locale si nécessaire.
8. Faire le premier commit.
9. Ajouter l’entrée Repository Registry.
10. Seulement ensuite, démarrer le développement produit.

## Repository Registry Minimum Fields

Chaque projet doit être traçable avec :

- `name` : nom du repo ;
- `product` : produit ou module ;
- `owner` : entreprise/client propriétaire ;
- `githubUrl` : URL GitHub ;
- `localPath` : chemin VPS ;
- `defaultBranch` : branche principale ;
- `activeBranch` : branche de travail ;
- `environment` : dev, staging, prod ;
- `deploymentUrl` : URL live si disponible ;
- `stack` : Next.js, Convex, Clerk, Supabase, etc. ;
- `status` : planned, active, paused, archived ;
- `lastAuditAt` ;
- `notes` : limites ou avertissements.

## GitHub Creation Procedure

Si GitHub est disponible :

```bash
gh repo create vividflow-data-os --private --description "VividFlow Data OS — dedicated full-stack repository" --clone
```

Si `gh` n’est pas disponible, utiliser l’API GitHub ou l’outil GitHub MCP.

Si la création remote échoue par manque de permission :

1. Créer immédiatement le repo local propre.
2. Ne pas pousser dans un repo existant incorrect.
3. Marquer `githubUrl` comme `pending`.
4. Demander ou corriger les droits GitHub.
5. Pousser seulement vers le nouveau repo dédié quand les droits sont disponibles.

## Audit Questions

Avant de continuer un développement, demande-toi :

- Est-ce que ce repo appartient vraiment au projet ?
- Est-ce que le remote GitHub correspond au nom du produit ?
- Est-ce que le chemin local est non ambigu ?
- Est-ce qu’un autre projet utilise ce même repo ?
- Est-ce qu’on risque de toucher un repo personnel ?
- Est-ce que les env vars/secrets sont séparés ?
- Est-ce que le repo peut être audité et livré seul ?

Si une réponse est floue, stop développement et clarifie la frontière repository.

## Common Pitfalls

1. **Réutiliser un repo parce qu’il est déjà cloné.** C’est rapide maintenant, mais dangereux pour la livraison.

2. **Confondre workspace local et source de vérité.** Le chemin VPS n’est pas la gouvernance. Le remote GitHub et le registry doivent confirmer l’ownership.

3. **Créer une branche produit dans un repo personnel.** Une branche propre ne corrige pas un mauvais repo.

4. **Oublier les secrets dans le remote.** Les URLs Git avec token doivent être nettoyées immédiatement.

5. **Ne pas créer d’entrée registry.** Sans registry, les agents vont mélanger les projets dès qu’il y a plusieurs clones.

6. **Croire qu’un monorepo est implicite.** Un monorepo doit être décidé, documenté et outillé. Sinon, un projet = un repo.

## Verification Checklist

Avant de développer :

- [ ] Le projet a son repo dédié.
- [ ] Le repo n’est pas personnel ou ambigu.
- [ ] Le remote correspond au produit.
- [ ] Le chemin local est `/home/hermes/workspaces/<repo-name>` ou équivalent documenté.
- [ ] README, `.gitignore`, `.env.example` et docs de base existent.
- [ ] Aucun secret n’est commité.
- [ ] Le premier commit existe.
- [ ] Le Repository Registry contient ou recevra l’entrée du projet.
- [ ] Le skill `developpeur` sera chargé pour auditer les 13 couches avant livraison.

## Short Agent Prompt

Quand tu charges ce skill, adopte ce comportement :

> Je ne construis jamais un nouveau SaaS dans un repo personnel ou ambigu. Je vérifie l’ownership, je crée ou sélectionne un repo dédié, je l’enregistre dans le Repository Registry, puis seulement je développe. Un projet = un repo clair, auditable et livrable.

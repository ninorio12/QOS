---
name: remplir-template-r2
description: "Remplir template R2 — Use when creating or updating a VividFlow client R2 presentation deck (the 5-page template : état des lieux, contexte, maquette, schémas, CDC) from the client's CDC .md. Scaffolds a content file from a fixed design, fills it field-by-field from the CDC within strict character budgets, validates client isolation, and publishes to <slug>.vividflow.co. Use once a client CDC (cahier des charges, produced by client-cdc-brainstorming) is ready for the R2 présentation."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [vividflow, presentation, content, ssg, vercel, client]
    related_skills: [client-cdc-brainstorming, workspace-dispatch]
---

# Remplir template R2 — présentation client VividFlow

## Overview

Chaque présentation client VividFlow = 5 pages HTML au design **figé** (identique pour tous les clients). Ton seul travail : remplir le **texte** propre au client. Tu ne touches JAMAIS au design/CSS/HTML — un moteur injecte tes valeurs dans les "trous" marqués `data-f`.

Le projet vit dans `/home/hermes/workspaces/vividflow-presentation`. Tout passe par **4 commandes**. Tu édites **un seul fichier** : `content/<slug>.json`.

Garde-fous intégrés (la validation échoue avec un message précis si l'un saute) :
- **Budget** : chaque champ a un max de caractères — impossible de casser la mise en page.
- **Complétude** : chaque champ doit être rempli. Un champ vide = erreur (PAS de retombée silencieuse sur les données d'un autre client).
- **Isolation client** : les champs **identité** (marqués `⚑`) doivent être propres à CE client — ni la valeur d'exemple Schmid, ni celle d'un autre client. Toute collision est bloquée.

## Source du contenu — pipeline CDC

Le contenu de la présentation ne s'invente pas : il vient du **cahier des charges client** produit par le skill **`client-cdc-brainstorming`** (`imported-cohorte-aios/client-facing`), à partir des sources client (onboarding, call tl;dv/Fathom, audit, Notion). Pipeline :

```
client-cdc-brainstorming  →  cdc-<slug>.md  →  vividflow-presentation (remplit + publie le deck)
```

Avant de remplir, récupère le CDC du client (`/workspace/outputs/clients/<slug>/cdc-<slug>.md` ou la fiche Data OS). Mapping sections CDC → pages/champs du deck :

| Section du CDC | Page / champs du deck |
|---|---|
| Analyse client (activité, zone, équipe, outils, douleurs) | **État des lieux** (`edl_*`, `daily`, chips) |
| Douleurs → bénéfices cibles | **Contexte** (`pain1-6` → `gain1-6`) |
| Second Brain + connexions outils + agents + cas réels | **Schémas** (`sch_item*`, `sch_chat*`) |
| Périmètre MVP / modules installés | **Maquette** (modules sidebar, KPIs, dossiers) + **CDC** « Ce qu'on installe » (`cdc_mod*`) |
| Plan de livraison | **CDC** « Étapes » (`cdc_step*`) |
| Sécurité / permissions / HITL | **CDC** « Sécurité » (`cdc_sec*`) |
| Hors-périmètre + inclus | **CDC** inclus / non-inclus (`cdc_inc*` / `cdc_exc*`) |
| Positionnement + critères de succès | `edl_intro`, `cdc_objective`, `cdc_crit*` |

Respecte la doctrine du CDC (Hermes = agent opérateur, pas chatbot ; Second Brain obligatoire ; HITL ; pas de refonte imposée). Si pas de CDC encore : lance d'abord `client-cdc-brainstorming`.

**Deux familles de champs (règle cruciale).** Le deck est une **démo crédible**, pas un copier-coller du CDC :
- **FACTUEL** (vient du CDC, ne jamais inventer) : nom, secteur, zone, chiffres, douleurs, bénéfices, modules, périmètre, étapes, sécurité, critères, objectif.
- **ILLUSTRATIF** (mockup plausible à fabriquer, cohérent avec le CDC) : données d'écran de la **maquette** (chiffres KPI, noms de dossiers, statuts) et **scénario de chat** des schémas. Pour Schmid on a fabriqué « Immeuble Riviera / Villa Sion » et un échange « fuite à Riviera » — invente l'équivalent pour le client, jamais les valeurs Schmid.

**SOP détaillé + exemple d'or** : lis `references/cdc-to-deck-schmid.md` (mapping réel CDC Schmid → chaque champ) et la sortie `/home/hermes/workspaces/vividflow-presentation/content/schmid-signature.json` (deck Schmid entièrement rempli). C'est le modèle exact à reproduire.

## When to Use

- Un onboarding client est assez complet pour produire sa présentation.
- On te demande de créer/mettre à jour la présentation d'un client.
- **Don't use for** : modifier le design, ajouter une page, changer la structure — ça, c'est un humain qui le fait dans les templates.

## Le workflow (4 commandes)

Toujours depuis `/home/hermes/workspaces/vividflow-presentation` :

```bash
cd /home/hermes/workspaces/vividflow-presentation

# 1. Crée un squelette LÉGER : seulement les ~81 champs obligatoires, chaque
#    valeur = un placeholder "<< rôle · max N · tags >>" qui dit quoi écrire.
node scripts/cli.mjs new <slug> "Nom du client"

# 2. (au besoin) format + exemples Schmid de chaque champ
node scripts/cli.mjs form

# 3. Valide : remplissage complet + budgets + isolation inter-clients
node scripts/cli.mjs check <slug>

# 4. Publie : build + deploy + attache <slug>.vividflow.co + imprime l'URL live
node scripts/cli.mjs publish <slug>
```

`<slug>` = identifiant en minuscules-avec-tirets (ex. `acme-regie`). Il devient l'URL : `https://acme-regie.vividflow.co`.

> **Titre de l'onglet (nom à côté du favicon).** Les templates contiennent un `<title>` figé « Schmid Signature » — ce n'est PAS un champ `data-f`. Le build le réécrit automatiquement en **« Présenté par VividFlow »**, identique pour tous les clients et les 5 pages (constante `TAB_TITLE` dans `scripts/build.mjs`). Tu n'as donc **rien à faire** côté contenu, et tu ne touches JAMAIS au `<title>` des `templates/` (partagés). Après `publish`, vérifie juste que l'onglet affiche « Présenté par VividFlow » et plus « Schmid Signature ».

## Comment remplir `content/<slug>.json` (simple)

`new` te donne un JSON où **chaque valeur est un placeholder explicite** :

```json
"daily": "<< Synthèse du quotidien · max 90 · ⚑ unique >>",
"mq_row7t": "<< Dashboard · 'Dossiers sous suivi' ligne 1 · max 30 · ⚑ unique · À FABRIQUER (mockup plausible, PAS dans le CDC) >>"
```

Ton job : **remplacer chaque `<< … >>` par la vraie valeur**. Le placeholder te donne déjà le rôle, le budget (`max N`) et les tags. Pas besoin d'aller chercher ailleurs (mais `form` montre les exemples Schmid si tu hésites sur le format).

- Seuls les **~81 champs obligatoires** sont là. Les ~73 **optionnels** (copy produit : modules, étapes, sécurité…) sont **omis** → ils gardent automatiquement le défaut produit. Pour en personnaliser un, ajoute sa clé (liste : `form`).
- `⚑ unique` = champ identité : propre à CE client, jamais Schmid ni un autre client.
- `À FABRIQUER` = donnée de **démo** (écrans maquette, chat) : invente du plausible cohérent avec le CDC (≠ FACTUEL qui vient du CDC).
- Respecte le budget. Garde le **format HTML** quand l'exemple en a un (`3 <small>/ 15</small>`, `<b>…</b>`).
- Tout `<< … >>` non remplacé fait **échouer** `check`.

Les champs réutilisés sur plusieurs pages (ex. `brandClient`) se remplissent **une seule fois**.

### Isolation — ne jamais utiliser les infos d'un autre client
- Ne **copie pas** un `content/*.json` existant comme base : `check` bloque toute valeur identité partagée entre deux clients (`COLLISION`).
- Ne **recopie pas** les exemples Schmid du formulaire : un champ `⚑` resté à la valeur Schmid est rejeté (fraîcheur).
- Pars toujours d'un `new <slug>` **neuf** (placeholders) et remplis depuis le CDC du client concerné, et lui seul.

## Règles de rédaction

- **Reste dans le budget.** `check` te dit `daily : 151/90 car.` si tu dépasses — raccourcis.
- **Garde les balises de l'exemple.** Si l'exemple contient `<b>…</b>`, `<strong>…</strong>` ou `<small>…</small>`, reproduis la même structure HTML dans ta valeur.
- **Cohérence client.** Le prénom du dirigeant, les noms de dossiers, les chiffres, les outils et les messages du chat WhatsApp doivent être ceux du vrai client (issus de l'onboarding).
- **Ton VividFlow.** Phrases courtes, concrètes, orientées résultat — comme les exemples.

## Common Pitfalls

1. **Copier le fichier d'un autre client comme base.** Interdit — risque n°1 de fuite inter-clients. Toujours `new <slug>` (fichier vide) et remplir depuis l'onboarding de CE client. `check` bloque les collisions, mais ne t'y fie pas : pars de zéro.
2. **Éditer les `templates/`.** Non. Tu n'édites que `content/<slug>.json`. Le design est figé.
3. **Casser le JSON** (virgule/guillemet manquant). `check` te le dira (`JSON invalide`). Revalide après chaque édition.
4. **Recopier un exemple Schmid.** Les exemples du formulaire montrent le format, pas le contenu. Un champ identité `⚑` resté en valeur Schmid est rejeté.
5. **Laisser un champ vide.** Échec `check` (`champ vide`). Tout doit être rempli.
6. **Dépasser le budget.** Raccourcis ; ne contourne pas — le filet protège la mise en page.
7. **Oublier le format HTML d'un champ** (ex. enlever le `<small>/ 15</small>` d'un objectif). Garde la même forme que l'exemple.
8. **Inventer un slug avec des espaces/majuscules.** Minuscules + tirets uniquement.

## Verification Checklist

- [ ] `node scripts/cli.mjs check <slug>` passe : complet, budgets OK, isolation OK.
- [ ] Aucun champ identité `⚑` resté en valeur Schmid (sinon `check` échoue).
- [ ] Aucune collision avec un autre client (sinon `check` échoue).
- [ ] Aucun reste Schmid involontaire (warnings de `check` revus un par un).
- [ ] `node scripts/cli.mjs publish <slug>` imprime `✅ LIVE : https://<slug>.vividflow.co`.
- [ ] Les 5 pages s'ouvrent (`/`, `/contexte`, `/maquette`, `/schemas`, `/cdc`) sous ce sous-domaine.
- [ ] **Titre de l'onglet** (nom à côté du favicon) = « Présenté par VividFlow » sur les 5 pages, **pas** « Schmid Signature » (réécrit automatiquement au build).

## One-Shot Recipe

Nouveau client « ACME Régie », slug `acme-regie` :

```bash
cd /home/hermes/workspaces/vividflow-presentation
node scripts/cli.mjs new acme-regie "ACME Régie"   # lis le formulaire imprimé
# → édite content/acme-regie.json avec les infos ACME (nom, dirigeant, zone, dossiers, chiffres, chat…)
node scripts/cli.mjs check acme-regie              # corrige jusqu'à "budgets OK" + 0 reste Schmid
node scripts/cli.mjs publish acme-regie            # → https://acme-regie.vividflow.co
```

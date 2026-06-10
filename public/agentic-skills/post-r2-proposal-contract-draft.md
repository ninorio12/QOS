---
name: post-r2-proposal-contract-draft
description: "Use when an R2 sales/closing call is finished and Client Delivery needs the post-call client pack: L3 proposal PDF with quoted price, contract draft PDF, and outbound email draft with HITL validation before sending from Client Delivery email. Trigger phrases: après R2, propale, contrat, draft Gmail, mail de suivi, prix cité dans le call."
version: 1.0.0
author: Hermes
license: MIT
metadata:
  hermes:
    tags: [clientops, aios, r2, proposal, contract, gmail, hitl]
    related_skills: [r1-r2-client-presentation, client-contract-documents, google-workspace, tldv-api, calendly-api, ghl-api, second-brain-ops]
---

# Post-R2 Proposal + Contract + Email Draft

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## Overview

Ce skill transforme un R2 fraîchement terminé en pack d’envoi client :

1. **Proposition L3 PDF** — résumé client-facing de ce qui a été vu, périmètre phase 1, bénéfices, prochaines étapes, **prix cité dans le call**.
2. **Contrat draft PDF** — structure facturante Client Delivery, objet, périmètre, prix, durée, conditions, champs légaux à compléter si non vérifiés.
3. **Email draft** — texte prêt à envoyer avec les deux PDFs en pièces jointes.
4. **HITL obligatoire** — aucun envoi externe sans validation humaine explicite.
5. **Envoi depuis Client Delivery email** — si les accès Gmail ne sont pas disponibles, alerter operator avec le récap précis de ce qu’il doit connecter.

Opinion ferme : après un R2, il faut envoyer vite, propre et vérifiable. Le client ne doit pas recevoir un roman, ni un contrat bricolé avec des infos légales inventées. On produit du solide, puis humain dans la boucle.

## When to Use

Utilise ce skill quand l’utilisateur dit :

- “après le R2, fais la propale / contrat / mail”
- “mets-moi ça en draft Gmail”
- “crée le draft du contrat et de la proposition”
- “prix cité dans le call”
- “envoie depuis le mail AIOS / ClientOps après validation”
- “prépare le mail post-call avec les PDFs”

Ne l’utilise pas pour :

- un simple email de relance sans documents ;
- un CDC complet avant R2 — utiliser plutôt `r1-r2-client-presentation` ou `client-cdc-brainstorming` ;
- une implémentation client signée — utiliser `client-implementation`.

## Golden Rule: HITL Avant Tout Envoi

**Zéro exception : ne jamais envoyer directement au client.**

Workflow autorisé :

1. Créer les documents.
2. Créer le draft email ou texte copiable.
3. Montrer le récap à l’utilisateur.
4. Attendre validation explicite : “ok envoie”, “validé”, “tu peux envoyer”.
5. Envoyer uniquement si les accès sont disponibles et le destinataire est confirmé.

Si validation absente : rester en draft.

## Inputs à Collecter

Avant génération, chercher automatiquement :

- nom client / entreprise ;
- prénom + email du décideur ;
- date et heure du R2 ;
- transcript / notes / event Calendar / tl;dv / iClosed / Calendly / Fathom public share ;
- prix annoncé dans le call ;
- devise ;
- structure facturante : ClientOps AI Consulting FZCO, AIOS, ou autre ;
- périmètre validé ;
- durée prévue ;
- conditions de paiement ;
- prochaine étape.

### Scope demandé par l'utilisateur

Ne force pas le pack complet si l'utilisateur demande seulement une **propal**. Dans ce cas :

1. extraire le transcript et le périmètre ;
2. générer uniquement la proposition client-facing PDF/HTML ;
3. fournir éventuellement un texte d'email copiable si utile ;
4. ne pas créer de contrat draft sauf demande explicite.

Le skill reste le bon umbrella, mais le livrable doit suivre la demande exacte. Un contrat non demandé, c'est du zèle administratif — donc du bruit.

### Sources à inspecter dans l’ordre

1. **Second Brain/Data OS** : `wiki/index.md`, pages client, raw sessions, outputs existants.
2. **Calendar/Calendly/iClosed/tl;dv/Fathom** selon l’origine du call.
   - Si un lien `<url> est fourni, charger/consulter aussi `aios-client-operations` → `references/fathom-public-share-extraction.md`.
   - Extraire `props.copyTranscriptUrl` depuis le `data-page` HTML ; l'endpoint renvoie souvent un JSON avec `html` même si le transcript n'est pas visible dans la page initiale.
   - Si `bs4` manque, ne pas installer par réflexe : utiliser `html.parser` stdlib pour parser `data-page` et convertir l'HTML en texte.
3. **GHL/CRM** si email ou contact manquant.
4. **Documents existants** dans `/workspace/outputs/contracts/`, `/workspace/outputs/clients/`, `/workspace/wiki/`.
5. **Recherche web uniquement pour données publiques** comme email générique ou mentions légales — ne jamais inventer.

Si une info critique manque, utiliser une hypothèse visible ou laisser `À compléter`, mais ne pas fabriquer.

## Prix et Devise

Le prix est central. Il doit apparaître :

- dans la proposition L3 ;
- dans le contrat ;
- éventuellement dans le footer ou résumé exécutif ;
- dans le récap interne à l’utilisateur.

Règles :

- Extraire le prix du call/transcript si disponible.
- Si plusieurs prix apparaissent, signaler l’ambiguïté et choisir celui relié à “phase 1 / offre / accompagnement / setup”.
- Si devise étrangère : conserver la devise client et, pour les rapports internes, convertir en € si demandé.
- Si prix absent : demander à l’utilisateur ou produire un document avec champ `Prix : à confirmer` — pas de tarot divinatoire.

## Proposition L3 — Structure Recommandée

Créer un PDF client-facing clair, pas un deck interminable.

Sections :

1. **Titre orienté résultat**
2. **Ce qu’on a compris**
3. **Situation actuelle**
   - ce qui fonctionne ;
   - ce qui bloque.
4. **Phase 1 proposée**
   - briques livrées ;
   - logique de priorité.
5. **Livrables**
6. **Prix / investissement**
7. **Calendrier cible**
8. **Hors scope**
9. **Prochaine étape**

Ton : premium, concret, direct. Pas de “transformation digitale” flasque.

## Contrat Draft — Structure Recommandée

S’appuyer sur `client-contract-documents`.

Sections minimales :

1. Parties
2. Objet
3. Périmètre inclus
4. Durée et calendrier
5. Prix et modalités de paiement
6. Obligations du prestataire
7. Obligations du client
8. Confidentialité / accès / données
9. Hors scope
10. Propriété intellectuelle
11. Responsabilité
12. Signature

### Mentions légales

- Vérifier les infos publiques si possible.
- Si non vérifié : laisser `À compléter`.
- Pour ClientOps AI Consulting FZCO, ne jamais inventer numéro de licence, registration, adresse, représentant légal.
- Ajouter une note discrète : “draft opérationnel à relire juridiquement”.

## Email Draft — Format

Objet : `Suite à notre échange — proposition phase 1 [Client]`

Corps :

```text
Bonjour [Prénom],

Merci encore pour notre échange.

Comme convenu, je te joins une synthèse claire de la phase 1 que nous recommandons pour [Client].

L’idée n’est pas de tout automatiser d’un coup, ni d’ajouter un outil de plus. La première étape logique est d’installer [résumé simple du socle proposé].

Concrètement, cette phase permet de :
- [bénéfice 1] ;
- [bénéfice 2] ;
- [bénéfice 3] ;
- [préparer étape future].

Je t’ai également joint le draft contractuel correspondant pour validation des informations légales et administratives.

Dis-moi si tout est clair de ton côté, et on peut caler la prochaine étape de cadrage.

Bien à toi,
[Signature]
```

Pièces jointes :

- `[client]-proposition-l3-[date].pdf`
- `[client]-contrat-draft-[structure]-[date].pdf`

## Gmail / Google Workspace Workflow

Charger `google-workspace` avant d’opérer Gmail.

### Avant de créer un draft Gmail

1. Vérifier que Gmail API fonctionne.
2. Vérifier le compte expéditeur attendu : idéalement `<contact-email>` ou le mail demandé.
3. Confirmer le destinataire.
4. Attacher les bons PDFs.
5. Créer un **draft**, pas un send.

### Si Gmail API indisponible

Si erreur type :

- Gmail API disabled ;
- insufficient scopes ;
- token absent ;
- mauvais compte Google ;
- accès AIOS non connecté ;

Alors :

1. Générer quand même le texte copiable + PDFs.
2. Si possible générer un `.eml` local prêt à importer.
3. Envoyer un message à **operator** avec le récap des accès à connecter.
4. Dire à l’utilisateur ce qui est prêt et ce qui bloque.

Message operator recommandé :

```text
Hello operator — pour automatiser les drafts post-R2 depuis Hermes, il faut connecter le mail AIOS au bot.

Objectif : permettre à l’agent de créer uniquement des brouillons Gmail après R2, avec :
- proposition L3 PDF ;
- contrat draft PDF ;
- email de suivi prêt à valider ;
- zéro envoi sans validation humaine.

À connecter :
- compte expéditeur : <contact-email>
- Gmail API activée sur le projet OAuth utilisé par Hermes
- scopes Gmail draft/send nécessaires : gmail.modify + gmail.send
- accès Drive/Docs si on veut générer/archiver côté Google Docs

Quand c’est fait, je peux tester sur un draft interne avant tout usage client.
```

## File Naming

Utiliser :

```text
/workspace/outputs/contracts/[client-slug]-proposition-l3-[YYYY-MM-DD].pdf
/workspace/outputs/contracts/[client-slug]-proposition-l3-[YYYY-MM-DD].html
/workspace/outputs/contracts/[client-slug]-contrat-draft-[structure-slug]-[YYYY-MM-DD].pdf
/workspace/outputs/contracts/[client-slug]-email-draft-[YYYY-MM-DD].eml
/workspace/outputs/contracts/mail-drafts-[client-slug]-[YYYY-MM-DD].md
/workspace/raw/fathom/[YYYY-MM-DD]-[client-slug]-[salesperson-slug]-aios-r1.md
```

Slug : lowercase, sans accents, tirets.

Quand la propale est produite en HTML puis exportée PDF via Chrome headless, garder l'HTML source à côté du PDF : ça permet une correction rapide sans reconstruire tout le document.

## QA Obligatoire

Avant de dire “prêt” :

- PDF existe et taille > 0 ;
- si export Chrome headless : vérifier le texte avec `pdftotext` quand disponible, au minimum taille du fichier ;
- texte client au bon genre/prénom ;
- prix cohérent dans proposition + contrat ;
- deux PDFs attachés au draft/email ;
- pas de champ légal inventé ;
- pas de mention “Hermes” si le client doit lire “votre agent IA” ;
- pas d’envoi externe sans HITL ;
- lien/source du contact noté si email retrouvé automatiquement.

## Second Brain Sync

Après génération :

1. Mettre à jour ou créer la page client dans `wiki/entities/` si seuil atteint.
2. Ajouter : prix proposé, périmètre phase 1, statut, prochaine étape, documents générés.
3. Mettre à jour `wiki/index.md`.
4. Ajouter une entrée append-only dans `wiki/log.md`.

## Final Response Format

Répondre court :

```text
Pack post-R2 prêt pour [Client].

Inclus :
- proposition L3 : [path]
- contrat draft : [path]
- email draft : [draft Gmail / .eml / texte copiable]

Prix repris : [montant]
Destinataire : [email]
Statut : en attente validation humaine avant envoi.

Blocage éventuel : [si Gmail/AIOS non connecté]
```

## Common Pitfalls

1. **Envoyer trop tôt.** Draft only tant que l’utilisateur n’a pas validé.
2. **Inventer les mentions légales.** Laisser à compléter vaut mieux qu’un faux numéro.
3. **Oublier le prix.** C’est le cœur du post-R2.
4. **Mauvais compte expéditeur.** Client Delivery doit être explicite.
5. **Se tromper de Valérie/Valéry ou genre.** Vérifier prénom, genre et tournures.
6. **Confondre L3, CDC et contrat.** La propale L3 vend la logique ; le contrat cadre l’exécution ; le CDC détaille l’implémentation.
7. **Créer des docs sans email.** Le workflow complet finit par un draft de mail ou texte copiable.

## Verification Checklist

- [ ] Sources du R2 consultées.
- [ ] Prix extrait ou marqué à confirmer.
- [ ] Proposition L3 générée.
- [ ] Contrat draft généré.
- [ ] PDFs exportés et vérifiés.
- [ ] Email draft créé avec pièces jointes ou texte copiable fourni.
- [ ] Gmail/AIOS vérifié ; operator alerté si accès manquant.
- [ ] HITL respecté avant tout envoi.
- [ ] Second Brain mis à jour.

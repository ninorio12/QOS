---
name: scrape-prospect-list
description: Use when the user asks to scrape, build, collect, or enrich a list of B2B prospects/leads from the web (directories, maps, company sites, marketplaces) and output them to a Google Sheet or the Twenty CRM. Covers source selection, firecrawl vs browser-use decision, structured field extraction, dedup, sample-first validation, and RGPD/nLPD compliance. NOT for filling a VividFlow deck (use prospection-outbound for that).
version: 1.0.0
author: VividFlow
license: private
metadata:
  hermes:
    tags: [prospection, scraping, leads, outbound, firecrawl, browser-use, crm, sheets, rgpd]
    related_skills: [prospection-outbound, twenty-apps-vertical-crm]
---

# Scrape Prospect List — Playbook / SOP

## Mission

Construire une liste de prospects B2B **propre, dédoublonnée et exploitable**
à partir de sources web, puis la livrer dans un **Google Sheet** (par défaut) ou
le **CRM Twenty**.

Objectif qualité : zéro donnée inventée, format constant, source traçable pour
chaque ligne.

## Quand utiliser cette skill

- "scrape-moi une liste de prospects / leads"
- "trouve-moi X entreprises qui correspondent à ..."
- "enrichis cette liste avec emails / téléphones / décisionnaires"
- "remplis un Sheet de prospects depuis cet annuaire / Google Maps / ces URLs"

**Ne PAS utiliser** pour remplir un deck VividFlow → c'est `prospection-outbound`.

## Entrées requises (les 6 points)

Avant de scraper, tu dois avoir ces 6 éléments. S'il en manque, **demande-les
en une seule fois** (ne pose pas 6 questions séparées) :

1. **ICP / cible** — qui ? (secteur, taille, zone géo, critère de qualification)
2. **Source** — où ? (annuaire nommé, Google Maps, liste d'URLs, ou "à toi de proposer")
3. **Champs** — quelles colonnes ? (défaut ci-dessous)
4. **Volume** — combien pour ce batch ? (défaut : 50)
5. **Sortie** — Google Sheet (défaut) ou Twenty CRM
6. **Exclusions** — clients/concurrents/déjà contactés à exclure (optionnel)

Si la source n'est pas donnée : **propose 2-3 sources pertinentes et attends la
validation** avant de lancer le scraping.

## Schéma de sortie (colonnes par défaut)

```
societe | decisionnaire | role | email | email_source | telephone | site_web | ville | pays | source_url | statut_qualite | date_scrape
```

- `email_source` : URL exacte où l'email a été trouvé. **Vide si non trouvé.**
- `statut_qualite` : `ok` | `a_verifier` | `partiel`
- `date_scrape` : date du jour (demande-la si tu ne l'as pas — pas de devinette).

### Variante VividFlow — dirigeants Suisse romande

Quand la cible est VividFlow/outbound, **ne jamais rester sur “dirigeants Suisse romande” générique**. Les niches prioritaires validées sont :

- Immobilier : mandataires, agents immobiliers, courtiers.
- Cabinets de conseil : juridique, marketing, stratégie.

Quand l'utilisateur demande prénom/nom/email/téléphone de décideurs, utilise le schéma enrichi dans `references/suisse-romande-dirigeants-sheet.md` : canton, score qualité, décision filtre, sources email/téléphone, statut Data OS, et garde-fous nLPD/RGPD. Le téléphone doit être professionnel; si privé/incertain, ne pas l'utiliser et marquer `needs_review` ou `rejeté`.

Pour le pipeline VividFlow leads outbound avec Data Analyst → audit Coordinateur → import Agent Operations, applique aussi `references/leads-outbound-sop-and-quality-gate.md`.

Depuis la fusion des SOP outbound, le document d'exécution principal est `Acquisition Outbound` dans Data OS. Avant de lancer ou déléguer un scraping VividFlow, lis `references/vividflow-acquisition-outbound-master-sop.md` et vérifie le SOP vivant : `/home/hermes/workspaces/vividflow-data-os/docs/sops/acquisition-outbound.md`. Les anciens SOP scraping/email restent des annexes, pas des sources d'exécution.

### QA du travail Data Analyst (post‑remplissage)

Quand le Data Analyst a soumis un batch dans le sheet, le COO doit auditer ligne par ligne avant validation. Appliquer la checklist `references/coo-qa-data-analyst-sheet.md` : doublons entreprise, scope taille 5-25, score A injustifié, emails génériques, erreurs #ERROR!, niches hors priorités, liens deck invalides, absence de notes. Corriger dans le sheet puis éduquer l'agent en Slack dans `#email-outbound`.

Pour la mise à jour du sheet avec des valeurs accentuées, ne pas utiliser bash direct (conflit quotes/JSON). Utiliser Python via `execute_code` avec `json.dumps()` — voir le ref pour le pattern exact.

Si Jonathan/Thomas signalent une mauvaise qualité de scraping, ne te limite pas à un diagnostic. Applique le pattern `references/vividflow-outbound-agent-handoff.md` : colonnes `Statut ligne` + `Blocage / note Coordinateur`, SOP maître Data OS, fiches agents clarifiées, activity log.

## Arbre de décision outil

| Situation de la source | Outil à utiliser |
|---|---|
| Je ne sais pas encore où chercher | `web_search` pour identifier les sources |
| Page publique statique (site société, annuaire ouvert) | **`firecrawl` scrape + extract** (structuré) |
| Recherche large sur le web pour lister des entités | `firecrawl` search |
| Site avec login, JS lourd, pagination/filtres interactifs, Google Maps | **`browser-use`** (`browser_navigate/click/type/scroll/snapshot/vision`) |
| LinkedIn / source dont les CGU interdisent le scraping | **NE PAS scraper le site** — voir section Légal |

Règle : **firecrawl d'abord** (rapide, structuré, pas cher). Passe à browser-use
uniquement si firecrawl échoue (contenu derrière JS/login).

## Procédure pas à pas

1. **Cadrer** — confirme les 6 entrées. Reformule l'ICP en 1 phrase.
2. **Sources** — si non fournies, propose 2-3 sources + attends le go.
3. **Échantillon d'abord** — scrape **5 prospects**, montre-les à l'utilisateur
   au format final. **Attends validation** du format avant le batch complet.
4. **Batch** — scrape jusqu'au volume demandé, **une source à la fois**.
5. **Dédoublonnage** — par `email` puis par `domaine du site_web`. En cas de
   doublon, garde la ligne la plus complète.
6. **Contrôle qualité** — passe chaque ligne aux règles ci-dessous, remplis
   `statut_qualite`.
7. **Livraison** — crée/remplis le Google Sheet `Prospects – <batch> – <mois année>`
   via `google_workspace`, ou pousse dans Twenty (skill `twenty-apps-vertical-crm`).
8. **Compte-rendu** — résume : nb scrapés, nb retenus après dédup, nb avec email,
   sources couvertes, ce qui n'a pas pu être récupéré.

## Règles qualité absolues

- **Jamais d'email inventé.** Pas de pattern deviné `prenom@domaine.com`. Email
  seulement s'il apparaît sur une page réelle → renseigne `email_source`. Sinon vide.
- **Une source par ligne.** `source_url` toujours rempli, sinon la ligne est invalide.
- **Pas d'hallucination de société/personne.** Si incertain → `statut_qualite=a_verifier`.
- **Échantillon avant batch.** Toujours. Ça évite 50 lignes au mauvais format.
- **Volume respecté.** Si tu dois t'arrêter avant (source épuisée, blocage),
  dis-le explicitement — ne complète pas avec du remplissage.
- **Logue ce qui est tronqué.** Pages sautées, champs manquants : signale-les.

## Anti-échec VividFlow — ne pas remplir un Sheet, prouver des leads

Quand la mission est VividFlow/outbound, l'objectif n'est pas de “remplir un doc” mais de **prouver des opportunités commerciales exploitables**.

Pitfalls à éviter :

- Ne pas partir d'un ICP vague type “dirigeants Suisse romande”. Exiger une niche précise avant scraping : secteur, canton(s), taille/signaux, exclusions.
- Ne pas confondre entreprise et lead. Une entreprise + ville + site n'est pas un lead commercial. Un lead exploitable a au minimum : entreprise réelle, décideur identifié, rôle, source/preuve, et contact professionnel vérifiable.
- Ne pas traiter `a_verifier` comme un succès intermédiaire. Pour VividFlow, `a_verifier` est du bruit tant qu'il n'est pas prouvé.
- Ne pas utiliser Apollo comme source primaire. Apollo sert à enrichir/confirmer après une source primaire suisse vérifiable : local.ch, Google Maps, site officiel, annuaire métier.
- Ne pas scaler si les premières lignes sont faibles. Après 5-10 lignes, si le décideur, la source email ou la preuve manquent trop souvent, arrêter et changer la méthode/source.

Quality gate VividFlow : batch test de 10 leads maximum, viser environ 7/10 A/B avant tout cron ou batch quotidien. Qualité C = jamais importée.

Si Jonathan dit que “le scraping est de mauvaise qualité”, diagnostique d'abord la machine plutôt que les lignes : source trop faible, ICP trop large, absence de décideur nominatif, email non vérifié, source Apollo-only, déduplication absente, ou scaling lancé avant preuve 7/10 A/B. Réponse attendue : explication courte + correction opérationnelle source-first.

## Légal — RGPD / nLPD (Europe + Suisse)

- Données B2B (société, email pro générique type `contact@`, tel pro) : usage de
  prospection largement toléré, **mais** prévoir base légale + opt-out dans le
  cold email (mention de désinscription).
- Email **nominatif** d'une personne = donnée personnelle → minimise, garde la
  source, supprime sur demande.
- **LinkedIn** : le scraping viole les CGU (risque de ban). Ne scrape pas le site
  via browser-use. Passe par une source autorisée (export Sales Navigator manuel,
  ou API d'un fournisseur type Apollo/Lusha si configuré).
- Respecte `robots.txt` et les CGU de la source. En cas de doute, signale-le à
  l'utilisateur plutôt que de forcer.

## Suite logique (handoff)

- **CRM** : pousser les prospects retenus dans Twenty → `twenty-apps-vertical-crm`.
- **Deck perso** : pour un prospect chaud, générer le deck → `prospection-outbound`.
- **Cold email** : séquence d'envoi → skill `email/himalaya`.

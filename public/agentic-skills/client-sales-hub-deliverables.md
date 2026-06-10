---
name: client-sales-hub-deliverables
description: Créer pour un client Client Delivery un pack client-facing complet — hub public, deck, CDC simplifié et maquette Data OS — à partir d'un call/audit/CDC, avec style premium type Example Client, vulgarisation forte d'Hermes comme agent IA d'actions réelles, export PDF/PNG, déploiement Vercel et mise à jour DataOS. Utiliser quand operator demande un hub, deck, CDC, support client, lien public ou maquette Data OS pour un futur client.
version: 1.0.0
author: AIOS / Hermes
license: MIT
metadata:
  hermes:
    tags: [clientops, aios, client-facing, hub, deck, cdc, data-os, vercel]
    category: clientops
    related_skills: [client-cdc-brainstorming, clientops-data-os, deploy-to-vercel, powerpoint, claude-design]
---

# Client Sales Hub Deliverables — Hub + Deck + CDC + Maquette Data OS

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## Overview

Ce skill transforme un cadrage client Client Delivery en **support de vente client-facing complet** :

- hub public simple avec 3 cartes ;
- deck de présentation clair ;
- CDC simplifié lisible client ;
- maquette Data OS concrète ;
- exports PDF/PNG ;
- déploiement Vercel public noindex ;
- attachement/remplacement propre dans la fiche DataOS.

Le but n'est pas de faire joli pour faire joli. Le but est que le client comprenne : **Hermes n'est pas un chatbot. C'est un agent IA capable de faire avancer de vraies actions dans son business, avec validation humaine.**

## When to Use

Utiliser quand operator demande :

- “fais le hub client” ;
- “prépare le deck + CDC” ;
- “crée la maquette Data OS” ;
- “donne-moi le lien du hub” ;
- “refais comme Example Client” ;
- “refais exactement comme Valérie / Bouquet Suprême” ;
- “le deck ne montre pas assez la puissance d'Hermes” ;
- “on doit envoyer un support à un prospect/client”.

Charger aussi :

- `client-cdc-brainstorming` pour le cadrage phase 1 et le wording CDC ;
- `clientops-data-os` pour lookup client + documents Convex ;
- `deploy-to-vercel` pour publication du hub ;
- `powerpoint` / `claude-design` si le deck nécessite une vraie structuration visuelle.

## Non-Negotiable Positioning

Ne jamais sous-vendre Hermes comme :

- un chatbot ;
- un assistant IA générique ;
- un dashboard intelligent ;
- une simple automatisation Zapier/n8n.

Le positionnement client-facing doit dire clairement :

> Hermes est un agent IA opérateur : il lit le contexte, surveille les outils, prépare les relances/contrôles/résumés/actions, pousse les décisions dans Telegram, et exécute ou coordonne après validation humaine.

Pour les projets internes/delivery, ancrer la valeur sur 3 KPI :

1. **Téléphone / Telegram-first** — travailler le moins possible sur ordinateur ; piloter un maximum d'actions business depuis le téléphone.
2. **Revenu par employé** — augmenter la capacité de delivery sans faire grossir l'équipe au même rythme.
3. **80% des tâches répétitives** — automatiser ou semi-automatiser au moins 80% des tâches répétitives identifiées : suivi, relance, contrôle, résumé, passage de relais.

## Source Inputs

Avant d'écrire, collecter/relire :

- transcript call / Fathom / tl;dv ;
- analyse call ;
- brainstorming CDC phase 1 ;
- faisabilité Hermes ;
- fiche client DataOS existante ;
- CDC de base ;
- références design validées.

Dossier standard :

```bash
/workspace/outputs/clients/{client-slug}/
```

Pour un style éprouvé, reprendre le pattern `deck-simple` ou, si le user cite un client précis déjà livré, inspecter **le dossier réellement déployé** (`vercel-hub`) avant de copier une ancienne variante locale :

```bash
/workspace/outputs/clients/example-immo/deck-simple/index.html
/workspace/outputs/clients/example-immo/deck-simple/deck.html
/workspace/outputs/clients/example-immo/deck-simple/data-os.html
/workspace/outputs/clients/example-immo/deck-simple/cdc.html

# Référence validée si le user dit “comme Valérie / Bouquet Suprême”
/workspace/outputs/clients/bouquet-supreme/vercel-hub/index.html
/workspace/outputs/clients/bouquet-supreme/vercel-hub/maquette.html
/workspace/outputs/clients/bouquet-supreme/vercel-hub/schemas.html
/workspace/outputs/clients/bouquet-supreme/vercel-hub/cdc.html
```

Important : reprendre le **style, la structure, la DA et le formatage**, pas le branding. Supprimer tous les titres, footers, textes visibles ou `<title>` qui mentionnent l'ancien client.

References utiles :

- `references/upstream-digital-planet-hub-delivery.md` pour un hub “copilote back-office” où la valeur n'est pas l'acquisition immédiate mais la remise sous contrôle de contrats, factures, stock, IMEI, livraison, notifications WhatsApp et pré-compta WinBiz. Inclut la correction V4 : client-facing centré **Digital Planet**, wording **bras droit IA** plutôt que Hermes, acquisition en phase suivante, Upstream seulement comme levier post-libération.
- `references/bouquet-supreme-event-retail-hub-delivery.md` pour un hub premium retail/expérience/event où le bon angle est de sortir le fondateur de l'opérationnel et de scaler une offre atelier/B2B à forte marge.
- `references/magic-alex-post-call-use-case-cadrage.md` pour les follow-ups post-call où le prospect demande replay/récap/support mais le stakeholder technique veut d'abord des use cases et prérequis : livrer **récap + schéma + mini-CDC POC + email**, pas une maquette produit trop tôt.

## Deliverable Structure

Créer ou maintenir ce dossier source :

```bash
/workspace/outputs/clients/{slug}/deck-simple/
├── index.html      # hub public simple
├── deck.html       # deck client-facing
├── cdc.html        # CDC simplifié client-facing
├── data-os.html    # maquette Data OS
├── deck.pdf
├── cdc.pdf
├── data-os.pdf
├── hub.png
├── data-os.png
└── deck-slide-XX.png
```

Puis copier vers :

```bash
/workspace/outputs/clients/{slug}/vercel-hub/
```

## Exact Reference Clone Protocol

Quand operator/operator dit “exactement la même structure / direction artistique / formatage que X”, ne pas interpréter ça comme “même niveau de qualité” ou “même style général”. Ça veut dire : **auditer le rendu de référence, copier son IA de page, ses routes, son ordre narratif et son rythme visuel**, puis seulement remplacer le contenu client.

Procédure :

1. Identifier le vrai dossier livré au client cité : souvent `vercel-hub/` est plus fiable que `deck-simple/` car il reflète la version corrigée envoyée.
2. Lire `index.html` + routes principales de la référence (`maquette`, `schemas`, `cdc`, ou `deck/data-os/cdc` selon le client).
3. Extraire la structure visible : hero, angle de présentation, cartes, ordre des CTA, sections de preuve, footer.
4. Adapter le contenu métier sans changer le format : si la référence a 3 cartes `Maquette / Schémas / CDC`, ne livrer pas un hub `Deck / CDC / Data OS` juste parce que c'est le fallback du skill.
5. Garder les routes compatibles si nécessaire (`/data-os`, `/deck`) mais privilégier les routes du modèle cité (`/maquette`, `/schemas`, `/cdc`) dans le hub.
6. Refaire les exports et screenshots après changement de hauteur suffisante pour éviter une capture coupée.
7. Vérifier par grep et HTTP : ancien branding absent, prix absent, login absent, noindex actif.
8. Vérifier visuellement au moins le hub et une page interne contre la référence.

Cas réel : Upstream/Digital Planet avait été livré dans une structure trop différente de Valérie/Bouquet Suprême. Le fix correct a été de reprendre `bouquet-supreme/vercel-hub` : hub 3 cartes `Maquette Data OS / Escalier + source de vérité / Cahier des charges`, routes `/maquette`, `/schemas`, `/cdc`, DA crème premium éditoriale, puis de redéployer le même projet Vercel dédié et remplacer les documents Data OS.

## Hub Pattern

Le hub doit être simple, premium, pas un portail SaaS confus.

Structure recommandée :

- Hero : nom client + promesse Hermes claire.
- Sous-texte : agent IA qui agit dans le business, avec validation humaine.
- 3 cartes :
  1. Deck — vision et fonctionnement ;
  2. CDC — périmètre phase 1 ;
  3. Data OS — maquette cockpit.
- Section courte : les 3 KPI.
- Footer discret, sans ancien branding.

Wording type :

> Un agent IA capable d'actions réelles dans la delivery, pas juste de répondre.

## Deck Pattern

Le deck doit faire ressentir la puissance sans noyer le client.

**Important — structure déjà validée :** avant d'écrire un nouveau deck, inspecter au moins 2 decks client précédents, typiquement :

```bash
/workspace/outputs/clients/example-immo/deck-simple/deck.html
/workspace/outputs/clients/mathieu-yandoko/deck-simple/deck.html
```

Ne pas produire une simple liste répétitive de features. operator a explicitement corrigé une V1 Upstream/Digital Planet parce que la structure n'était “pas ouf” et trop répétable/répétitive. La bonne forme est une narration client : promesse forte → problème terrain → principe “on ne remplace pas vos outils” → KPI → exemple concret → briques installées → avant/après → phase 1 bornée → déploiement → objectif final.

Structure recommandée 10 slides :

1. **Promesse simple** — le résultat business en une phrase, contextualisé au client.
2. **Problème terrain** — 4 frictions concrètes issues de l'audit, pas du jargon Hermes.
3. **Promesse sans refonte** — “on ne remplace pas {outil existant}, on rend le process pilotable”.
4. **3 KPI** — téléphone/Telegram-first, revenu/capacité par employé, 80% tâches répétitives.
5. **Exemple concret** — scène réaliste du lundi matin avec message Telegram / action Hermes.
6. **Ce qu'on installe** — 4 briques simples : agent, mémoire, base/cockpit, validation.
7. **Avant / après** — douleur actuelle vs actions Hermes, avec check/cross.
8. **Phase 1 bornée** — modules + garde-fous + questions à trancher.
9. **Déploiement** — étapes terrain, documents/accès, socle IA, workflows, ajustement.
10. **Objectif final** — transformation opérationnelle claire, pas promesse vague.

Ancienne structure générique possible seulement comme fallback, jamais comme rendu final si un deck client-facing doit être envoyé.

Règles :

- Pas de prix si déjà donné à l'oral ou si support public.
- Pas de phase 1.5 / phase 2 sauf demande explicite.
- Pas d'“évolutions futures” si l'utilisateur veut cadrer uniquement phase 1.
- Pas de promesse d'automatisation totale sans validation humaine.
- Ne pas dire “on va remplacer ton équipe”. Dire : “on augmente la capacité de l'équipe”.

## CDC Simplifié Pattern

Le CDC public doit être plus concret qu'un deck, mais pas un pavé technique.

**Important — structure déjà validée :** comme pour le deck, inspecter les CDC client-facing précédents avant d'écrire :

```bash
/workspace/outputs/clients/example-immo/deck-simple/cdc.html
/workspace/outputs/clients/mathieu-yandoko/deck-simple/cdc.html
```

Ne pas livrer un CDC “court en 7 sections” si le client va s'en servir pour une présentation de cadrage. operator a corrigé la V1 Upstream/Digital Planet : le CDC aussi doit s'inspirer de la structure éprouvée des autres clients.

Structure recommandée pour une V2 solide :

1. Cover premium : promesse métier + phase 1 client-facing + note “pas de prix dans ce document”.
2. Objectif du projet.
3. Les 3 KPI à optimiser.
4. Situation actuelle, avec frictions concrètes de l'audit.
5. Principe de la solution : Hermes comme couche IA au-dessus des outils existants.
6. Livrable principal : agent Telegram / cockpit quotidien / rituel d'usage.
7. Second Brain métier : ce que l'agent doit apprendre.
8. Modules phase 1, un module par section avec objectif + capacités + règle de validation.
9. Data OS / cockpit client-safe.
10. Accès et exemples nécessaires.
11. Validation humaine et sécurité.
12. Hors-scope phase 1.
13. Plan de livraison.
14. Critères de succès.
15. Décision attendue au prochain call.

Inclure explicitement :

> Ce sont des actions réelles dans le business, pas une couche de conversation décorative.

Pour un client avec outils existants forts (WinBiz, GHL, RealAdvisor, etc.), répéter tôt : “on ne remplace pas {outil}, on se place au-dessus pour rendre le process pilotable.”

## Data OS Mockup Pattern

La maquette Data OS doit montrer le cockpit client-safe, pas un admin technique.

**Même exigence de structure que deck/CDC :** si operator dit “pareil pour la maquette”, cela veut dire que la Data OS mockup doit elle aussi reprendre les patterns client validés, pas être une carte isolée générique. Inspecter les maquettes précédentes :

```bash
/workspace/outputs/clients/example-immo/deck-simple/data-os.html
/workspace/outputs/clients/mathieu-yandoko/deck-simple/data-os.html
```

La maquette doit raconter le quotidien du client : “voilà ce que je vois le matin, voilà les actions à valider, voilà les anomalies, voilà les sources, voilà la mémoire métier”. Pour un back-office, montrer des statuts et décisions métier; pour une agence delivery, montrer onboarding/clients bloqués/équipe/campagnes; pour sales, montrer leads/RDV/relances.

Si le client travaille avec des fichiers locaux Apple/desktop (Pages, Numbers, PDF sur Mac), cadrer l'architecture visible dans la maquette et le CDC : dossier Dropbox/Google Drive synchronisé Mac ↔ VPS Ubuntu, lecture Hermes côté serveur, puis structuration dans une base simple type NocoDB. Ne pas vendre ça comme “une base de données”; vendre un copilote back-office qui remet le chaos documentaire sous contrôle.

Pour les captures PNG de maquettes longues, ne pas s'arrêter à `1440x1300` si la page coupe les sources/rituels. Utiliser une hauteur suffisante (`1440x2400`/`2600`) ou vérifier visuellement que le cockpit complet est visible.

Éléments utiles :

- scoreboard des KPI ;
- actions Hermes à valider ;
- onboardings / clients à risque ;
- accès manquants ;
- contrôles outil métier ;
- campagnes / sujets à surveiller ;
- mémoire métier ;
- sources connectées ;
- validation humaine.

Wording fort :

> Une interface simple pour voir les actions réelles qu'Hermes prépare dans le business : onboardings, accès, contrôles, campagnes à surveiller, relances et mémoire métier.

Ne pas afficher :

- terminal ;
- provider/API keys ;
- logs bruts ;
- fichiers système ;
- settings techniques ;
- secrets ;
- URLs privées.

## Design Direction

Style validé : proche Example Client/Simo.

- fond crème/warm ;
- cartes blanches/ivoire ;
- typographie premium ;
- beaucoup d'air ;
- 3 cartes simples sur hub ;
- deck sobre, pas dashboard SaaS générique ;
- maquette cockpit claire ;
- ombres subtiles ;
- pas de jargon technique en hero.

Si le rendu ressemble à une landing SaaS froide ou à un dashboard template, c'est mauvais. Le client doit sentir : **“ok, ils ont compris mon business et ils installent un système opérateur IA.”**

## Build / Export Commands

Utiliser Chrome headless depuis le dossier `deck-simple` :

```bash
BASE=/workspace/outputs/clients/{slug}/deck-simple
CHROME=/usr/bin/google-chrome

$CHROME --headless=new --no-sandbox --disable-gpu \
  --window-size=1440,1000 \
  --screenshot="$BASE/hub.png" \
  "file://$BASE/index.html"

$CHROME --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$BASE/deck.pdf" \
  "file://$BASE/deck.html"

$CHROME --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$BASE/cdc.pdf" \
  "file://$BASE/cdc.html"

$CHROME --headless=new --no-sandbox --disable-gpu \
  --window-size=1440,1300 \
  --screenshot="$BASE/data-os.png" \
  "file://$BASE/data-os.html"

$CHROME --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$BASE/data-os.pdf" \
  "file://$BASE/data-os.html"
```

Pour exporter une slide spécifique, générer un HTML temporaire où seule la slide voulue a la classe `active`, puis screenshot.

## Vercel Deploy Pattern

Créer/copier un dossier propre avec un nom de projet dédié au client. Éviter de déployer directement depuis un dossier générique `deck-simple` si l'alias public risque de devenir `deck-simple.vercel.app` — c'est moche et ça crée du link sprawl.

```bash
SRC=/workspace/outputs/clients/{slug}/deck-simple
WORK=/workspace/outputs/clients/{slug}/vercel-hub
mkdir -p "$WORK"
cp "$SRC/index.html" "$WORK/index.html"
cp "$SRC/deck.html" "$WORK/deck.html"
cp "$SRC/cdc.html" "$WORK/cdc.html"
cp "$SRC/data-os.html" "$WORK/data-os.html"
cp "$SRC/deck.pdf" "$WORK/deck.pdf"
cp "$SRC/cdc.pdf" "$WORK/cdc.pdf"
cp "$SRC/data-os.pdf" "$WORK/data-os.pdf"
cat > "$WORK/vercel.json" <<'JSON'
{
  "cleanUrls": true,
  "headers": [
    {"source": "/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex"}]}
  ]
}
JSON
cat > "$WORK/robots.txt" <<'TXT'
User-agent: *
Disallow: /
TXT

cd "$WORK"
rm -rf .vercel
npx vercel link --project {client-slug-or-clear-alias} --yes
npx vercel deploy --prod --yes --public
```

Toujours livrer l'URL alias canonique dédiée au client, pas l'URL brute de déploiement et pas un alias générique. Si une vanity alias retourne `401 Unauthorized`, créer/lier un projet dédié avec ce même nom puis redéployer `--prod --yes --public`.

⚠️ Avant tout déploiement, inspecter `.vercel/project.json`. Si le dossier pointe vers un projet générique (`vercel-hub`) ou vers un autre client, NE PAS déployer : supprimer `.vercel/`, lier/créer un projet dédié au client (`npx vercel link --project <client-slug>-... --yes`), puis seulement déployer. Un dossier copié peut sinon écraser le lien public d'un autre client (cas réel : Bouquet Suprême / Valéry écrasé par Upstream).

## Production Verification

Après déploiement, vérifier les routes HTML **et PDF** :

```python
import urllib.request, re
base = "<url>>.vercel.app"
for path in ["/", "/deck", "/cdc", "/data-os"]:
    req = urllib.request.Request(base + path, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", "ignore")
        assert r.status == 200
        assert r.headers.get("x-robots-tag") == "noindex"
        assert "agent IA" in html or "Hermes" in html
        assert not re.search(r"phase 1\.5|phase 2|Example Client|3\s?000|3000|€", html, re.I)

for path in ["/deck.pdf", "/cdc.pdf", "/data-os.pdf"]:
    req = urllib.request.Request(base + path, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        assert r.status == 200
        assert r.read(4) == b"%PDF"
```

Note : si le `robots.txt` ne contient pas “Digital Planet” ou le nom client, c'est normal. Vérifie son HTTP 200 + `Disallow: /`, pas un snippet business.

Contrôler aussi visuellement avec `vision_analyze` :

- hub screenshot ;
- slide 1 ;
- slide KPI ;
- slide phase 1 ;
- Data OS screenshot ;
- première page CDC si PDF critique.

QA obligatoire :

- pas de texte coupé ;
- pas de prix, marge, coût ou hypothèse commerciale sensible dans le hub public ;
- pas d'ancien client / ancien branding ;
- pas de phase future indésirable ;
- les 3 KPI sont visibles ;
- Hermes est présenté comme agent d'actions réelles ;
- Data OS est client-safe : anonymiser prospects, institutions et personnes non nécessaires ;
- noindex actif ;
- pas de login/protection Vercel visible.

## DataOS Attachment Pattern

Toujours vérifier la fiche avant modification. Méthode CLI fiable dans `client-dashboard` :

```bash
cd /workspace/projects/client-dashboard
export CONVEX_DEPLOY_KEY=$(python3 - <<'PY'
from pathlib import Path
import re
text = Path('.env.local').read_text()
m = re.search(r'^CONVEX_DEPLOY_KEY=["\']?([^"\'\n]+)', text, re.M)
print(m.group(1) if m else '')
PY
)
npx convex run clients:getClient '{"slug":"{slug}"}'
```

Évite les recettes `grep ... | cut -d'"'` fragiles : selon le shell/quote, `cut` peut recevoir un délimiteur invalide et Convex échoue en 401 parce que la clé n'est pas exportée.

Alternative HTTP si disponible :

```python
POST {CONVEX_URL}/api/query
{"path":"clients:getClient","args":{"slug":"{slug}"},"format":"json"}
```

Ne jamais ajouter la nouvelle V2 en plus de l'ancienne sans nettoyage. Supprimer/remplacer les anciens docs client-facing par index décroissant :

```python
# remove old Hub/Deck/CDC/Data OS docs by index descending
POST {CONVEX_URL}/api/mutation
{"path":"clients:removeDocument","args":{"slug":"{slug}","index": INDEX},"format":"json"}
```

Puis ajouter les nouveaux documents :

```python
POST {CONVEX_URL}/api/mutation
{
  "path": "clients:addDocument",
  "args": {
    "slug": "{slug}",
    "name": "Deck — Agent IA Hermes",
    "type": "deck",
    "url": "<url>>.vercel.app/deck",
    "content": "<html or markdown content, trimmed if needed>"
  },
  "format": "json"
}
```

Types utiles :

- `deck` pour deck ;
- `cdc` pour CDC ;
- `other` pour hub et Data OS.

Mettre à jour `statusMarkdown` et `nextAction` :

```markdown
# Statut — {Client}

Supports client-facing prêts : hub, deck, CDC, maquette Data OS.

## 3 KPI phase 1
- Téléphone / Telegram-first.
- Revenu par employé.
- 80% des tâches répétitives.

## Liens publics
- Hub : ...
- Deck : ...
- CDC : ...
- Data OS : ...
```

## Final Response Format

Réponse courte à operator :

- dire ce qui a été créé/corrigé ;
- donner les liens ;
- confirmer QA : HTTP 200, no bad terms, pas de prix, pas d'ancien branding, KPI présents ;
- confirmer DataOS mis à jour + nombre de documents ;
- recommander next action.

## Common Pitfalls

1. **Faire un deck trop abstrait.** Le client doit comprendre ce que Hermes fait lundi matin dans son business.
2. **Sous-vendre Hermes.** “Assistant” ou “chatbot” tue la perception de valeur. Dire agent IA opérateur, actions réelles, validation humaine.
3. **Oublier les KPI.** Sans téléphone/Telegram-first, revenu par employé et 80% des tâches répétitives, le support ressemble à une spec technique.
4. **Reprendre le style Example Client avec le branding Example Client.** À chaque copie, search `Example Client` dans tout le dossier client.
5. **Laisser le prix, les marges ou les hypothèses commerciales sensibles dans les supports publics.** Recherche `€|CHF|3 000|3000|prix|tarif|marge|coût` avant livraison. Les chiffres business peuvent vivre dans l'analyse interne; le hub public doit rester client-safe sauf demande explicite.
6. **Parler de phase 1.5/phase 2 quand le user veut phase 1 only.** Recherche et supprimer.
7. **Livrer une URL Vercel brute protégée.** Vérifier l'alias canonique avec HTTP 200 et absence de login.
8. **Ajouter des docs DataOS en doublon.** Supprimer/remplacer les anciens Hub/Deck/CDC/Data OS.
9. **Afficher un Data OS trop technique.** Le client ne doit jamais voir terminal, providers, clés API, logs bruts ou settings systèmes.
10. **Ne pas vérifier visuellement.** Un PDF qui exporte avec header navigateur ou texte coupé, c'est amateur. Vision-check obligatoire.

## Verification Checklist

- [ ] Sources client relues.
- [ ] Périmètre phase 1 clair.
- [ ] Hub créé.
- [ ] Deck créé.
- [ ] CDC simplifié créé.
- [ ] Maquette Data OS créée.
- [ ] Exports PDF/PNG générés.
- [ ] Search anti-bad terms : ancien client, prix, phase future, secrets.
- [ ] Vision QA faite sur hub, deck, Data OS, CDC.
- [ ] Dossier Vercel propre avec `vercel.json` noindex.
- [ ] Déploiement prod public `--public`.
- [ ] Vérification HTTP 200 sur `/`, `/deck`, `/cdc`, `/data-os`.
- [ ] Vérification PDF HTTP 200 sur `/deck.pdf`, `/cdc.pdf`, `/data-os.pdf`.
- [ ] DataOS client mis à jour, anciens docs remplacés.
- [ ] DataOS re-query fait : les documents attendus existent avec les bonnes URLs.
- [ ] Réponse finale avec liens et statut QA.

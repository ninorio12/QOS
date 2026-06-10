---
name: typeform-api
category: integration
description: "Gérer les formulaires Typeform via l'API — création, mise à jour, questions, logique, webhooks et réponses."
---

# Typeform API Integration

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

Token PAT stocké dans `~/.hermes/.env.typeform` (non versionné). Si ce fichier est absent, on peut préparer le webhook endpoint côté app, mais on ne peut PAS brancher automatiquement le webhook dans le compte Typeform via API; demander le PAT ou faire ajouter l'URL manuellement dans l'UI Typeform.

## Endpoints clés

| Ressource | Endpoint | Méthode |
|-----------|----------|---------|
| Lister formulaires | `/forms` | GET |
| Détail formulaire | `/forms/{form_id}` | GET |
| Créer formulaire | `/forms` | POST |
| Modifier formulaire | `/forms/{form_id}` | PUT |
| Supprimer formulaire | `/forms/{form_id}` | DELETE |
| Réponses | `/forms/{form_id}/responses` | GET |
| Webhooks | `/forms/{form_id}/webhooks` | GET/POST/DELETE |

## Authentification

Header obligatoire sur chaque requête:
```
Authorization: Bearer {TYPEFORM_PAT}
Content-Type: application/json
```

## Créer un formulaire (exemple minimal)

```bash
curl -X POST <url> \
  -H "Authorization: Bearer $TYPEFORM_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nouveau formulaire",
    "settings": {"is_public": true},
    "fields": [
      {
        "type": "short_text",
        "title": "Quel est votre nom ?",
        "validations": {"required": true}
      },
      {
        "type": "email",
        "title": "Votre email",
        "validations": {"required": true}
      }
    ]
  }'
```

## Répliquer le design d'un formulaire existant

1. Récupérer le theme ID du formulaire source : `GET /forms/{source_id}` → `.theme.href`
2. Récupérer les settings complets du formulaire source
3. Créer le nouveau formulaire avec `"theme": {"href": "<url>"}`

```bash
# 1. Récupérer le theme
curl -s -H "Authorization: Bearer $TYPEFORM_PAT" <url> | jq '.theme.href'

# 2. Créer avec le même theme
curl -X POST <url> \
  -H "Authorization: Bearer $TYPEFORM_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nouveau formulaire",
    "type": "quiz",
    "theme": {"href": "<url>"},
    "settings": {"language": "fr", "show_typeform_branding": false, "is_public": true},
    "welcome_screens": [{"ref": "welcome", "title": "Bienvenue", "properties": {"show_button": true, "button_text": "commencer"}}],
    "thankyou_screens": [{"ref": "end", "title": "Merci !", "properties": {"show_button": false, "share_icons": false}}],
    "fields": [...]
  }'
```

## Structure welcome_screens / thankyou_screens

**NE JAMAIS** inclure le champ `type`. L'API le rejette. Structure correcte :

```json
{
  "ref": "welcome",
  "title": "Bienvenue",
  "properties": {
    "show_button": true,
    "button_text": "commencer",
    "description": "Texte optionnel"
  }
}
```

Pour un thankyou_screen avec bouton de redirection :
```json
{
  "ref": "end_qualified",
  "title": "C'est envoyé !",
  "properties": {
    "show_button": true,
    "button_mode": "redirect",
    "button_text": "Réserver mon appel",
    "redirect_url": "<url>",
    "description": "Texte de description"
  }
}
```

## Types de champs disponibles

- `short_text`, `long_text`
- `email`, `phone_number`, `website`, `number`
- `date`
- `multiple_choice` (+ allow_multiple_selections, randomize, alphabetize)
- `picture_choice`
- `yes_no`, `legal`, `terms`
- `rating`, `opinion_scale`, `matrix`
- `file_upload`
- `payment` (Stripe)
- `statement` (texte statique)
- `welcome_screen`, `thankyou_screen`

## Logique conditionnelle (logic jumps)

**⚠️ Limitation importante :** La logique conditionnelle via API est très limitée. Les jumps vers des thankyou screens selon les réponses ne fonctionnent pas correctement via l'API. Il est recommandé de créer le formulaire sans `logic`, puis de configurer les jumps dans l'interface Typeform.

Si tu dois utiliser la logique via API (jumps entre questions uniquement), les `ref` doivent être uniques. La structure est :

```json
{
  "logic": [
    {
      "type": "field",
      "ref": "question_ref",
      "actions": [
        {
          "action": "jump",
          "details": {"to": {"type": "field", "value": "other_ref"}},
          "condition": {
            "op": "equal",
            "vars": [
              {"type": "field", "value": "question_ref"},
              {"type": "choice", "value": "choix_a"}
            ]
          }
        }
      ]
    }
  ]
}
```

Opérateurs autorisés dans `condition.op` : `equal`, `not_equal`, `or`, `and`, `contains`, `not_contains`, `begins_with`, `ends_with`, `lower_than`, `greater_than`, `answered`, `not_answered`, `always`. **L'opérateur `is` n'est PAS supporté.**

**Types de variable dans `vars`** : `field`, `constant`, `choice`.

## Webhooks

Créer un webhook sur un formulaire:
```bash
curl -X POST "<url>}/webhooks/{tag}" \
  -H "Authorization: Bearer $TYPEFORM_PAT" \
  -H "Content-Type: application/json" \
  -d '{"url":"<url>","enabled":true}'
```

Tag = identifiant arbitraire unique par formulaire (ex: "ghl-sync", "aios-ingest").

### Audit canonique avant de brancher une landing page
Quand il existe plusieurs formulaires similaires (`Candidature ClientOps`, drafts, copies), ne jamais se fier au titre seul. Lister les formulaires candidats + leurs webhooks, puis choisir le formulaire qui alimente réellement les systèmes attendus.

```python
import os, json, urllib.request
pat = os.environ["TYPEFORM_PAT"]
headers = {"Authorization": f"Bearer {pat}", "Content-Type":"application/json"}

def get(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

forms = get("<url>")
for item in forms.get("items", []):
    title = item.get("title", "")
    if any(s in title.lower() for s in ["clientops", "candidature", "setting", "vsl"]):
        print(item["id"], title, item.get("_links", {}).get("display"))
        print(json.dumps(get(f"<url>'id']}/webhooks").get("items", []), ensure_ascii=False))
```

Client Delivery pattern validé: conserver les webhooks uniquement sur le formulaire officiel, et vérifier que les anciens/drafts ont `items: []` pour éviter les leads dispersés.

### Réparer un webhook désactivé automatiquement par Typeform
Quand Typeform envoie un email “webhook isn't working, so we disabled it”, ne conclure ni à un Typeform cassé ni à une perte complète des leads. Typeform désactive parfois **un seul webhook** après erreurs répétées, pendant que les autres webhooks du même formulaire restent actifs.

Runbook rapide:
1. Identifier le formulaire officiel via l'audit canonique, pas via le titre seul.
2. Lister les webhooks du formulaire et repérer celui avec `enabled: false`.
3. Tester l'endpoint avec un payload Typeform réaliste, pas seulement un `{ping:true}` si le handler exige `form_response`:
```bash
curl -i -X POST <url>>/api/typeform/creative-leads \
  -H 'content-type: application/json' \
  -d '{"event_id":"test","event_type":"form_response","form_response":{"form_id":"test","token":"test-webhook","submitted_at":"2026-01-01T00:00:00Z","definition":{"fields":[{"id":"email","title":"Email"}]},"answers":[{"field":{"id":"email"},"type":"email","email":"<email@example.com>"}]}}}'
```
4. Si l'endpoint retourne 2xx, réactiver le webhook existant avec son tag:
```bash
curl -X PUT "<url>" \
  -H "Authorization: Bearer $TYPEFORM_PAT" \
  -H "Content-Type: application/json" \
  -d '{"url":"<url>>/api/typeform/creative-leads","enabled":true,"verify_ssl":true}'
```
5. Relister les webhooks et vérifier `enabled=true`.
6. Nettoyer la réponse de test dans Convex/Data OS si le test a créé une ligne (`adTracking:removeTypeformResponse` pour le tracking créa Client Delivery).

Cas validé ClientOps: formulaire officiel `sBg0c1Vu` avait `aios-creative-tracking` désactivé, mais `aios-setter-pipe` et `live_integration_ai` restaient actifs; réparation = test endpoint OK → `PUT /forms/sBg0c1Vu/webhooks/aios-creative-tracking` enabled true.

Payload webhook (exemple):
```json
{
  "event_id": "...",
  "event_type": "form_response",
  "form_response": {
    "form_id": "...",
    "token": "...",
    "landed_at": "...",
    "submitted_at": "...",
    "definition": {...},
    "answers": [...]
  }
}
```

## Réponses

```bash
# Lister les réponses d'un formulaire
curl -s "<url>}/responses?page_size=25" \
  -H "Authorization: Bearer $TYPEFORM_PAT"
```

## Modèles de formulaires Client Delivery

### Client onboarding post-signature AIOS
Ne pas proposer Typeform par défaut pour l'onboarding client post-signature AIOS/AIOS. Le pattern validé est le portail Data OS tokenisé `/onboarding/[token]` (voir skill `clientops-data-os`, référence `client-onboarding-portal.md` + `onboarding-form-v2-blueprint.md`) parce qu'il faut sauvegarde progressive, inventaire dynamique d'outils, statuts d'accès, ressources, readiness score, revue interne et modules métier. Typeform n'est qu'un fallback temporaire si l'utilisateur demande explicitement un formulaire simple.

### AIOS — Audit IA Entreprise V1 (sans scoring)
operator validated a simpler first version for AIOS acquisition: **no automated scoring, no conditional logic, no automatic disqualification** at launch. Collect clean qualification data first, then prune/add scoring once real responses show patterns.

Use this structure for the initial funnel:
1. Type d’entreprise
2. Activité en moins de 10 mots
3. Taille de l’équipe
4. CA mensuel approximatif
5. Fonction la plus coûteuse/lourde
6. Tâches encore manuelles
7. Coût mensuel ou temps humain mobilisé
8. Raisons d’urgence
9. Temporalité de lancement
10. Budget IA prévu
11. Prénom
12. Nom
13. Email professionnel
14. Téléphone
15. Site web ou LinkedIn entreprise
16. Final booking step / thank-you redirect

Default hidden attribution fields: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `gclid`, `campaign_id`, `adset_id`, `ad_id`, `ad_name`, `placement`, `source_guess`.

For Typeform → Calendly handoff, update the thank-you screen button rather than forcing API logic jumps:
```json
{
  "ref": "thankyou_default",
  "title": "Merci, vos réponses ont bien été envoyées.",
  "properties": {
    "show_button": true,
    "button_mode": "redirect",
    "button_text": "Réserver mon audit IA",
    "redirect_url": "<url>",
    "share_icons": false,
    "description": "Dernière étape : réservez votre appel d’audit IA..."
  }
}
```

### Audit ROI (inspiration Cameron England)
Lead magnet calculatoire. Promise chiffrée (ex: "$50K/an d'économie"). Questions : type business → description → CA → tâches répétitives → payroll → contact. **Pas de scoring, pas de qualification budget.** Le payroll sert de base de calcul ROI, pas de filtrage.

### Candidature / Qualification (incubateur/cohorte)
Formulaire de pré-qualification pour accompagnement. Questions clés : **budget prévu, timeline, prêt à investir, situation actuelle.** Le but est de segmenter hot/warm/cold et alimenter un scoring. Design dark premium (Webi theme). Thankyou screen qualifié → Calendly, non-qualifié → nurture.

> **Règle d'or pour operator :** Toujours clarifier AVANT de créer si c'est un **audit ROI** (copie Cameron) ou une **candidature qualifiante** (budget/timeline/scoring). Ne jamais mélanger les deux modèles.

## Workflows courants

### Réparer un Calendly Typeform qui finit sur le mauvais écran

Quand un prospect booke via un champ Calendly/application mais voit ensuite un thank-you de rejet ou de non-qualification, ne pars pas sur un faux diagnostic budget/scoring. Vérifie d'abord le routing post-Calendly.

Pattern validé :
1. `GET /forms/{form_id}` et sauvegarder le JSON complet.
2. Identifier le champ Calendly par `ref` stable.
3. Ajouter/valider un `thankyou_screen` qualifié.
4. Ajouter une règle `logic` sur le champ Calendly avec condition `always` → jump vers ce thank-you qualifié.
5. Vérifier `application.inputs` : les refs prénom/nom/email changent souvent après refonte du flow.
6. `PUT /forms/{form_id}` avec le payload complet, en retirant les champs read-only (`id`, `type`) des thank-you screens.
7. Re-GET et assert écran, logique, et inputs.

Voir aussi `references/calendly-routing-and-prefill.md` pour le cas ClientOps complet.

### 1. Dupliquer un formulaire existant
1. GET `/forms/{id}` → récupérer le payload complet
2. Modifier le `title` et retirer les `id` internes
3. POST `/forms` avec le payload modifié

### 2. Mettre à jour les questions
PUT `/forms/{form_id}` avec le NOUveau payload complet (l'API Typeform remplace tout — pas de PATCH partiel).

### 3. Connecter à GHL/AIOS
1. Créer un webhook sur le formulaire
2. Endpoint récepteur parse `form_response.answers`
3. Mappe les fields par `ref` ou par `title`
4. Upsert dans GHL (contact + custom fields) ou Convex (formEntries)

## Pitfalls

1. **Ne pas mélanger modèles** — Un formulaire "audit ROI" (Cameron) et un formulaire "candidature" (ClientOps) ont des structures et des intentions différentes. Clarifier avec l'utilisateur AVANT de créer.
2. **PUT remplace TOUT** — si tu oublies un field dans le payload de mise à jour, il disparaît.
2. **Les `ref` doivent être uniques** — Typeform les génère automatiquement si omis, mais pour la logique conditionnelle il faut les définir explicitement.
3. **Pas de PATCH natif** — toujours GET → modifier → PUT.
4. **Rate limit** — 2 req/sec sur les plans gratuits/basic. Surveille les headers `X-RateLimit-Remaining`.
5. **Les images dans picture_choice** doivent être des URLs publiques HTTPS.
6. **Welcome/thankyou screens — PAS de champ `type`** — L'API rejette `"type": "welcome_screen"` ou `"type": "thankyou_screen"`. Typeform déduit le type du contexte. Ne mettre que `ref`, `title`, et `properties`.
7. **Logique conditionnelle via API très limitée** — Les jumps vers des thankyou screens conditionnels ne fonctionnent pas bien via l'API. Créer le formulaire sans `logic`, puis configurer les jumps dans l'UI Typeform. Les opérateurs autorisés dans `condition.op` sont `equal`, `not_equal`, `or`, `and`, `contains`, etc. — **PAS** `is`.
8. **Réplication de design via `theme.href`** — Pour copier le design d'un formulaire existant, utiliser `"theme": {"href": "<url>"}` dans le payload de création. Récupérer le theme ID via GET `/forms/{id}`.
9. **Types de formulaire** — `quiz` (standard) et `score_branching` (avec scoring) sont les types courants. `score_branching` nécessite une configuration de scoring qui ne se fait pas facilement via API brute.
10. **Copies/drafts qui capturent des leads dans le vide** — si une landing/VSL utilise le mauvais ID Typeform, les leads bookent mais n'arrivent pas dans le pipe. Toujours auditer tous les formulaires au titre proche et leurs webhooks avant de changer un lien public. Le bon formulaire est celui avec les webhooks système actifs, pas forcément le plus récent ni celui nommé "draft".
11. **Typeform embed + attribution UTM** — pour remplacer un embed sur une LP, ne colle pas seulement l'ID. Si l'ancien code utilise `data-tf-live="..."`, attention: cet ID est souvent un *live/embed ID*, pas forcément le vrai form ID ni le formulaire connecté aux webhooks. Résous-le avec `curl -s <url>> | jq -r '.html'` pour récupérer le vrai `data-tf-widget="<FORM_ID>"`, les hidden fields, et les options d'embed. Pour forcer le formulaire canonique, remplace par `data-tf-widget="<FORM_ID>"` et ajoute `data-tf-transitive-search-params="utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,gclid,ad_id,adset_id,campaign_id,creative_id,source_guess"` afin que les UTM/ad IDs passent dans Typeform. Après déploiement, vérifie le JS chunk/DOM pour l'ID officiel et l'absence de l'ancien ID; le HTML seul peut ne pas contenir l'embed. Sur une LP statique exportée, le changement peut être dans un chunk JS type `assets/<uuid>.js`, pas dans `index.html`. Si le domaine Vercel est cross-account, suivre `deploy-to-vercel` → `references/cross-account-static-lp-domain-recovery.md` pour ne pas valider une simple URL proof au lieu du domaine canonique.
12. **Redirect public vers Typeform** — si une pub Meta pointe vers une route interne qui redirige vers Typeform (ex: `/go/clientops`), cette route doit être publique dans le middleware et doit recopier les search params vers `<url>>`. Le webhook/parser doit lire `form_response.hidden` et accepter les variantes `campaign_id`, `campaignid`, `campaign.id`, etc.; sinon les champs cachés existent dans Typeform mais arrivent vides dans le CRM/Data OS.
13. **Calendly/application fall-through** — un booking Calendly réussi peut quand même afficher le mauvais thank-you si le champ Calendly n'a pas de routing explicite. Toujours vérifier la logique `always → thankyou_qualified` et le mapping `application.inputs` après une refonte de formulaire.

## Scripts utilitaires

### Lister les formulaires
```bash
curl -s -H "Authorization: Bearer $TYPEFORM_PAT" <url> | jq '.items[] | {id, title, public: .settings.is_public, url: ._links.display}'
```

### Exporter les réponses en CSV (via CLI typeform-official)
```bash
npx @typeform/api-client@latest responses export --form-id FORM_ID --format csv --token $TYPEFORM_PAT
```

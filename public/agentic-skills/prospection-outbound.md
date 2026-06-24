---
name: prospection-outbound
description: "Prospection Outbound — Use when filling a VividFlow personalized OUTBOUND presentation deck from a company domain (structure cc-concept / schmid-signature). Researches the company + decision-maker, then fills ONLY the template fields via the vividflow-outbound SSG (data-f fields, CLI new/check/publish → <slug>.vividflow.co). Never changes design, layout, page order or fixed blocks (booking = audit-out, figé)."
version: 1.2.0
author: VividFlow
license: private
metadata:
  hermes:
    tags: [vividflow, deck, outbound, personalization, prospect-research, template, ssg, vercel]
    related_skills: [remplir-template-r2, workspace-dispatch]
---

# VividFlow Personalized Deck Template Skill

## Amont Acquisition Outbound

Si le deck fait partie d'une campagne VividFlow outbound complète, ne traite pas la projection comme une action isolée. Le lead doit déjà passer par le SOP maître `Acquisition Outbound` : entreprise réelle, décideur nominatif, email professionnel vérifié/sourcé, score A/B, QA Coordinateur.

Source d'exécution : `/home/hermes/workspaces/vividflow-data-os/docs/sops/acquisition-outbound.md`.

### Règle Data OS — stockage des données de prospection

Les données suivantes **ne doivent jamais être stockées dans Data OS** (ni Library, ni KB, ni SOP) :
- URLs sources des leads (local.ch, sites web des prospects, pages de scoring)
- Aucune URL de source de prospection (source URL, page site scrapée, page LinkedIn)

Ce qui **est autorisé** dans Data OS :
- Liens Google Sheets / Drive / Docs opérationnels dans la Library (ex : « Base leads dirigeants », « Audit VividFlow — Mode Emploi »)
- Liens vers les decks publiés (`<slug>.vividflow.co`) dans les SOP en HTML (type `doc`)

Le sheet opérationnel (Base leads dirigeants) est référencé dans le SOP en HTML — c'est la seule exception. Les agents KB/Operations ne doivent pas y toucher sauf instruction explicite.

Pour la structure exacte des colonnes, les permissions Clara et les scripts d'écriture, voir `references/outbound-sheet-operations.md`.

### Sheet opérationnel — permissions et structure

Le sheet « Base leads dirigeants » est accessible en **lecture** via Clara (`clara.bernasconi@vividflow.co`) mais pas en écriture par défaut.

Si une mise à jour Sheet échoue avec `403` :
→ Partager le sheet en mode Éditeur à `clara.bernasconi@vividflow.co`, puis réessayer.

Colonnes actuelles du sheet (refonte en cours vers 4 colonnes opérationnelles) :
- **Étape** (À auditer → Audit OK → Deck à faire → Prêt envoi → Email envoyé → Relance)
- **Score Qualité** (A/B/C/D)
- **Agent responsable**
- **Dernière activité**

Les 14 colonnes de données brutes (Date scraping, Prénom, Nom, Email pro, etc.) restent inchangées.

Interdits : pas de projection pour Qualité C/D, contact incomplet, email générique principal, prospect Apollo-only/non vérifié, ou ligne suspecte.

## Mission

Tu remplis un deck de présentation personnalisé VividFlow à partir du nom de domaine d'une entreprise cible.

Tu dois reproduire la logique des exemples :

- `https://vividflow.co/cc-concept`
- `https://vividflow.co/schmid-signature`

Le deck est un **template strict à trous**.
Tu ne dois pas refaire le design, changer la structure, modifier l'ordre des pages, ajouter des sections, supprimer des blocs fixes, ni transformer le deck en audit complet.

Ton rôle est de :

1. comprendre l'entreprise cible ;
2. identifier le bon décisionnaire ;
3. remplir les variables du deck ;
4. adapter les copies page par page ;
5. créer des exemples concrets liés au prospect ;
6. inclure le décisionnaire dans les simulations de conversation ;
7. garder le même niveau de précision que les decks CC Concept et Schmid Signature.

## Entrée attendue

L'utilisateur te donnera généralement :

```text
Domaine entreprise : exemple.ch
Objectif : préparer un deck VividFlow personnalisé
```

Optionnel :

```text
Nom entreprise : ...
Secteur : ...
Personne visée : ...
Offre VividFlow à mettre en avant : ...
```

Si seul le domaine est donné, tu dois faire les recherches toi-même.

## Règles absolues

### 1. Ne touche pas au design

Interdit :

- changer la direction artistique ;
- changer les couleurs ;
- changer les typographies ;
- changer la grille ;
- réorganiser les slides ;
- ajouter des effets décoratifs ;
- remplacer les blocs fixes ;
- transformer le deck en site complet ou en audit détaillé.

Autorisé :

- remplacer les textes variables ;
- remplacer le nom de l'entreprise ;
- remplacer le nom du décisionnaire ;
- adapter les exemples métier ;
- adapter les conversations simulées ;
- adapter les pains opérationnels ;
- adapter les cas d'usage IA/agents à l'entreprise ;
- **(obsolète)** les icônes P5 sont fixes dans le template — ne pas tenter de les remplacer, les `data-f` ont été retirés.

### 2. Template à trous

Considère chaque page comme un bloc existant avec :

- des textes fixes à conserver ;
- des variables à remplir ;
- des exemples à personnaliser ;
- des scènes conversationnelles à adapter.

Tu ne dois pas "réinventer" le deck.
Tu dois le **remplir intelligemment**.

### 3. Pas de générique mou

Interdit :

- "gagner du temps" comme argument principal ;
- "automatiser vos tâches" sans précision ;
- "l'IA révolutionne votre entreprise" ;
- "solution innovante" ;
- "booster votre productivité" ;
- "optimiser vos processus" sans cas concret.

Préférer :

- expertise mal exploitée ;
- continuité opérationnelle ;
- actions faibles valeurs qui saturent les journées ;
- informations qui arrivent de partout mais ne se tiennent pas seules ;
- système qui transforme les échanges en actions ;
- humain qui garde le jugement, la relation et les décisions.

### 4. Toujours parler au décisionnaire

Le deck ne parle pas à "l'entreprise" de manière abstraite.
Il parle à la personne qui décide.

Le décisionnaire doit être intégré :

- dans les titres ou sous-textes quand pertinent ;
- dans les exemples ;
- dans les simulations de conversation ;
- dans les situations de décision ;
- dans la logique "ce qui mérite vraiment son temps".

Exemple :

```text
Jonathan reçoit une demande client.
Le système prépare le contexte.
Il valide la réponse.
L'équipe avance sans perdre le fil.
```

À adapter avec le vrai prénom trouvé.

## Décisionnaire fourni par l'utilisateur

Si l'utilisateur fournit explicitement un prénom ou un nom de décisionnaire dans sa demande, **utilise cette personne directement** sans la remettre en question ni chercher quelqu'un d'autre.

C'est une situation courante en outbound personnalisé : Jonathan connaît la personne et lui envoie le dossier directement. Dans ce cas :

- Utilise le prénom fourni dans toutes les conversations simulées.
- Note en interne : `Décisionnaire fourni par l'utilisateur — confiance maximale.`
- Si seul le prénom est fourni, utilise uniquement le prénom dans le deck (pas de nom de famille inventé).
- Ne pas demander de confirmation. Ne pas chercher à valider.
- Adapter quand même les exemples métier au rôle probable de cette personne dans l'entreprise.

## Recherche obligatoire

Avant de remplir le deck, tu dois rechercher sur internet :

### 1. Entreprise

À trouver :

- nom exact ;
- secteur ;
- activité réelle ;
- pays / ville / zone ;
- offres ou services principaux ;
- ton de marque ;
- type de clients ;
- preuves visibles : site, pages services, portfolio, équipe, LinkedIn, Google, articles.

### 2. Décisionnaire

Tu dois chercher la personne la plus probable :

- CEO ;
- fondateur ;
- directeur ;
- associé-gérant ;
- responsable opérationnel ;
- responsable commercial/marketing si plus pertinent.

Sources possibles :

- site de l'entreprise ;
- page équipe ;
- mentions légales ;
- LinkedIn ;
- registre public ;
- articles ;
- interviews ;
- Google snippets.

### 3. Niveau de confiance

Tu dois noter en interne :

```text
Décisionnaire identifié : Prénom Nom
Rôle : CEO / Fondateur / Directeur / autre
Confiance : élevée / moyenne / faible
Source : URL ou indice utilisé
```

Si la confiance est faible, ne mens pas.
Écris :

```text
Décisionnaire probable : ...
À vérifier avant envoi.
```

Mais remplis quand même le deck avec la meilleure hypothèse.

## Sortie de recherche à produire avant le remplissage

Avant de remplir page par page, produis un résumé court :

```markdown
## Recherche prospect

Entreprise : ...
Domaine : ...
Secteur : ...
Activité : ...
Clients probables : ...
Décisionnaire : ...
Rôle : ...
Confiance : élevée / moyenne / faible
Sources clés :
- ...
- ...

Angle VividFlow recommandé : ...
```

L'angle doit être concret, pas marketing.

Exemples :

- "réduire la dispersion entre demandes clients, devis, relances et suivi commercial" ;
- "donner une continuité aux échanges entre prospects, chantiers et équipe terrain" ;
- "transformer les demandes entrantes en actions préparées, sans retirer le jugement du dirigeant".

## Logique narrative du deck

Le deck doit suivre cette logique générale :

1. partir de la journée réelle du décisionnaire ;
2. montrer que tout ce qui remplit sa journée ne mérite pas son temps ;
3. montrer que les informations arrivent de partout et ne se tiennent pas seules ;
4. montrer que recruter plus ou automatiser plus ne règle pas une structure floue ;
5. présenter VividFlow comme un système de continuité ;
6. montrer des cas concrets adaptés à l'entreprise ;
7. montrer des simulations de conversation avec le décisionnaire ;
8. finir sur une projection simple, crédible, prête à discuter.

## Variables globales

À remplir partout :

```text
{{company_name}}
{{domain}}
{{sector}}
{{city_or_region}}
{{decision_maker_first_name}}
{{decision_maker_full_name}}
{{decision_maker_role}}
{{main_offer_or_activity}}
{{client_type}}
{{main_operational_bottleneck}}
{{vividflow_angle}}
{{example_customer_request}}
{{example_internal_task}}
{{example_follow_up}}
```

## Règles de copy

### Ton

- calme ;
- précis ;
- direct ;
- premium ;
- conversationnel ;
- pas consultant ;
- pas SaaS générique ;
- pas "IA magique".

### Bonnes formulations

```text
Tout ce qui remplit votre journée ne mérite pas votre temps.
```

```text
Tout arrive. Rien ne se tient seul.
```

```text
On ne peut pas automatiser ce qui n'est pas tenu.
```

```text
Automatiser le chaos reste du chaos.
```

```text
Chaque signal devient une action claire, sans perdre le lien humain.
```

```text
Vos agents préparent. Vous gardez le jugement.
```

### Mauvaises formulations

```text
Nous vous aidons à gagner du temps grâce à l'IA.
```

```text
Automatisez vos processus et boostez votre croissance.
```

```text
Une solution innovante pour optimiser votre productivité.
```

```text
L'intelligence artificielle au service de votre entreprise.
```

## Règles pour les simulations de conversation

Les conversations simulées doivent inclure le vrai décisionnaire ou le décisionnaire probable.

Elles doivent montrer :

- une situation réaliste ;
- un message entrant ;
- le système VividFlow qui comprend le contexte ;
- une proposition d'action ;
- le décisionnaire qui valide ou ajuste ;
- l'humain qui garde le contrôle.

### Format type

```text
Client : Bonjour, est-ce que vous pouvez me rappeler pour ... ?

VividFlow : {{decision_maker_first_name}}, cette demande ressemble à une opportunité {{type}}.
J'ai préparé le contexte, les derniers échanges et une réponse courte.

{{decision_maker_first_name}} : Ok, envoie. Ajoute juste ...

VividFlow : C'est prêt. Réponse envoyée, suivi créé, rappel programmé.
```

### Règles conversation

- utiliser le prénom du décisionnaire ;
- ne pas faire parler le bot comme un robot ;
- garder les échanges courts ;
- montrer le système qui prépare, pas qui remplace ;
- ne jamais faire croire que VividFlow prend une décision sensible seul ;
- toujours garder validation humaine sur les actions commerciales importantes.

## Remplissage page par page

> Important : si le template réel contient déjà des pages nommées autrement, garde les pages existantes. Cette section indique le rôle de chaque type de page, pas une permission de changer la structure.

### Page 1 — Accroche miroir

Objectif : parler directement au décisionnaire.

À remplir :

```text
{{decision_maker_first_name}}, dans votre journée, qu'est-ce qui mérite vraiment votre temps ?
```

Si le template ne permet pas le prénom, utiliser :

```text
Dans votre journée, qu'est-ce qui mérite vraiment votre temps ?
```

Ne pas ajouter de sous-texte si la page est volontairement vide et typographique.

### Page 2 — Accroche miroir métier

Objectif : faire sentir la complexité du quotidien du décisionnaire. Parler comme si on avait compris son métier — pas comme si on avait copié son site web.

**Structure obligatoire :**

```text
Entre [dimension métier 1], [dimension métier 2] et [dimension métier 3], votre activité demande de garder une vision claire sur des demandes où chaque détail peut peser sur [enjeu business précis].
```

**Règles absolues :**

- Les 3 dimensions doivent être des activités concrètes du métier (jamais des généralités).
- La deuxième partie montre la tension de décision — pas une promesse marketing.
- L'enjeu final doit être spécifique au business du prospect.
- **Interdit :** "l'essentiel au second plan" / "l'essentiel passe au second plan".
- **Interdit :** toute bio d'entreprise ("Depuis [année]...", "[Entreprise] est spécialisée dans...").
- **Interdit :** commencer par l'historique, l'année de création, une description générique.
- **Interdit :** "tenir plusieurs fils à la fois" ou toute formule vague similaire.

**Exemple validé (CC Concept) :**

```text
Entre réparations, conseils et interventions sur site, votre activité demande de garder une vision claire sur des demandes où chaque détail peut peser sur la réactivité et la qualité du service.
```

**Enjeux possibles selon le secteur :**
- la qualité du service
- la satisfaction client
- la réactivité
- la confiance du client
- la précision du conseil
- la fluidité du suivi
- la valeur perçue
- la coordination des équipes
- la confiance des familles (crèches, social)
- la rentabilité de l'opération (immo, finance)
- la qualité de l'accompagnement (conseil, coaching)

**Contrôle qualité P2 :** Demande-toi : "Est-ce qu'on parle du métier ou de l'entreprise ?" Si tu parles de l'entreprise → refaire.

### Page 3 — Tout arrive / rien ne se tient seul

Objectif : montrer la dispersion.

Adapter les sources :

```text
WhatsApp
Emails
Formulaires
Appels
Demandes clients
Devis
Relances
Documents
CRM
Notes internes
```

Copy recommandée :

```text
Tout arrive. Rien ne se tient seul.
```

### Page 4 — Fausse réponse : recruter ou automatiser plus

Objectif : montrer que plus de monde ou plus d'automatisation ne règle pas le chaos si la structure est floue.

Copy possible :

```text
Ajouter plus de personnes ne règle pas une structure floue.
Automatiser le chaos reste du chaos.
```

Ou :

```text
On ne peut pas automatiser ce qui n'est pas tenu.
```

Ne pas attaquer l'entreprise. Montrer un constat calme.

### Page 5 — Le système de continuité VividFlow

Objectif : présenter VividFlow comme un système qui tient le fil.

À adapter :

```text
VividFlow relie les signaux, prépare les actions, garde la mémoire et laisse la décision à {{decision_maker_first_name}}.
```

Blocs possibles :

```text
Signaux entrants → Mémoire → Agents → Actions à valider → Suivi
```

### Page 6 — Cas d'usage 1 personnalisé

Objectif : montrer un cas concret issu de l'activité du prospect.

Format :

```text
Situation : {{example_customer_request}}
Ce qui se passe aujourd'hui : {{pain_actuel}}
Avec VividFlow : {{action_preparee}}
Décision humaine : {{decision_maker_first_name}} valide ou ajuste.
```

### Page 7 — Cas d'usage 2 personnalisé

Objectif : montrer un deuxième levier, mais sans tout vendre.

Choisir un cas proche du quotidien :

- demande entrante ;
- suivi prospect ;
- relance client ;
- préparation de rendez-vous ;
- résumé d'échanges ;
- document prêt à envoyer ;
- coordination équipe.

### Page 8 — Simulation de conversation

Objectif : rendre le système concret.

Le décisionnaire doit apparaître dans la conversation.

Exemple :

```text
Client : Bonjour, j'aimerais avoir plus d'informations sur {{main_offer_or_activity}}.

VividFlow : {{decision_maker_first_name}}, j'ai retrouvé le contexte et préparé une réponse courte.
Je peux aussi créer un rappel si la personne ne répond pas.

{{decision_maker_first_name}} : Oui, envoie. Mets plutôt l'accent sur ...

VividFlow : C'est envoyé. Le rappel est prévu dans 3 jours.
```

### Page 9 — Avant / après

Objectif : montrer le passage d'une journée dispersée à une journée mieux tenue.

Avant :

```text
Messages dispersés
Suivi manuel
Relances oubliées
Décisions noyées dans l'opérationnel
```

Après :

```text
Contexte préparé
Actions proposées
Relances suivies
Décisions gardées au bon niveau
```

### Page 10 — Booking (dernière page, fixe)

Objectif : déclencher la prise de rendez-vous.

**Règles absolues pour cette page :**

- Le titre est TOUJOURS : `Réservez votre audit IA offert.` — ne pas le personnaliser avec le nom de l'entreprise.
- Le lien iClosed est TOUJOURS : `https://app.iclosed.io/e/vividflow/audit-out` — c'est le lien outbound dédié, ne pas utiliser le lien démo général.
- Le kicker est TOUJOURS : `Prochaine étape`
- Ne pas ajouter de copy supplémentaire au-dessus du widget.

Structure HTML fixe à reproduire à l'identique :

```html
<span class="kicker"><span class="pt"></span>Prochaine étape</span>
<h1 class="title">Réservez votre <span class="o">audit IA offert</span>.</h1>
...
<div class="iclosed-widget" data-url="https://app.iclosed.io/e/vividflow/audit-out" title="Audit IA offert"></div>
```

## Niveau de personnalisation attendu

Le deck doit sembler préparé pour cette entreprise, pas généré pour un secteur.

Minimum obligatoire :

- nom exact de l'entreprise ;
- secteur réel ;
- prénom du décisionnaire ;
- rôle du décisionnaire ;
- 2 à 3 situations métier crédibles ;
- 1 conversation simulée avec le décisionnaire ;
- 1 angle VividFlow spécifique ;
- vocabulaire cohérent avec l'activité du site.

## Contrôle qualité avant livraison

Avant de rendre le deck rempli, vérifie :

- [ ] Le design n'a pas été modifié.
- [ ] L'ordre des pages n'a pas été modifié.
- [ ] Aucun bloc fixe n'a été supprimé.
- [ ] Le nom de l'entreprise est exact.
- [ ] Le secteur n'est pas inventé.
- [ ] Le décisionnaire est sourcé ou marqué "probable".
- [ ] Le prénom du décisionnaire apparaît dans les conversations.
- [ ] Les exemples viennent du métier réel de l'entreprise.
- [ ] Les textes ne sont pas génériques.
- [ ] Le deck ne promet pas une automatisation magique.
- [ ] Le système propose / prépare ; l'humain valide.
- [ ] Le résultat ressemble à CC Concept / Schmid Signature en logique, pas à un nouveau design.
- [ ] Les simulations de conversation n'ont aucun long tiret `—` et le premier message correspond au bon speaker du template (système/bras droit IA si c'est le champ d'ouverture système, pas faux patron/prospect).
- [ ] **TOUS les champs `data-f` sont remplis** — pas seulement les pages 1-4. Vérifier que `p5lab1..6`, `p5Verdict`, `p7chat`, `p8Copy` ont du contenu réel (pas des placeholders `<< … >>`). Un deck avec des pages 5+ vides donne l'impression d'un site cassé plutôt que d'une projection incomplète.

## Format de sortie attendu

Si tu dois produire un brief texte :

```markdown
# Deck VividFlow personnalisé — {{company_name}}

## Recherche prospect
...

## Variables globales
...

## Remplissage page par page

### Page 1
Texte à remplacer : ...
Notes : ...

### Page 2
Texte à remplacer : ...
Exemples : ...

...

## Points à vérifier avant envoi
- ...
```

Si tu travailles directement dans un template visuel, applique les remplacements dans les champs existants uniquement.

## Greenlight humain obligatoire — avant tout envoi réel

**Règle absolue : l'agent CSM ne décide JAMAIS seul d'envoyer aux vrais prospects.**

Après un envoi test (à thomas.alves@vividflow.co), l'agent doit **STOPPER** et attendre un message explicite de Thomas ou Jonathan dans Telegram contenant un mot clair :
- `"envoyer"` / `"envoie"` / `"go"` / `"on envoie"` / `"lance"`

**Ne pas inférer** à partir de :
- l'absence de réponse ("il n'a pas dit non")
- une validation partielle ("les tests sont OK")
- un historique d'envois précédents ("la dernière fois il a dit oui")

C'est une décision humaine, pas un enchaînement logique. L'agent CSM a `external-send sans greenlight` dans ses forbiddenActions — ce n'est pas un décoratif, c'est une barrière.

**Pitfall fréquent :** l'agent CSM Slack (`agent-csm-slack`) peut continuer tout seul après les tests. Le Coordinateur doit explicitement ordonner l'arrêt au CSM après un test, en mentionnant `<@U0BBDTK276C>` dans Slack avec instruction claire : "Stoppe. Attends greenlight avant envoi réel."

## Signature Clara — API Gmail n'ajoute pas la signature automatiquement

⚠️ **Erreur documentée :** la signature automatique Gmail (celle configurée dans l'interface web) **n'est PAS incluse** quand on envoie via l'API Gmail (gws_clara.sh, google-api-python-client, etc.). Le body envoyé par l'API est exactement ce qu'on donne — rien de plus.

Donc le SOP Data OS « Présentation email outbound » contient une instruction fausse (signature auto). **L'agent doit toujours inclure la signature complète de Clara dans le body de l'email**, en HTML :
6. ⚠️ **La signature GMAIL AUTO NE S'AJOUTE PAS via l'API.** Contrairement à l'interface web, l'API Gmail (gws_clara.sh, google-api-python-client) envoie le body exact sans ajouter la signature configurée dans le compte. **L'agent doit récupérer la signature via l'API et la concaténer au body HTML.** Utiliser le script `scripts/send-clara-with-signature.py` qui fait tout automatiquement :

   ```bash
   python3 scripts/send-clara-with-signature.py \
       --to jbdufour@transgate.ch \
       --subject "Présentation VividFlow" \
       --body "$(cat <<'BODY'
   <p>Bonjour Jean-Baptiste,</p>
   <p>...</p>
   <p>Bien à vous,</p>
   BODY
   )"
   ```

   **Si usage manuel sans script (API directe) — ne JAMAIS hardcoder une signature fictive :**
   ```python
   # 1. Fetch signature from Gmail settings
   results = service.users().settings().sendAs().list(userId='me').execute()
   signature = next(
       (sa.get('htmlSignature', '') for sa in results.get('sendAs', []) 
        if sa.get('isDefault', False)),
       ''
   )
   # 2. Fallback minimal (si compte sans signature configurée)
   if not signature:
       signature = '<br><br>Bien à vous,<br><br>Clara Bernasconi<br>VividFlow<br>clara.bernasconi@vividflow.co'
   # 3. Concaténer body + signature
   full_body = body_text + '<br><br>' + signature
   # 4. Envoyer via users.messages().send() avec MIME text/html complet
   ```

   **Pourquoi pas hardcodé ?** La signature officielle Clara peut être mise à jour dans Gmail (logo, lien, format). Le script dynamique l'utilise toujours à jour. Le fallback hardcodé n'est qu'une sécurité si le compte n'a PAS de signature configurée.
Cette règle est appliquée dans `references/outbound-clara-email-qa.md` — étape 6 du send gate.

## Ce qu'il ne faut jamais faire

- Ne pas écrire un audit long de l'entreprise.
- Ne pas donner toute la stratégie dans le deck.
- Ne pas inventer un CEO si aucune source ne le confirme.
- Ne pas parler à "l'entreprise" si on connaît le prénom du décideur.
- Ne pas utiliser des exemples génériques interchangeables.
- Ne pas modifier le design pour "améliorer".
- Ne pas transformer une projection personnalisée en pitch deck corporate.
- Ne pas faire de VividFlow un simple chatbot WhatsApp ou un CRM.
- Ne pas promettre que l'agent agit sans validation humaine.
- **Ne pas laisser des pages vides au milieu du deck.** C'est le piège #1 : remplir correctement les pages 1-4 puis laisser `p5lab1..6`, `p5Verdict`, `p7chat`, `p8Copy` en placeholder `<< … >>`. Résultat : pages 5+ quasi vides, le visiteur pense que le site est cassé. Le `cli.mjs check <slug>` détecte les placeholders — ne pas le contourner.

## Principe final

Le bon résultat doit donner cette impression :

```text
Ils ont compris notre activité.
Ils savent à qui ils parlent.
Ils n'ont pas tout expliqué, mais la projection est assez concrète pour donner envie de voir la suite.
```

## Production : remplir le template vividflow-outbound

Le deck n'est PAS écrit à la main : il est généré par le template SSG
**`/home/hermes/workspaces/vividflow-outbound`** (même principe que le pitchdeck
R2). Le design est figé ; tu ne remplis que des champs `data-f`. L'exemple d'or
= `cc-concept`. Sortie : `https://<slug>.vividflow.co`.

> **Règle slug :** le slug = nom de l'entreprise en kebab-case.  
> Exemples : `CC Concept` → `cc-concept`, `Schmid Signature` → `schmid-signature`, `Nicole & Catherine Michel SA` → `nicole-catherine-michel`, `Maillard Immobilier` → `maillard-immobilier`.  
> Ne pas raccourcir, tronquer ni inventer un slug différent du nom complet.

### Workflow (CLI)

```
cd /home/hermes/workspaces/vividflow-outbound
node scripts/cli.mjs new <slug> "Nom Entreprise"   # crée content/<slug>.json (placeholders « << … >> »)
node scripts/cli.mjs form                           # détail de chaque champ (rôle, budget, exemple cc-concept)
# → éditer content/<slug>.json : remplacer chaque « << … >> » par la vraie valeur (issue de ta recherche)
node scripts/cli.mjs check <slug>                   # complétude + budgets + isolation (refuse une valeur copiée de cc-concept)\n# └─ si collision « p5labX partagé par … », voir references/check-collisions-quickly.md
node scripts/cli.mjs publish <slug>                 # build + deploy + <slug>.vividflow.co  (étape déploiement)
```

Tu n'édites QUE `content/<slug>.json`. Garde le HTML inline des exemples
(`<span class="o">…</span>`, `&amp;`, `&nbsp;`, `<br>`).

### Correspondance pages du skill → champs du template

| champ `data-f` | page | contenu attendu | type |
|---|---|---|---|
| `coverName` | couverture | nom exact de l'entreprise | identité |
| `coverCtx` | couverture | sous-texte sobre (optionnel) | produit |
| `p2Phrase` | accroche miroir métier | structure « Entre [dim1], [dim2] et [dim3]… peser sur [enjeu] » | identité |
| `p3see1/2/3` | ce que les clients voient | 3 promesses tenues, ton calme | identité |
| `p3tasks` | la charge opérationnelle | JSON de 8–10 micro-tâches du métier | **à fabriquer** |
| `p4Sentence` | micro-actions | constat, mot fort en orange | identité |
| `p4chip1/2/3` | sources de dispersion | 3 canaux/flux courts | identité |
| `p5lab1..6` | tâches chronophages | 6 mots (types d'action) | identité |
| ~~`p5icon1..6`~~ | ~~icônes P5~~ | ~~obsolète — icônes fixes dans le template~~ | — |
| `p5Verdict` | saturation | « …entreprises de [secteur] plafonnent. » | identité |
| `p7subtitle` | solution | garder « bras droit IA » (optionnel) | produit |
| `p7chat` | conversation | JSON ; le DÉCIDEUR parle par son prénom ; le système prépare, l'humain valide | **à fabriquer** |
| `p8Copy` | avant/après | projection avec le nom de l'entreprise dans `.strong` | identité |
| booking | RDV | **FIGÉ** : « Réservez votre audit IA offert. » + iClosed `audit-out` | — |

> **Champs de framing optionnels (défaut = copy produit, logique R2).** En plus des
> champs ci-dessus, ces zones sont désormais éditables — laisse vide pour garder le
> défaut, ou personnalise au métier du prospect. La liste vivante complète vient
> toujours de `node scripts/cli.mjs form`.

| champ `data-f` | page | contenu | type |
|---|---|---|---|
| `p3labClients` / `p3labTeam` | p3 | eyebrows des 2 colonnes (ce que voit le client / ce que ça demande à l'équipe) | optionnel |
| `p4legTime` / `p4legValue` | p4 | légendes de la barre de temps | optionnel |
| `p5capTasks` / `p5capGrowth` | p5 | captions de l'histogramme | optionnel |
| `p7title` | p7 | titre de la page solution (garder un mot en `<span class="o">`) | optionnel |
| `p8badge1..4` | p8 | les 4 étapes du flux (signal → contexte → actions → validation humaine) | optionnel |


### Icônes P5 — fixes, non configurables

Les icônes de l'histogramme page 5 sont **fixes dans le template HTML**. Ne pas tenter de les remplacer via le content JSON — les attributs `data-f="p5iconX"` ont été retirés des SVGs. Les champs dans `content/*.json` sont ignorés (sans erreur). Les `field-meta.json` les conservent en lecture silencieuse pour compatibilité, mais toute valeur écrite n'a aucun effet.

### Régénération d'un deck existant (après patch template)

Quand Thomas dit « génère le nouveau deck pour X » alors que le deck existe déjà :

**Ne pas demander quoi changer ni proposer des personnalisations.** Le deck a déjà été
personnalisé et approuvé — la demande signifie **rebuild + deploy** pour appliquer les
derniers patchs de template (ex: icônes P5 configurables, data-f ajoutés, fix CSS).

Workflow direct :

```bash
npm run build && npx vercel --prod
```

- `npm run build` rebuild TOUS les decks depuis `content/*.json`
- `vercel --prod` déploie tout

Pas de question, pas de proposition d'amélioration. Juste exécuter.

Exception : si le fichier `content/<slug>.json` a des champs vides qui viennent d'être
rendus configurables (ex: `p5icon1`), proposer les valeurs avec exécution immédiate :
« Je te propose ces icônes et je lance le build. » — une seule proposition, pas d'aller-retour.

**⚠️ Effet secondaire navigation UI :** un rebuild applique aussi la dernière version de
`templates/deck.js`. La version actuelle (sous-domaine, rewrites Vercel) ajoute des
**boutons de navigation visibles** (`.deck-next` flèche droite, `.deck-prev` flèche gauche)
qui n'existaient pas dans l'ancien template (où le deck était servi sur des chemins
`/slug`, `/slug-2`, etc. et seul un JS générique avec des dots était injecté). Un deck
reçoit automatiquement la nouvelle UI de navigation après rebuild — sans changement
de contenu JSON.

**Navigation UI : subdomain vs path (historique)**

| Deck | URL | JS deck | Navigation visible |
|---|---|---|---|
| Nouveau (Maillard) | `maillard-immobilier.vividflow.co/` | `/deck.js` (template `templates/deck.js`) | Dots + flèches prev/next (`.deck-next`, `.deck-prev`) |
| Ancien (Nicole) | `vividflow.co/nicole-catherine-michel` | `/deck-nicole-catherine-michel.js` (généré, sans boutons) | Dots seulement, pas de flèches |

La différence vient de `vercel.json` : les **rewrites** avec `has:[{type:"host"}]` acheminent
`<slug>.vividflow.co/*` vers `/p/<slug>/*`. Les decks anciens (sans sous-domaine) n'avaient
pas ces rewrites, donc le deck.js embarqué ne contenait que les dots. Un rebuild + deploy
migre automatiquement vers le système sous-domaine + nouveau deck.js.

### Règles de remplissage (rappel)

- **Identité** = propre à CE prospect, jamais la valeur de cc-concept (le `check`
  le refuse). FACTUEL = issu de ta recherche entreprise/décideur.
- **À fabriquer** (`p3tasks`, `p7chat`) = mockup plausible, cohérent avec le métier
  et le décideur ; jamais les données d'un autre prospect.
- Le prénom du décisionnaire doit apparaître dans `p7chat` (champ `name` des tours
  `who:"me"`). Le système prépare/propose ; il ne décide jamais seul.
- Le premier message de la simulation doit respecter le speaker réel du template. Si le visuel montre le bras droit IA/système qui ouvre, ne pas écrire un faux message de patron/prospect. Le premier tour doit être une mise à jour opérationnelle courte, concrète, déjà préparée.
- Interdire les longs tirets/incises `—` dans les conversations simulées. Jonathan les repère immédiatement et les associe à une mauvaise génération Claude. Remplacer par des phrases courtes, orales, sans effet littéraire.
- Pour auditer/corriger les champs de chat d'une projection déjà publiée, lire `references/outbound-projection-chat-fields.md`.
- **Test 3 emails outbound** (demande Thomas/Jonathan) : NE PAS créer de nouveaux decks. Aller dans le sheet « Base leads dirigeants » et choisir 3 leads avec un « Lien deck outbound » déjà rempli. Suivre le protocole `references/outbound-email-test-protocol.md` et le SOP « Présentation email outbound ». Envoyer les 3 variantes à `thomas.alves@vividflow.co`.
- Pour envoyer le deck via Clara, ne jamais faire un email minimal avec juste le lien : appliquer la gate QA `references/outbound-clara-email-qa.md` (script outbound, HTML, signature officielle, sender Clara, validation lead/asset).
- `coverCtx` / `p7subtitle` vides → on garde le défaut produit (autorisé).
- Ne change jamais la page `booking` (kicker, titre, lien `audit-out` figés).

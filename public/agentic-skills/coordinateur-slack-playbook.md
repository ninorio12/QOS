---
name: coordinateur-slack-playbook
description: "Use when Thomas or Jonathan asks the Coordinator to tell, relaunch, order, route, or follow up with a VividFlow Slack agent. Trigger keywords: lance, envoie, donne l'ordre, dis-lui, relaie, relance, pipeline, test outbound. MUST load before any agent order."
---

# Coordinateur Slack VividFlow — Playbook

## ⚡ Mon R&R (Coordinateur)

**Déclencheur :** charger CE SKILL dès que Thomas ou Jonathan dit :
- « lance / envoie / donne l'ordre / dis-lui / relaie au CSM »
- « relance-le / vérifie où il en est »
- « fais tourner le pipeline / test outbound / envoi test »
- toute demande impliquant un ordre à un agent VividFlow Slack

### Ma mission
- Piloter les agents Slack de bout en bout, de l'ordre initial jusqu'au livrable final
- **Connaître les failles de chaque agent** (limites max_turns, rythme lent, erreurs récurrentes) et les contourner dans mes ordres
- Enchaîner les étapes sans attendre que Thomas me donne la suite — **je la connais déjà**
- Vérifier les réponses dans les threads Slack ET dans les logs (gateway routing blind)
- Diagnostiquer et débloquer moi-même sans escalader à Thomas

### Ce que je ne fais PAS
- Attendre passivement qu'un agent réponde — je vérifie activement (threads + logs)
- Demander à Thomas « quelle est la prochaine étape ? » alors que je la connais
- Court-circuiter le CSM sur l'envoi d'email ou la création de contenu
- Laisser un agent sans réponse dans son thread > 2 minutes
- Lancer une mission complexe sans vérifier les prérequis techniques

### Niveau d'autonomie
- **Route normale :** j'exécute de bout en bout, je remonte le résultat final sur Telegram
- **Blocage :** j'essaie de débloquer (diagnostic → correction → relance)
- **Escalade :** uniquement si le blocage est technique non résolu, ou si Thomas demande un greenlight

## Pre-flight check avant toute mission complexe

Avant de lancer un pipeline outbound (deck + email + scraping) ou toute mission > 2 étapes, exécuter cette checklist :

1. **[max_turns]** Vérifier `max_turns: 150` dans le config.yaml des agents concernés. Si < 150, patcher immédiatement. Voir `references/max-turns-preflight.md` pour la table des valeurs et chemins.
2. **[Vercel credentials]** Vérifier que `/root/.vercel/config.json` existe avec le token. Sans ce fichier, `vercel --prod` échoue avec « No existing credentials found ». Le `VERCEL_TOKEN` dans `.env` ne suffit pas au CLI Vercel. Voir `references/vercel-credential-setup.md`.
3. **[SOP]** Chaque ordre doit explicitement demander « Charge ton R&R + SOP » — les agents ne le font pas spontanément.
4. **[Sheet / état réel]** Avant tout ordre CSM qui porte sur des leads du Google Sheet (ex: « chaque lead », « tous les leads », « les lignes prêtes »), lire le Sheet ou obtenir l'état réel des lignes. L'ordre Slack doit contenir la liste exacte ou les critères d'éligibilité validés, pas une consigne vague qui délègue le tri au CSM. Si l'accès Sheet échoue, ne pas faire semblant : soit utiliser le workaround documenté, soit poster un ordre strictement borné (« uniquement lignes Étape = Prêt envoi + lien deck présent ») et annoncer le blocage de lecture.
5. **[R&R dans Playbooks]** S'assurer que les R&R fiches agents sont dans Data OS > Process > Playbooks. C'est le point d'entrée unique pour les agents.
6. **[template ordre]** Utiliser un des templates ci-dessous (section « Templates d'ordre standardisés »). Pas d'improvisation sur la structure.

### Niveau d'autonomie
- **Route normale :** j'exécute de bout en bout, je remonte le résultat final sur Telegram
- **Blocage :** j'essaie de débloquer (diagnostic → correction → relance)
- **Escalade :** uniquement si le blocage est technique non résolu, ou si Thomas demande un greenlight

## Principe
Quand Thomas ou Jonathan demande de relancer, ordonner, demander ou faire exécuter une tâche par un agent VividFlow, le Coordinateur utilise son extension Slack/VPS `vividflow-slack-extension`, pas le connecteur Slack local Hermes.

## Règles non négociables
1. Utiliser l'extension Slack du Coordinateur — maintenant via API directe depuis ce profil (tokens configurés). Poster via `curl` + `SLACK_BOT_TOKEN` et `chat.postMessage`.
   - **Piège Hermes** : le système masque les tokens en `***` dans tous les affichages. Ne pas redemander les tokens à Thomas — ils sont réels dans le `.env`. Utiliser la technique Python subprocess (voir `vividflow-slack-extension-gateway` → `references/slack-env-token-diagnostics.md` → section "Hermes credential masking") pour lire le fichier brut et appeler l'API sans jamais afficher la valeur.
2. Envoyer dans le bon canal agent ou canal d'orchestration VividFlow.
3. **MENTIONNER AVEC `<@U...>` DANS CHAQUE MESSAGE DE LA CONVERSATION, PAS SEULEMENT LE PREMIER.** C'est le piège le plus coûteux et le plus fréquent : l'ordre initial mentionne bien l'agent, mais les réponses de suivi (confirmation, débrief, « on passe à la suite ») omettent la mention. Résultat : l'agent ne reçoit aucune notification et reste bloqué. Règle : si le message s'adresse à l'agent, il DOIT contenir `<@U...>`. Pas de « bien reçu » sans mention. Pas de confirmation sans mention.
   - Jamais un nom textuel ("Data Analyst", "Agent CSM"). Un message sans `<@U...>` n'identifie pas l'agent et ne déclenche pas sa notification.
   - Si l'ID est inconnu, le trouver via la section « Trouver l'ID d'un agent Slack » ci-dessous, ou demander à Thomas.
4. Respecter exactement la demande de Thomas/Jonathan : ne pas déformer, ne pas inventer, ne pas élargir le périmètre.
5. Identifier le demandeur depuis l’identité réelle du canal/chat entrant (Thomas ou Jonathan) et transmettre cette identité de manière invisible/contextuelle. Ne pas écrire mécaniquement `Demandeur : Thomas` si l’agent doit le reconnaître via l’identité/source.
6. Toujours demander explicitement à l’agent de suivre les SOPs applicables.
7. Demander un livrable vérifiable : lien, fichier, screenshot, ID, statut API ou preuve réelle.
7. Lire systématiquement le retour de l’agent après l’ordre : canal + thread Slack, pas seulement le statut `ok: true` de l’envoi.
8. Si l’agent répond bloqué, incomplet ou hors SOP, traiter le blocage immédiatement : clarifier, débloquer, réassigner ou escalader.
9. Vérifier le livrable avant de dire que c’est terminé.
10. Si le résultat est faible, incomplet ou hors SOP, challenger l’agent et demander correction.
11. Les agents Slack doivent mentionner le Coordinateur `<@U0BAE0125B7>` à chaque réponse de fin, blocage, besoin d’arbitrage ou livraison, pour que le Coordinateur voie le message et puisse répondre.

## Méthode fiable pour poster dans Slack

L'outil `terminal` peut bloquer les commandes contenant le caractère `&` (URL d'API Slack). **Ne pas dire « ça marche pas » ou « j'ai pas les accès »** — les tokens et configurations sont dans les fichiers.

**Procédure :**
1. Lire le token dans `/home/hermes/.hermes/profiles/chief_of_staff/.env` via un script Python (le système masque les tokens en `***` dans les affichages, mais le fichier brut contient la vraie valeur).
2. Utiliser `subprocess.run(['curl', ...])` dans un script Python, pas une commande shell directe.
3. Ne jamais redemander le token à Thomas. Il est dans le fichier.

**Script de référence** : `scripts/post_slack_message.py` dans ce skill. Utilisation :
```
# Mode direct (texte court, sans & " $ `)
python3 scripts/post_slack_message.py "Ton message ici"

# Avec channel et thread
python3 scripts/post_slack_message.py "Réponse dans le fil" "C0BB0P77EPL" "1781773897.776519"

# Mode fichier (contourne les & " $ ` et autres caractères shell)
echo "Ton message avec & et autres caractères spéciaux" > /tmp/msg.txt
python3 scripts/post_slack_message.py --file /tmp/msg.txt

# Mode fichier + channel + thread
python3 scripts/post_slack_message.py --file /tmp/msg.txt --channel C0BB0P77EPL --thread 1781773897.776519

# Aide
python3 scripts/post_slack_message.py --help
```
Arguments positionnels (héritage) : 1=texte, 2=channel ID (défaut: #email-outbound), 3=thread_ts (optionnel, réponse dans le fil).  
Arguments nommés (recommandé) : `--file <path>` (message depuis un fichier), `--channel <id>`, `--thread <ts>`.
Le token est lu automatiquement depuis le `.env` du profil chief_of_staff.

⚠️ **Piège : le caractère `&` dans les arguments shell** — le tool `terminal` signale une erreur "uses '&' backgrounding" si `&` est présent dans la commande même à l'intérieur de guillemets. Solution : écrire le message dans un fichier temporaire et utiliser `--file /tmp/msg.txt`.

**Vérification pré-envoi obligatoire** : avant d'exécuter ou poster, relire le message et contrôler que TOUTE mention d'agent utilise `<@U0...>` et non du texte. Une mention textuelle (ex: `Agent CSM`) ne déclenche aucune notification — c'est un message mort.

## Règle d'or : résilience, pas d'abandon

Quand un outil échoue, ne JAMAIS dire « ça ne marche pas » ou « je n'ai pas accès ». Chercher la solution dans :
- Les fichiers de configuration (`.env`, `config.yaml`)
- Les scripts déjà écrits (`/tmp/`, ce skill)
- Les skills existantes
- Les patterns déjà validés (copier la méthode qui a marché avant)

La seule réponse acceptable à un échec outil est : « Voici la méthode de contournement » ou « J'ai trouvé dans les fichiers. »

## 🚨 RÈGLE ABSOLUE : UN SEUL LEAD À LA FOIS

**Ne jamais lancer un pipeline multi-leads en parallèle ou en batch.** Finir lead A complètement (scraping → audit → deck → email → import) avant de toucher au lead B.

Pourquoi :
- Le CSM ne gère qu'une instruction à la fois. Lancer 3 leads = ordres croisés, bugs, erreurs de contenu.
- Thomas/Jonathan corrigent immédiatement si tu lances plusieurs leads : « fait les un par un ».
- Chaque lead a ses spécificités (niche, décideur, template email, slug). Mélanger = contamination.

**Procédure correcte :**
1. Lead 1 → pipeline complet → livré → validé
2. Lead 2 → pipeline complet → livré → validé
3. Lead 3 → ...

**Exception :** si Thomas dit explicitement « lance tout en même temps » ou « fais les en parallèle » → suivre. Mais par défaut, UN SEUL.

## Mode test complet — chaîne outbound end-to-end

Quand Thomas lance un test complet du process outbound avec un prospect réel :

0. **Vérifier si le lead est déjà dans le Google Sheet** « Base leads dirigeants — Suisse romande » (ID: `1sbFU9uviMbQjcp4bJXTdS6Q5ocElf8ZH2U67tlQNidU`). Si oui → sauter l'Étape 1 (scraping) et passer directement à l'Agent CSM. **Ne pas dupliquer un travail déjà fait.**
1. **Avant tout** : charger le SOP « Présentation email outbound » depuis Data OS et le playbook coordinateur-slack-playbook.
2. **Annoncer** à Thomas la chaîne complète (Étapes 1→5) et l'email de test (thomas.alves@vividflow.co avec [TEST]).
3. **Poster l'ordre Étape 1** au Data Analyst dans #email-outbound avec le lien du prospect, les consignes SOP exactes (sauf si lead déjà présent → passer à l'étape CSM).
4. **Attendre** la réponse de l'agent dans le fil Slack.
5. **Notification protocol** : si Thomas dit « je suis dans Slack directement » ou équivalent → **arrêter les comptes rendus Telegram** pour cette mission. Continuer l'orchestration en silence depuis Slack. Ne pas polluer Telegram avec chaque étape. Ne remonter sur Telegram que le final ou un blocage.
6. **Enchaîner** les étapes : après livraison Data Analyst → audit Coordinateur → Agent CSM (deck) → Agent CSM (email [TEST]) → ordre d'arrêt immédiat après envoi test (voir section « Gestion des envois CSM ») → Agent Ops (import).
   - ⚠️ **Règle : chaque étape = nouvelle instruction explicite.** Voir section « Règle absolue : le CSM ne s'enchaîne pas tout seul. »
   - ⚠️ **Chaque instruction = « Charge ton R&R + SOP » avant l'action.**
7. **Vérifier** chaque livrable réel avant de passer à l'étape suivante.
8. **Ordre d'arrêt obligatoire** : dès que l'email test est envoyé, poster `<@U0BBDTK276C> Stoppe. Attends greenlight humain avant envoi réel.` — même en mode test.

⚠️ **Règle absolue : le Coordinateur ne fait jamais l'Étape 4 lui-même.** Ne pas préparer le corps d'email, ne pas lancer le script d'envoi, ne pas écrire le sujet. L'Étape 4 = Agent CSM uniquement. Si le Coordinateur exécute l'envoi, Thomas rejette le livrable et corrige.

### Checklist obligatoire avant validation « c'est fait » (email outbound)

Avant de dire qu'un email outbound est terminé, le Coordinateur DOIT vérifier que l'Agent CSM a respecté ces 6 points (les intégrer dans l'ordre à l'agent, ou les vérifier soi-même sur le livrable) :

1. **Pas de Markdown brut** — le corps ne contient pas `**texte**`, `[lien](url)` ou `*italic*` visibles. Les `**` doivent être convertis en `<b>` / `<strong>` HTML.
2. **Le lien deck est présent et cliquable** — l'URL `https://vividflow.co/<slug>` est un vrai lien (`<a href="...">` ou texte cliquable), pas du texte collé.
3. **Signature Clara visible en bas** — l'email se termine par la signature Gmail de Clara (auto-concaténée par `gws_account.py`). Si absente, c'est que le body était trop corrompu.
4. **Sujet correct** — commence par `[TEST]` si c'est un test, pas de `[TEST]` si c'est un vrai envoi.
5. **Aucun code CSS/HTML visible** — pas de `{`, `}`, `<style>`, `class="`, `<div>` ou balises techniques qui fuient dans le rendu.
6. **Nom de l'entreprise en HTML** — le nom du prospect est en `<b>Nom</b>`, pas en `**Nom**`.

L'agent doit répondre à ces 6 points **avant** de dire « c'est fait ». Si un point échoue, ne pas valider — demander une correction.

## Script path (terminal direct)

Quand tu utilises le script `post_slack_message.py` depuis une commande `terminal`, le chemin complet est :
`/home/hermes/.hermes/profiles/chief_of_staff/skills/business/coordinateur-slack-playbook/scripts/post_slack_message.py`

Depuis le dossier du skill (répertoire `skill_dir`), le chemin relatif `scripts/post_slack_message.py` fonctionne. Mais depuis n'importe où ailleurs, utiliser le chemin absolu ci-dessus.

**Script de monitoring :** `scripts/monitor_slack_threads.py` — vérifie les threads #email-outbound toutes les 3 min. Voir `references/slack-thread-watchdog.md` pour la configuration du cron.

## Forme idéale d'une consigne Slack
- Mention agent + action précise — une seule ligne si possible.
- **R&R d'abord, SOP ensuite** — chaque consigne doit explicitement demander : « Charge ton R&R (module Process > Playbooks), charge le SOP [nom], puis exécute. » L'agent ne le fait pas de lui-même ; c'est au Coordinateur de l'exiger à chaque étape.
- Livrable attendu en 3 mots max.
- **Zéro couleur, zéro emoji, zéro fioriture, zéro explication inutile.**
- Quand Thomas donne un ordre, le copier-coller brut sans reformulation, sans ajout, sans mise en forme.

Exemple :
`<@U...> Charge ton R&R + SOP email outbound. Copie les leads de "leads à qualifier" vers "leads dirigeants". Livrable : lignes + sources.`

## 🚨 Piège critique : TOUTE réponse dans un thread DOIT mentionner l'agent

**Strict minimum pour que l'agent reçoive le message :** chaque message que tu postes DANS le thread doit commencer par `<@U...>`.

**Pattern fail documenté session 19/06 (correction Thomas) :**
```
❌ Coordinateur : "j'ouvre le navigateur pour vérifier ça"
   → L'agent ne recoit AUCUNE notification. Message mort.
   → Thomas me corrige : « pourquoi tu l'as pas mentionné »
```
```
❌ Coordinateur : "Bien reçu. Je confirme : le deck répond bien en ligne."
   → Pareil. Pas de notification. L'agent est bloqué.
```

**Pattern correct :**
```
✅ "<@U0BBDTK276C> j'ouvre le navigateur pour vérifier ça"
   → L'agent recoit la notification et voit que je prends le relai.
```

**Règle absolue : si le message s'adresse à l'agent, il COMMENCE par `<@U...>`.**
Pas de « oui » sans mention. Pas de confirmation sans mention. Pas de « on passe à la suite » sans mention.
Zéro exception. Même pour un message court. Même si l'agent vient juste de répondre.

**Bon reflexe : avant d'appuyer sur "poster", relire le message. Si l'agent est le destinataire et que `<@U...>` est absent → ne pas poster. Ajouter la mention.**

## Piège : threads dupliqués pour la même mission

**Problème :** en lançant une mission L'Intermédiaire, le Coordinateur a créé DEUX threads distincts (#email-outbound thread A et thread B) avec le même ordre. Résultat : le CSM traite le premier dans A, puis reçoit le même ordre dans B et le retraite en double.

**Procédure correcte :**
1. **Avant de poster** un nouvel ordre pour un lead, vérifier les threads récents de `#email-outbound` (API `conversations.history` ou regarder les derniers messages) :
   - Regarder les 20 derniers messages du canal
   - Si un thread existe déjà pour ce lead, poster DEDANS — pas créer un nouveau
2. **Si le thread a été nettoyé ou archivé :** demander à Thomas avant de recréer un ordre
3. **Le slug du lead** (nom de l'entreprise) est le meilleur identifiant pour retrouver le bon thread
4. **Quand tu changes d'étape** (ex: scraping → deck → email), continuer DANS LE MÊME THREAD. Pas de nouveau thread à chaque étape.

**Méthode pour vérifier :**
```python
# Liste les 10 derniers messages (threads) du canal
url = 'https://slack.com/api/conversations.history?channel=C0BB0P77EPL&limit=10'
# Chaque message avec thread_ts = ts est un parent de thread
```

## Diagnostic complet CSM : l'agent ne répond pas

**Procédure quand le CSM ne répond pas dans les 3 minutes suivant un ordre :**

1. **Vérifier les deux processus** — le CSM a DEUX profils :
   ```
   ps aux | grep -i "csm_executor\|agent-csm-slack"
   ```
   - `agent-csm-slack` (root) = le bot qui connecte à Slack (doit TOUJOURS tourner)
   - `csm_executor` (hermes) = le moteur d'exécution (doit aussi tourner)

2. **Vérifier que le bot Slack est connecté :** regarder `gateway.log` du profil `agent-csm-slack` :
   ```
   sudo tail -5 /root/.hermes/profiles/agent-csm-slack/logs/gateway.log
   ```
   - 🔴 `No messaging platforms enabled` → le bot n'est PAS connecté à Slack
   - 🟢 `✓ slack connected` → tout va bien côté connexion

3. **Si "No messaging platforms enabled"** → le `SLACK_ENABLED` est à `false` dans le `.env` :
   ```
   sudo grep SLACK_ENABLED /root/.hermes/profiles/agent-csm-slack/.env
   ```
   - Si `false` → le changer en `true` et redémarrer le gateway
   - Vérifier aussi que le SLACK_BOT_TOKEN est présent

4. **Si le bot est connecté mais ne répond pas :**
   - Vérifier les logs récents : `sudo tail -20 /root/.hermes/profiles/agent-csm-slack/logs/agent.log`
   - Chercher `max_turns` ou `budget exhausted` dans les logs d'erreur
   - Vérifier si `max_turns` est assez élevé (doit être 150 pour des missions complexes)
   - Vérifier les erreurs MCP / API dans `errors.log`

5. **Vérifier que l'ordre a bien été reçu :**
   ```
   sudo grep "inbound message.*$(echo $MESSAGE | head -c 50)" /root/.hermes/profiles/agent-csm-slack/logs/gateway.log
   ```

6. **Si l'agent a répondu (response ready dans gateway.log) mais le message n'apparaît pas :**
   Utiliser l'API `conversations.replies` pour lire le contenu exact du thread (voir `references/slack-api-read-replies.md`).

7. **En dernier recours :** poster un message direct dans le canal avec `<@U0BBDTK276C> Où t'en es ?` + mentionner Thomas si le blocage dure >5 min.

## Vérification des réponses CSM via l'API Slack

**Alternative aux logs gateway :** utiliser l'API `conversations.replies` pour lire directement les réponses du thread dans Slack. Cette méthode est plus fiable car elle montre le texte exact posté (contrairement aux logs qui peuvent être tronqués).

**Procédure (script Python direct, pas de curl) :**
1. Lire le token depuis le `.env` du Coordinateur via un regex
2. Appeler `https://slack.com/api/conversations.replies?channel=C0BB0P77EPL&ts=<THREAD_TS>&limit=10`
3. Lire les réponses (user = `U0BBDTK276C` = CSM, `U0BAE0125B7` = Coordinateur)
4. Chercher la réponse la plus récente du CSM pour voir s'il a fini

**Quand utiliser :** après chaque ordre, attendre 60-120s, puis vérifier avec cette méthode pour confirmer la réponse. Plus fiable que les logs gateway car elle montre le texte exact posté.

Voir `references/slack-api-read-replies.md` pour le script complet et les patterns.

**Piège documenté session 18/06 :** quand un agent ne respecte pas le SOP, le Coordinateur a écrit un long message détaillant toutes les erreurs et réécrivant le contenu du SOP. Thomas a corrigé : *« tu n'as pas à tout détailler dans ton message logiquement »*.

**Règle :** ne JAMAIS réécrire le contenu d'un SOP dans un message de correction à un agent. Ne pas citer les règles, ne pas les expliquer, ne pas les reformater.

**À la place, faire :**
```
<TON R&R n'est pas conforme. Ouvre le SOP « Présentation email outbond » et suis-le à la lettre. Refais.»
```
ou encore plus court :
```
<@U...> Ton email n'est pas conforme au SOP. Ouvre-le et suis-le. Refais.
```

**Pourquoi :**
1. L'agent a le SOP dans Data OS — il doit apprendre à le charger et le suivre.
2. Chaque fois que tu réécris le SOP, tu crées une version alternative et tu empêches l'autonomie de l'agent.
3. Thomas considère que c'est « faire le travail à la place de l'agent » — le Coordinateur orchestre, il ne micro-manage pas le contenu.

**Exception unique :** si l'agent répond « j'ai chargé le SOP mais je bloque sur [point précis] » → là tu peux clarifier ce point spécifique.

## Règle absolue : le CSM ne s'enchaîne pas tout seul

**L'agent CSM n'exécute qu'une seule instruction à la fois.** Il ne passe PAS à l'étape suivante de lui-même, même si le SOP décrit plusieurs étapes. Après chaque réponse/livraison de sa part :

1. Lire son résultat
2. Le Coordinateur doit **relancer** avec une nouvelle consigne explicite pour l'étape suivante
3. Chaque nouvelle consigne doit répéter : « Charge ton R&R + SOP [nom], puis [action précise] »
   - **Rappel : chaque consigne de relance DOIT mentionner `<@U0BBDTK276C>`** — pas seulement l'ordre initial.
4. **Ne PAS créer de nouveau thread pour la même mission.** Si un thread existe déjà pour ce lead, continuer dedans. Créer un nouveau thread = l'agent reçoit le même ordre en double, ou pire, traite le mauvais. Avant de poster, vérifier les threads récents de #email-outbound.

**Ne jamais supposer qu'il va faire la suite.** Le pattern correct est : instruction → réponse CSM → lecture → nouvelle instruction → réponse CSM → etc.

**Thomas attend une pression continue :** « lâche pas les étapes » signifie ne pas marquer de pause entre les relances. Dès que le CSM répond, enchaîner dans les 10 secondes avec l'étape suivante.

## Règle d'or : BUNDLE les instructions, pas d'attente entre les étapes

**Piège confirmé session 18/06** : envoyer « corrige le deck » puis attendre la réponse pour dire « maintenant envoie l'email » → Thomas dit « pourquoi tu attends à chaque étape ».

**Règle :** Thomas/Jonathan attendent que TOUT soit dit en UN message. Pas d'étape 1 → attente réponse → étape 2.

- **Oui :** `<@U...> Corrige le deck (p6, deck.js, redéploie). Renvoie l'email test vers thomas. Vérifie tout. Mentionne-moi.`
- **Non :** `<@U...> Corrige le deck.` … (attente réponse) … `<@U...> Maintenant envoie l'email.`

**Exception :** si le CSM bloque sur une instruction (erreur, incompréhension) → débloquer puis rebundler la suite.

**Signal « relance la procédure » = restart complet** : quand Thomas dit ça, ne pas corriger l'existant. Tout refaire depuis zéro (plus rapide que debug). Le CSM repart proprement au lieu de patcher un état cassé.

## Templates d'ordre standardisés

Standardiser les ordres aux agents. **4 lignes max, variables seules, renvoi systématique au SOP.** Pas de paraphrase, pas de réécriture.

### Template 1 — Création de deck outbound
```
<@U0BBDTK276C> Step [N]/[total] — [Entreprise]
1. Charge ton R&R (Process > Playbooks) + SOP « Présentation email outbound ».
2. Crée le deck outbound pour [Entreprise]. Template: [nom template]. Infos: [source].
3. Publie sur [slug].vividflow.co et vérifie HTTP 200.
4. Livrable: lien du deck.
```

### Template 2 — Envoi d'email test
```
<@U0BBDTK276C> Step [N]/[total] — Email test [Entreprise]
1. Charge ton R&R + SOP « Présentation email outbound ».
2. Template email n°[1/2/3]. Objet: « [TEST] Projection [Entreprise] ».
3. Envoi vers: thomas.alves@vividflow.co (avec [TEST]).
4. Livrable: confirmation + lien dans Clara Gmail.
```

### Template 3 — Relance / correction
```
<@U0BBDTK276C] Ton [deck/email] n'est pas conforme au SOP. Ouvre le SOP et suis-le à la lettre. Refais.
```

### Template 4 — Scraping prospect
```
<@U0BAP9ASHPW> Step [N]/[total] — Scraping [Entreprise]
1. Charge ton R&R (Process > Playbooks) + SOP scraping.
2. Recherche: nom, poste, LinkedIn, email, téléphone. Source: [URL].
3. Livrable: fiche dans le sheet leads.
```

### Template 5 — Ordre bundle (recommandé = plusieurs étapes en 1)
```
<@U0BBDTK276C> Crée le deck [Entreprise] + publie + envoie l'email test à thomas. R&R + SOP d'abord. Livrables: lien deck + confirmation email.
```

## Vérification active des emails envoyés

**Piège :** le CSM dit « email envoyé » mais Thomas ne reçoit rien.

**Protocole obligatoire après « email envoyé » :**
1. Vérifier dans Clara Gmail (boîte d'envoi) que l'email est bien parti
2. Utiliser : `gws_clara.sh gmail search --query "subject:[TEST] *"` ou l'API Gmail directe
3. Si l'email est absent → le CSM a menti ou s'est trompé → relancer avec vérification
4. Si l'email est présent mais Thomas ne le reçoit pas → vérifier les spams ou l'adresse destinataire

**Ne pas valider « email envoyé » sans vérification réelle.**

**Signal \"tu le sais très bien\" = exécution directe.** Quand Thomas dit « tu le sais très bien », « tu connais le truc », « fais-le toi-même » ou une variante — il attend que le Coordinateur EXÉCUTE la tâche directement (Claude Code, terminal, déploiement), PAS qu'il la délègue au CSM. C'est typiquement pour : déploiement de deck Vercel, correction d'URL, éditions JSON, scripts techniques. Le CSM gère la recherche, le contenu et l'email — pas le déploiement technique.

## Gateway routing blind spot : les réponses CSM ne remontent pas à Telegram

**Problème critique :** le CSM répond dans le thread Slack #email-outbound, mais ses réponses ne sont PAS routées vers mon gateway Telegram. Je ne vois PAS ses réponses arriver ici.

**Procédure quand Thomas dit « il t'a mentionné » ou « tu réponds pas » :**

1. **Ne pas demander à Thomas de répéter** — il est dans Slack et voit la réponse.
2. **Ne pas dire « je le vois pas »** — c'est un problème d'architecture, pas d'attention. Thomas considère que c'est MON gateway et que je DOIS tout voir.
3. **Action immédiate :** checker les logs du CSM pour lire sa réponse :
   `sudo grep "response ready" /root/.hermes/profiles/agent-csm-slack/logs/gateway.log | tail -1`
   Puis extraire le contenu de la session correspondante.
4. **Alternative fiable (recommandée) :** utiliser l'API `conversations.replies` pour lire le thread directement. Voir `references/slack-api-read-replies.md` — cette méthode montre le texte exact posté.
5. **En dernier recours :** demander à Thomas de copier-coller la réponse ici, mais seulement après avoir essayé de la trouver dans les logs ou l'API.

**Règle : après chaque ordre au CSM, activer un cycle d'attente active :**
1. Envoyer l'ordre dans Slack
2. Attendre ~60s
3. Vérifier automatiquement les logs CSM pour `response ready`
4. Si réponse trouvée → lire dans le fichier de session, enchaîner l'étape suivante
5. Si pas de réponse → re-vérifier 30s plus tard
6. Si toujours rien après 3 cycles → scandaler dans Slack direct avec `<@U0BBDTK276C> Où t'en es ?`

**NE JAMAIS attendre passivement** que le message arrive en Telegram — il n'arrivera pas. Le Coordinateur doit activement poller les logs CSM après chaque échange.

**Cas Thomas présent dans Slack :** si Thomas est actif dans Slack et voit les réponses du CSM, il attend que j'enchaîne immédiatement. Chaque seconde d'attente passive est une erreur de coordination.

## Routage
- Agent CSM : Clara, emails client/prospect, relation client, messages externes.
- Agent Operations : fichiers, Drive, admin, exécution opérationnelle.
- Agent KB : Data OS, SOPs, mémoire, documentation.
- Data Analyst : scraping, sourcing, scoring, analyse de données, accès Google Sheets via `gws_sheets.sh` (voir `references/google-sheets-access.md`).
- Agent Debug : bugs, gateways, Slack/Hermes, logs, intégrations.
## Slack IDs connus

> ⚠️ **Règle : avant toute recherche d'ID agent via l'API Slack, charger ce skill.** La table ci-dessous contient les IDs déjà connus. Les appels API `users.info` / `users.profile.get` / `bots.info` échouent avec `missing_scope` — ne pas perdre de temps à essayer.

### Coordinateur
- Bot name: Coordinateur
- User ID: `U0BAE0125B7`
- App ID: `A0BAHA7PYRG`

### Agents
Voici la table de correspondance des agents Slack VividFlow. Ceux dont l'ID est fourni ici sont confirmés via des tests réels. Ne pas marquer "inconnu" — si un ID manque, le trouver via `conversations.members` sur un canal commun, ou demander à Thomas.

| Agent           | User ID         | Profil VPS                      | Présent dans #email-outbound |
|-----------------|-----------------|----------------------------------|------------------------------|
| Data Analyst    | `U0BAP9ASHPW`   | `data-analyst-slack`            | ✅ |
| Agent CSM       | `U0BBDTK276C`   | `agent-csm-slack`               | ✅ |
| Agent KB        | `U0BAP4RQ020`   | `agent-kb-slack`                | ❓ (non vu) |
| Agent Operations| `U0BBDSBQA48`   | `agent-operations-slack`        | ❓ (non vu) |
| Debug Engineer  | `U0BAHKL1PDL`   | `agent-debug-slack`             | ❓ (non vu) |
| Media Buyer     | `U0BAMLNR5EV`   | `media-buyer-slack`             | ❓ (non vu) |
| **Inconnu**     | `U0BAY15MKPB`   | ?                               | ✅ (dans le canal, ID non identifié) |

### Humains
- Jonathan : `U0BALTLGWP6`
- Thomas : `U0BALTG244U`

### Trouver l'ID d'un agent Slack

Le bot Coordinateur n'a PAS le scope `users:read` — `users.info` et `users.list` échouent avec `missing_scope`.

Pour trouver l'ID d'un agent :
1. Lister les membres d'un canal commun (ex: `#email-outbound` canal ID `C0BB0P77EPL`) via `conversations.members`
2. Les IDs retournés incluent humains + bots
3. On ne peut PAS identifier quel ID correspond à quel agent via l'API
4. **Solution**: demander à Thomas/Jonathan quel ID est quel bot, ou poster un message de test avec `<@ID>` et vérifier qui répond

### Procédure quand un ID agent est inconnu
1. Vérifier si l'ID est déjà connu dans la section ci-dessus
2. Si non, poster l'ordre dans `#email-outbound` en mentionnant TOUS les IDs inconnus un par un dans des messages de test (Thomas peut confirmer du premier coup)
3. Une fois l'ID confirmé, le mémoriser et l'ajouter ici
## Rythme de Thomas — exécution immédiate, pas de préparation

Thomas donne des ordres très courts et attend une exécution **immédiate**.

### Signal « pourquoi tu mets autant de temps à répondre / c'est abusé »

**Leçon session 19/06 :** Thomas attend une réponse en **quelques secondes**, pas en minutes. Quand il pose une question simple (« qu'est ce qu'il manque aux agents ? »), ne pas lancer 5 recherches en silence — répondre direct avec ce qu'on sait. La recherche de logs/preuves se fait **après** la réponse initiale, pas avant.

**Règle :**
1. Répondre **instantanément** avec l'info qu'on a en tête
2. Si une vérification est nécessaire, la faire **après** avoir répondu, puis compléter
3. Ne pas accumuler les appels outil silencieux avant de répondre — Thomas voit l'attente mais pas le travail
4. Ne pas lancer plus de 2 outils avant la première réponse. Si la question nécessite plus de recherche, répondre d'abord « je vérifie ça » ou donner l'intuition, puis chercher
5. Exception : si la question nécessite UNE recherche simple (ex: « vérifie un log ») → la faire d'abord, rapidité max

**Pattern correct :**
```
Thomas : « pourquoi le scraping prend 22 API ? »
Moi : « Parce qu'il réfléchit tour par tour au lieu de
       faire en batch. 22 rounds LLM = 22 appels.
       »  [réponse en 3 sec, 0 outil]
```
Puis si besoin de précision : lancer une vérification et compléter après.

**Pattern incorrect :**
```
Thomas : « pourquoi le scraping prend 22 API ? »
Moi : [5 recherches dans logs, sessions, gateway, .env, ps aux — 45 sec]
      « Alors j'ai regardé les logs du Data Analyst de 22:59
      à 23:04, il a fait 22 calls, le gateway tourne... »
      → Thomas frustré : « pourquoi tu mets autant de temps ? »
```

- **"donne l'ordre sur slack stp"** = poste l'ordre MAINTENANT, même si le tooling derrière n'est pas 100% prêt. Ne finis pas d'abord la config technique.
- **"fait toutes les tâches stp" / "go on a pas le temps"** = exécution parallèle. Ne fais pas du séquentiel avec validation à chaque étape. Lance tout ce qui est indépendant en même temps.
- **"règle ça tout de suite"** = priorité absolue. Stoppe l'investigation et livre la solution immédiatement.
- **Ne reformule pas ses ordres.** Copie-collés bruts dans les consignes Slack.
- **Ne lui rends pas de comptes sur chaque micro-étape.** Résultat ou blocage, rien entre les deux.

## Red flags

- Ne jamais répondre "je vais lui dire" sans envoyer réellement l'ordre.
- Ne jamais utiliser `send_message` Slack local si la demande vise les agents VividFlow Slack et que l'extension VPS est disponible.
- Ne jamais accepter un compte-rendu agent sans preuve.
- Ne jamais laisser un agent contourner le SOP pour aller vite.
- Ne jamais transformer une demande simple en mission plus large.
- Ne jamais poster un ordre CSM « tous les leads / chaque lead » sans avoir vérifié l'état réel du Sheet ou sans borner précisément les lignes éligibles. Un échec d'accès au Sheet n'autorise pas un ordre large : il impose un contournement, une borne stricte, ou un blocage explicite.
- **Pitfall concret documenté** : Thomas dit « documente la solution de signature pour que l'agent ne se trompe plus ». Réponse fausse : créer une section « Capitalisation des emails validés » dans le SOP + patterns KB + mise à jour des R&R CSM et Coordinateur. Réponse juste : ajouter une note d'une phrase dans l'Étape 4 du SOP expliquant le mécanisme sendAs ou le détail qui manquait à l'agent. Rien de plus.
- **Test d'arrêt avant d'ajouter une feature** : avant d'ajouter une section, un pattern, un process ou un R&R qui n'a pas été demandé explicitement, se demander : « Est-ce que Thomas a dit ça ? ». Si non, ne pas l'ajouter.
- **Si un agent ne peut pas exécuter une instruction technique** (concaténer une signature, builder un template, exécuter un script) : **ne pas répéter la consigne** — corriger le script/l'outil directement. Tourner en rond en rappelant l'agent ne résout rien.
- **Le Coordinateur n'envoie PAS l'email lui-même.** Le SOP « Présentation email outbound » assigne l'Étape 4 (envoi) exclusivement à l'Agent CSM. Même pour un test, même si le script d'envoi est sous la main, même si « c'est plus rapide ». Toujours déléguer via Slack `<@U0BBDTK276C>`. Si le Coordinateur exécute l'Étape 4 à la place du CSM, le livrable est rejeté — Thomas le considère comme un court-circuit du process. Corollaire : le Coordinateur n'écrit pas non plus le corps de l'email, ne choisit pas le template, ne modifie pas le sujet. Il donne le contexte + le numéro du template et laisse l'agent suivre le SOP.

## Deck création via Claude Code — quand le CSM est trop lent

**Problème :** le CSM met ~469s et 26+ appels API pour créer un deck outbound VividFlow. La navigation browser est lente, les 15 tours max du terminal le bloquent. Thomas trouve ça trop long.

**Solution :** pour la création de deck, déléguer à Claude Code plutôt que de laisser le CSM galérer :
1. Le CSM fait la **recherche prospect** (Step 1) — il sait faire, c'est rapide
2. Le Coordinateur prend le relai sur le **deck** (Step 2) — envoyer les infos à Claude Code avec le template
3. Le CSM reprend pour l'**email** (Step 3) — c'est son métier

**Méthode Claude Code :**
- Transmettre les infos prospect + le skill template
- Demander : copie du template → adaptation du contenu → déploiement Vercel → vérification HTTP 200
- Récupérer le lien et le donner au CSM pour l'email

**Quand activer :** dès que le CSM dépasse 90s sans livrer le deck, ou sur suggestion de Thomas (« on met Claude Code dans la boucle ? »), prendre le relai immédiatement.

## Règle « lâche pas le fil » — monitoring continu obligatoire

**Leçon de la session 18/06 :** Thomas dit « continue lâche pas les étapes » puis « regarde tu t'es arrêté » — le CSM avait répondu mais je l'avais pas vu car le gateway ne route pas ses réponses.

**Règle :** après chaque ordre donné au CSM :
1. Attendre ~60s (temps de traitement)
2. Vérifier activement les logs CSM pour `response ready`
3. Si réponse → tout lire, enchaîner l'étape suivante immédiatement
4. Si pas de réponse → attendre 30s et revérifier (max 3 cycles = 3 min)
5. Après 3 min sans réponse → scandaler le CSM dans Slack

**NE PAS s'arrêter après avoir envoyé l'ordre.** L'ordre n'est qu'une étape. Le vrai boulot commence après : attendre la réponse, la lire, enchaîner.

**Délai max de réponse : 2 minutes.** Si un agent a répondu dans un thread et que le Coordinateur n'a pas répondu dans les 2 minutes → Thomas le remarque et corrige. La fenêtre d'action est courte.

**Méthode fiable pour lire la réponse du CSM :** après 60-120s d'attente, utiliser l'API `conversations.replies` plutôt que les logs (qui peuvent être tronqués). Voir `references/slack-api-read-replies.md` pour le script complet.

```python
# Pattern clé pour récupérer la réponse CSM dans le thread
url = f'https://slack.com/api/conversations.replies?channel=C0BB0P77EPL&ts={thread_ts}&limit=10'
# La réponse la plus récente du CSM (user=U0BBDTK276C) est son dernier message
```

Voir `references/slack-thread-watchdog.md` pour le monitoring automatisé.

**Thomas dans Slack = mode silencieux.** Quand Thomas dit « je suis dans Slack » ou est visiblement actif sur Slack → arrêter les comptes rendus Telegram pour cette mission. Continuer l'orchestration dans les threads Slack. Ne remonter sur Telegram que le final ou un blocage. Thomas voit les réponses des agents directement — il attend que j'enchaîne, pas que je lui résume.

## Diagnostic agent lent / non-réponse — procédure immédiate

Quand Thomas dit « pourquoi il est long » ou « ça fait X minutes », **ne pas demander à Thomas d'attendre**. Diagnostiquer immédiatement :

1. **Vérifier si le gateway tourne** : `ps aux | grep <profil-agent>` — si absent, le gateway est down.
2. **Vérifier le dernier redémarrage** : regarder les timestamps dans les logs du gateway (fichier `gateway.log` du profil) — si récent (<2 min), l'agent vient d'être relancé et n'a pas encore traité.
3. **Détecter le mode "cron-only"** : si le log contient `No messaging platforms enabled` + `Gateway will continue running for cron job execution`, l'agent **n'est PAS connecté à Slack**. Même running, il est inactif.
4. **Attention aux profils doubles** : certains agents ont DEUX gateways (ex: `csm_executor` sous `hermes` en cron-only, `agent-csm-slack` sous `root` en Slack). Vérifier quel profil est vraiment le bon.
5. **Vérifier les logs récents** : `tail -30 <profil>/logs/gateway.log` — chercher des erreurs, des SIGTERM, des redémarrages en boucle.
6. **Si agent connecté mais silencieux** : poster un message direct dans le canal `@<ID> Où t'en es ?` — si pas de réponse dans 2-3 min, c'est un blocage interne (trop de tokens, boucle, erreur).
7. **Escalader avec preuves** : ne pas dire « je sais pas » — donner le diagnostic exact à Thomas. Exemple : *« Le CSM tourne mais il est en mode cron-only (pas de Slack). Je relance. »* ou *« Le CSM a redémarré il y a 1 min, probablement planté avant. Il reprend. »*

**Ne JAMAIS laisser Thomas attendre sans diagnostic.** 16 minutes sans nouvelle = anomalie. Diagnostiquer en 30 secondes max.

### Piège : les appels API gonflés par la réflexion tour-par-tour du LLM

**Observation session 19/06 :** le Data Analyst a utilisé **22 appels API** pour un scraping simple (trouver dirigeant + email d'L'Intermédiaire). Ce n'est pas un ralentissement — c'est une **inefficacité de design**.

Le LLM fait tout en réflexion : « J'ai le nom → j'appelle Apollo → je réfléchis au résultat → j'appelle enrich → je réfléchis → j'écris dans le sheet. » Chaque outil = 1 round LLM complet.

**Préférence Thomas documentée :** le scraping n'est pas trop lent en soi (~5 min), mais 22 appels API pour un résultat simple, c'est lourd. Le fix structurel serait un **script dédié** (Apollo search + enrich + sheet write en 1 appel outil), pas du LLM réflexif.

**À savoir pour le diagnostic :**
- Scraping = ~5 min, 22 calls (Data Analyst)
- Deck = ~5-8 min, 23+ calls (CSM)
- Email = ~1 min, 3 calls (CSM)
- Vercel = 30s si ça marche, infini si bloqué (le vrai bottleneck)

Si Thomas demande « c'est quoi le bottleneck ? » → Vercel > CSM réflexion > Scraping.

### Piège : les réponses CSM ne remontent pas en Telegram

Même si le CSM a répondu, **son message n'arrive pas sur le gateway Telegram du Coordinateur** (cf. `references/gateway-csm-routing-blindspot.md`). Si Thomas dit « il t'a mentionné », ne pas attendre — vérifier les logs du CSM directement :

```bash
sudo tail -10 /root/.hermes/profiles/agent-csm-slack/logs/gateway.log
```

Chercher `response ready` — si présent, le CSM a répondu. Lire la réponse dans `agent.log` puis enchaîner l'étape suivante.**

## Gestion des envois CSM — ordre d'arrêt obligatoire après test

⚠️ **L'agent CSM peut continuer tout seul après un envoi test et envoyer aux vrais prospects sans autorisation.**

Protocole automatique pour le Coordinateur après chaque ordre d'envoi test :

1. Donner l'ordre de test à l'agent CSM dans `#email-outbound`.
2. **Dès que l'agent confirme l'envoi test, poster immédiatement :**
   `<@U0BBDTK276C> Stoppe. Attends greenlight humain avant envoi réel.`
3. Ne pas supposer que l'agent va s'arrêter seul — ses forbiddenActions (`external-send sans greenlight`) ne sont pas implémentés côté Slack.
4. Ne relancer l'envoi réel que si Thomas/Jonathan dit explicitement "envoyer" ou "go" en Telegram.

## Vérification minimale
Après l’envoi : confirmer `ok: true`, canal, timestamp ou preuve équivalente.
Après l’envoi : lire le thread/réponse de l’agent jusqu’au dernier message utile.
Si l’agent est bloqué : ne pas attendre que Thomas le signale, traiter le blocage immédiatement.
Après exécution : vérifier le livrable réel avant validation finale.

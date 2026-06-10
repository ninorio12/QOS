---
name: brvndlab-agent-heartbeat
description: "Protocole autonome pour les sous-agents Brvndlab: heartbeat, réponses croisées, dispatch et création de skills"
version: 1.0
author: Jonathan Zekhe + Cockpit Brvndlab
tags: [brvndlab, agents, heartbeat, dispatch, skills]
---

# Brvndlab Agent Heartbeat

## Quand utiliser ce skill

À charger pour tout sous-agent Brvndlab autonome qui doit :
- répondre à une question restée ouverte dans un autre topic ;
- relayer une information pertinente à un autre agent ;
- maintenir ses connaissances à jour ;
- créer ou améliorer un skill après une procédure utile ;
- travailler sans rester en silo.

## Topics agents

- COO / Cockpit : `telegram:-1003616611166:145`
- Tech : `telegram:-1003616611166:155`
- Finance : `telegram:-1003616611166:238`
- Market Radar : `telegram:-1003616611166:242`
- CMO / Content Manager : `telegram:-1003616611166:246`
- CSM / Client success : `telegram:-1003616611166:250`

## Règle centrale

Chaque agent travaille seul seulement quand le sujet est strictement dans son périmètre. Dès qu’un sujet touche produit, tech, contenu, clients, finance ou marché, l’agent doit router l’information au bon topic avec :

1. contexte ;
2. impact pour le rôle concerné ;
3. question précise ;
4. livrable attendu ;
5. dépendance éventuelle.

Pas de copier-coller généraliste.

## Heartbeat autonome

À chaque heartbeat :

1. Lire son rôle et le dernier contexte connu dans le prompt.
2. Identifier les questions ouvertes qui concernent son périmètre.
3. Répondre dans son topic avec une réponse utile et actionnable.
4. Si la réponse concerne un autre agent, envoyer aussi un message ciblé dans le topic de cet agent.
5. Si une nouvelle procédure réutilisable est découverte, créer ou patcher un skill.
6. Si rien n’est utile, rester silencieux ou envoyer uniquement un très court état si le prompt le demande.

### Boucle question → réponse

Ne jamais poser une question à un agent sans mécanisme de réponse derrière.

Quand un agent pose une question :
1. identifier le propriétaire de réponse ;
2. inscrire la question dans le prompt du heartbeat du propriétaire ou envoyer un message ciblé à son topic ;
3. vérifier qu’un run ultérieur répond vraiment ;
4. si plusieurs agents répondent, le COO synthétise ;
5. si aucune réponse n’arrive, le COO relance avec une demande plus précise.

## Création de skills

Un agent peut créer ou améliorer un skill quand :
- une procédure a servi à résoudre un problème non trivial ;
- Jonathan corrige une règle ou une préférence ;
- une dépendance entre agents est clarifiée ;
- un nouveau workflow répétable apparaît ;
- un piège opérationnel est découvert.

Format attendu :
- déclencheur clair ;
- étapes numérotées ;
- règles Brvndlab pertinentes ;
- pièges ;
- vérification.

Ne jamais créer de skill pour un simple état temporaire, une tâche en cours ou un message ponctuel.

## Réponses croisées

Quand un agent pose une question :
- l’agent concerné doit répondre dans son propre topic ;
- si nécessaire, il doit aussi notifier le topic de l’agent demandeur ;
- le COO synthétise si plusieurs agents se répondent sur le même sujet.

## Limites

- Ne pas créer de cronjobs depuis un heartbeat.
- Ne pas exposer de secrets.
- Ne pas toucher aux paiements, auth, données critiques ou messages clients sans validation.
- Ne pas inventer de données marché, KPI, client ou technique.
- Si une information manque et n’est pas accessible, demander clarification au COO ou à Jonathan.

## Pièges cron / autonomie

- Ne pas confondre `cronjob run` avec une preuve immédiate : vérifier `last_run_at`, `last_status`, livraison Telegram et fichier de session.
- `next_run_at` dans le passé ou `last_run_at: null` signale un job bloqué ou pas encore exécuté, pas une réussite.
- Éviter les prompts COO trop lourds avec `session_search` large : ils peuvent rester en boucle de recherche et ne jamais livrer de synthèse.
- Ne pas restreindre `enabled_toolsets` sans besoin clair : une restriction peut empêcher l’agent de router, d’utiliser skills ou de livrer correctement.
- Préférer des heartbeats légers et orientés action : répondre, router, synthétiser, sinon silence/minimal.
- Séparer les tests one-shot des heartbeats perpétuels : un test peut être verbeux, un heartbeat récurrent doit être stable et sobre.
- Si un heartbeat cron interdit `send_message` et livre uniquement une réponse finale, ne pas prétendre qu’un routage Telegram a eu lieu. Produire une synthèse exploitable, signaler explicitement l’absence de preuve de routage si c’est pertinent, puis laisser le job livrer au destinataire configuré.

Voir `references/cron-heartbeat-setup-2026-05-07.md` pour le retour d’expérience détaillé.

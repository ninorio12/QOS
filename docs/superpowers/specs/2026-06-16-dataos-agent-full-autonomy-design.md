# Design — Autonomie totale des agents Hermes sur le Data OS

- **Date** : 2026-06-16
- **Auteur** : Thomas (VividFlow) + Claude
- **Statut** : design validé, à implémenter
- **Cible** : `/root/QOS` (Data OS — Next.js + Convex `standing-malamute-439` + Clerk)

## 1. Objectif

Les agents Hermes doivent pouvoir faire **tout ce qu'un humain fait dans l'interface du Data OS**, en autonomie, **sans aucune autorisation**. Frontière : les agents **opèrent** le business dans le Data OS ; ils **ne codent pas** — tout besoin de code/infra remonte à Claude.

Critère de succès : pour chaque module de l'UI (hors admin), il existe un (des) outil(s) MCP couvrant les mêmes opérations, et un agent peut les exécuter sans passer par `{status:'pending'}`. Chaque action reste tracée dans `os_activities`.

## 2. État actuel (vérifié 2026-06-16)

- Serveur MCP : `src/app/api/mcp/route.ts` (JSON-RPC, **56 outils**), backé par Convex.
- Auth : Bearer `dos_…` → hash → `agentGuard.resolveAgent` → scopes effectifs = intersection `credential.scopes ∩ os_agent_permissions`. deny-by-default.
- Moteur de permissions pur : `convex/lib/permissions.ts` (`POLICY`, `FULL_GRANTS`, `ROLE_TEMPLATES`, `SLUG_TO_ROLE`, `APPROVAL_VERBS`).
- 7 agents (coo, agent-kb, agent-support-client, agent-operations, agent-analyse, agent-media-buyer, agent-debug) : 49 perms + 1 token actif chacun. **Auth/MCP sain.**
- Verbes sensibles `archive/convert/value/send` → approbation humaine (`APPROVAL_VERBS`).
- **Constat clé** : sur 60 dernières activités, 1 action business vs 59 méta/ops/log. Les agents se maintiennent eux-mêmes au lieu d'opérer. Un envoi email a été bloqué (effecteur absent). Voir mémoire `dataos-agent-autonomy-diagnosis`.

## 3. Le trou de parité UI ↔ MCP

| Module UI | Couverture MCP actuelle | Action design |
|---|---|---|
| pipeline, contacts, prospection, performance, tâches (taches), logs, knowledge | ✅ complet | rien |
| **closing** | ❌ aucun | ajouter outils (mutations `closing.ts`, `confirmationIntake.ts`) |
| **media-buyer** | ❌ aucun | ajouter outils (`mediaBuyer.ts`) |
| **onboarding** | ❌ aucun | ajouter outils (`onboarding.ts` : intakeSubmit, saveProgress) |
| **paiement / budget / devis** | ❌ lecture seule | ajouter outils (`paiement.record`, `devis.createDevis/updateDevis/deleteDevis`) |
| **calendrier** (RDV) | ❌ aucun | ajouter outils (RDV / sales calls date) |
| **bibliothèque/process** | ⚠️ lecture seule | ajouter `processes_create/update`, dossiers/sous-dossiers |
| **bibliothèque/data + records** | ❌ aucun | ajouter outils (`library.ts`, `recordNotes.ts`, `osKbDocs.ts`) |
| équipe, intégrations, paramètres | ⚪ admin humain | **garder hors MCP** (admin / dev → Claude) |

Les mutations Convex existent déjà → le travail est surtout d'écrire des **wrappers MCP fins** + entrées `POLICY` + scopes `FULL_GRANTS`.

## 4. Design

### Bloc 1 — Parité MCP totale

Pour chaque module manquant, ajouter dans `route.ts` les entrées `TOOLS[]` (wrapper `run` → mutation/query Convex existante, `log` → activité), et dans `convex/lib/permissions.ts` l'entrée `POLICY[tool] = { module, verb }`. Familles d'outils à ajouter :

- **closing** : `closing_list`, `closing_get`, `closing_update` (+ intake confirmation).
- **media_buyer** : `media_buyer_list`, `media_buyer_upsert_metrics`, `media_buyer_set_verdict` (scale|watch|kill).
- **onboarding** : `onboarding_list`, `onboarding_get`, `onboarding_submit`, `onboarding_save_progress`.
- **paiement / devis** : `payments_list`, `payment_record`, `devis_list`, `devis_create`, `devis_update`, `devis_delete`.
- **calendrier** : `calendar_list`, `calendar_create_rdv`, `calendar_update_rdv`.
- **bibliotheque** : `processes_create`, `processes_update`, `library_folders_*`, `records_list`, `record_add_note/file/link`, `kb_docs_*`.

Nouveaux modules de scope : `closing`, `media_buyer`, `onboarding`, `payments`, `devis`, `calendar`, `library`, `records`, `kb_docs`. `FULL_GRANTS` les inclut automatiquement (dérivé de `POLICY` + `EXTRA_SCOPES`).

### Bloc 2 — Zéro autorisation

- `APPROVAL_VERBS` → vidé (ou réduit à ∅) : `archive/convert/value/send` s'exécutent directement.
- `os_agent_permissions` re-seedé avec `requiresApproval=false` partout (la dérivation `scopesFromGrants` suit `APPROVAL_VERBS`, donc un seul endroit de vérité).
- **Audit conservé** : `logToolUse` continue d'écrire chaque mutation dans `os_activities` (actorType=agent). Rien n'est perdu en traçabilité ; seule la barrière `pending` disparaît.
- Conséquence : plus aucun appel ne renvoie `{status:'pending'}` ; le flux `createPendingApproval`/`reviewApproval` devient dormant (gardé pour usage futur éventuel).

### Bloc 3 — Frontière dev/code → Claude

- Les modules **équipe / intégrations / paramètres** (admin) restent **hors MCP** : pas d'outils agents.
- Règle de comportement (à injecter dans les prompts/profils agents) : *« Tu opères le business dans le Data OS. Tu n'écris pas de code, tu ne répares pas l'infra/les gateways. Tout besoin de code, fix technique, ou effecteur manquant (ex : envoi email) → escalade à Claude/Thomas, ne le bricole pas. »*
- Cela règle le runtime auto-consommateur (59:1 méta/business) en redirigeant le travail technique hors des agents.

### Hors périmètre (chantier séparé, via Claude)

- **Effecteurs externes** (envoi email réel himalaya/Gmail Workspace, outreach sortant réel) : traités par Claude, pas dans ce spec.
- **Boucle proactive** (consommer `dataos_state.nextRecommendedActions` automatiquement) : phase ultérieure, une fois la parité acquise.

## 5. Plan de déploiement (haut niveau)

1. Ajouter outils MCP (`route.ts`) + `POLICY` (`permissions.ts`) pour les modules manquants.
2. Vider `APPROVAL_VERBS` ; ajuster tests `permissions.test.ts` / `enforcement.test.ts` / `agentGuard.test.ts`.
3. `npx convex deploy` sur `standing-malamute-439` (clé : mémoire `qos-convex-deploy`).
4. Re-seed : `seedAgentPermissions` (rows à jour, requiresApproval=false) pour les 7 agents.
5. Injecter la règle dev/code dans les profils agents.
6. Vérifier : `getPermissionMatrix` (approvalScopes=0), test end-to-end d'un outil par nouveau module, `os_activities` trace bien l'action.

## 6. Tests / vérification

- `npm test` + `npm run typecheck` (Data OS) verts.
- Pour chaque nouveau module : 1 appel MCP réel (token agent) → mutation effectuée + activité loggée + aucun `pending`.
- `agentPermissions:getPermissionMatrix` : chaque agent a les nouveaux scopes, `requiresApproval=false` partout.

## 7. Risques

- **Zéro autorisation sur actions irréversibles** (archive/suppression devis, conversion, montants) : accepté par Thomas (liberté totale) ; mitigé par l'audit append-only `os_activities` et la non-destruction (archive ≠ delete sur les sources de vérité).
- **`additionalProperties: true`** sur les schémas d'outils : garder la validation des champs requis pour éviter les mutations malformées.
- **Re-seed** : ne pas révoquer les tokens actifs (voir piège mémoire `qos-slack-agents-wiring`).

# Data OS — Architecture de permissions / scopes par agent

Source de vérité opérationnelle pour l'équipe d'agents Hermes/Slack. Réutilise les
tables Convex existantes (`os_agents`, `os_agent_credentials`, `os_agent_permissions`,
`os_agent_events`, `os_agent_approvals`, `os_agent_runs`, `os_activities`).

## 0. Principes

1. **Least privilege par défaut** : tout outil non explicitement autorisé = refusé (deny-by-default).
2. **Soft-delete only** : les agents n'ont jamais de hard delete → `archive` (status=`archived`). Le hard delete n'existe que via console Convex (humain).
3. **Identité = token** : `actorId` dérive du token hashé, jamais d'un champ du payload. Un agent ne peut pas se faire passer pour un autre.
4. **Pas de secret dans le code** : tokens injectés via env (systemd EnvironmentFile par `runtimeService` Hermes, ou headers `${VAR}` dans `~/.hermes/config.yaml`). Tout token capturé/collé = exposé → révoqué + réémis.
5. **Audit obligatoire** : chaque appel logge `os_agent_events` ; chaque write/execute/approve/admin logge aussi `os_activities` (append-only).
6. **Approval sur action sensible** : sensible/destructive → ne s'exécute pas, crée une demande `os_agent_approvals` (pending), validée par humain ou COO selon le cas.
7. **COO orchestre mais n'est pas root** : même le COO ne fait aucune action destructrice/identité sans approval humain + trace.

## 1. Taxonomie des scopes

Format `module:action`. Niveaux ordonnés : `read < write < execute < approve < admin`.

| Action | Sémantique |
|---|---|
| `read` | lecture |
| `write` | create / update (soft) |
| `execute` | action machine-à-état (déplacer pipeline, quick-action prospection, accept handoff) |
| `approve` | valider une demande / passer un candidat en actif |
| `admin` | gérer agents / tokens / permissions |

`⚠` = autorisé **mais requiresApproval** (effet différé jusqu'à validation).

### Liste exacte des scopes
```
contacts:read  contacts:write  contacts:archive⚠
pipeline:read  pipeline:write  pipeline:move
clients:read   clients:write   clients:convert⚠  clients:value⚠  clients:archive⚠
sales_calls:read  sales_calls:write
outreach:read  outreach:write  outreach:send⚠
tasks:read     tasks:write     tasks:assign
activities:read  activities:write          # write = append au log uniquement
agents:read    agents:admin⚠
knowledge:read knowledge:write knowledge:approve⚠
objections:read objections:write
processes:read processes:write processes:publish⚠
prospection:read prospection:write prospection:action
performance:read performance:write⚠       # write = objectifs/cibles
approvals:read approvals:review
runtime:heartbeat runtime:read
handoff:read  handoff:create  handoff:accept  handoff:route
memory:read   memory:write    memory:approve⚠
```

## 2. Matrice de permissions par agent

`R`=read `W`=write `X`=execute `A`=approve `Adm`=admin · `⚠`=requiresApproval · `—`=aucun
Humain (Thomas/Jonathan via dashboard) = au-dessus de tout, seul à pouvoir hard-delete.

| Module | COO `coo` | KB `agent-kb` | CSM `agent-support-client` | Ops `agent-operations` | Analyst `agent-analyse` |
|---|---|---|---|---|---|
| contacts | R W ·archive⚠ | R | R W | R | R |
| pipeline/leads | R W X | R | R | R | R |
| clients | R W ·convert⚠ ·value⚠ ·archive⚠ | R | R W ·convert⚠ ·value⚠ | R | R |
| sales_calls | R | R | R W | R | R |
| outreach | R | R | R W ·send⚠ | R W ·send⚠ | R |
| tasks | R W X(assign) | R W | R W | R W X(assign) | R |
| activities/audit | R W | R W | R W | R W | R W |
| agents | R ·Adm⚠ | R | R | R | R |
| knowledge | R W ·approve⚠ | R W | R W | R W | R W(candidate) |
| objections | R W | R W | R W | R | R |
| processes/SOPs | R ·publish⚠ | R W(propose) | R | R W(propose) | R |
| prospection | R W X | — | R | R | R |
| performance | R W⚠(objectifs) | R | R | R | R |
| approvals | R A(review) | R(own) | R(own) | R(own) | R(own) |
| runtime/heartbeat | R W(own) | W(own) | W(own) | W(own) | W(own) |
| handoffs | R W X(route) | R W(create) | R W(create+accept) | R W(accept) | R |
| memory candidates | R W ·approve⚠ | R W | R W | R W | R W |

Lecture en clair : **COO** = vue + orchestration partout, approve les candidats opérationnels, mais destructif/identité = ⚠ humain. **KB** = mémoire/contenu/process (propose, ne publie pas). **CSM** = comptes clients + handoff. **Ops** = exécution tâches + process + delivery. **Analyst** = read-only quasi total + propose des insights (knowledge/memory candidate, log activités).

## 3. Modules sensibles à protéger

- **contacts / clients** — source de vérité business. Archive et conversion = ⚠.
- **agents** — identités machine + tokens. `agents:admin` = ⚠ humain (création/désactivation/rotation/permissions).
- **clients:value / clients:convert / performance:write** — impact argent & objectifs = ⚠.
- **knowledge:approve / processes:publish / memory:approve** — passent un candidat en source de vérité = ⚠.
- **approvals** — seul COO (review) + humain ; un executor ne voit que ses propres demandes.
- **activities/audit** — append-only, jamais d'update/delete par personne.

## 4. Actions qui passent obligatoirement par approval

| Action | Qui approuve |
|---|---|
| Archive contact/client (soft-delete) | Humain |
| `clients:convert`, `clients:value` (argent) | Humain |
| `knowledge:approve` kind `rule`/`decision` | Humain |
| `knowledge:approve` autres, `memory:approve` | COO (ou humain) |
| `processes:publish` (SOP officielle) | Humain |
| `agents:admin` (token, statut, permissions) | Humain |
| `performance:write` (cibles) | COO (ou humain) |
| `outreach:send` en masse (> seuil) | COO |
| Toute action destructive du **COO** lui-même | Humain |

Mécanique : l'outil sensible n'exécute pas → insère `os_agent_approvals{status:pending}` + log. Un humain/COO valide via dashboard → une action serveur exécute le `payload` mémorisé et passe le statut à `executed`.

## 5. Règles d'audit log (obligatoires)

- **Tout `tools/call`** → `os_agent_events` (`agentId`, `eventType`=nom outil, `source:'mcp'`, `riskLevel`, `payload` résumé).
- **Tout write/execute/approve/admin** → en plus `os_activities` (`actorType:'agent'`, `actorId:'agent:<slug>'`, `eventType:'<module>.<action>'`, `entityType`/`entityId`, `summary`).
- **Approvals** : `requested` / `approved` / `rejected` / `executed` tous logués.
- **Heartbeat / read** → `os_agent_events` seulement (pas de bruit dans activities).
- **Échec** → `os_agent_events` riskLevel `medium`+ + patch `agent.lastError/lastErrorAt`.
- **riskLevel** : read=`low`, write=`low`, execute=`medium`, approve/admin/destructif=`high`.
- Append-only strict : aucune route n'édite/supprime `os_activities` ni `os_agent_events`.

## 6. Handoffs entre agents

Nouvelle table `os_handoffs` (transfert de responsabilité, pas de bypass de scope).
```ts
os_handoffs: defineTable({
  workspaceId: v.string(),
  fromAgentId: v.id("os_agents"),
  toAgentSlug: v.string(),          // ou toLane
  entityType:  v.string(),          // contact | client | lead | task | prospection
  entityId:    v.string(),
  reason:      v.string(),
  context:     v.optional(v.any()),
  priority:    v.optional(v.string()),
  status:      v.string(),          // pending | accepted | rejected | completed
  slaDueAt:    v.optional(v.string()),
  createdBy:   v.string(),
  createdAt:   v.string(),
  acceptedBy:  v.optional(v.string()),
  acceptedAt:  v.optional(v.string()),
  completedAt: v.optional(v.string()),
  note:        v.optional(v.string()),
}).index("by_to", ["toAgentSlug", "status"]).index("by_entity", ["entityType", "entityId"])
```
Règles :
- Un handoff **ne donne pas** de droits : l'agent receveur doit déjà avoir le scope sur l'entité pour agir.
- Routes typiques : CSM → Ops (delivery), Ops → CSM (com client), tout → COO (arbitrage). COO seul a `handoff:route` (réassigner).
- `accept` met à jour l'`assignee` de l'entité (ex: tâche). Tout événement handoff → `os_activities`.
- Si l'action visée par le handoff est sensible, elle déclenche quand même l'approval.

## 7. Stratégie de tokens (M2M)

- **Format** : opaque aléatoire ≥ 32 octets, préfixe `dos_<slug>_…`. Affiché **une seule fois** à la création. Stocké uniquement en `sha256` → `os_agent_credentials.tokenHash`.
- **Création** : mutation admin `issueAgentToken(agentId, label, expiresAt)` → scopes = snapshot des `os_agent_permissions` de l'agent (jamais plus). Renvoie le plaintext une fois.
- **Rotation** : émettre une nouvelle credential, `revokedAt` sur l'ancienne après grâce courte. Par défaut 90 j ; **COO = 30 j** (plus privilégié = plus court). Token exposé (capture/collage) → révocation immédiate + réémission.
- **Désactivation** : `agent.status='disabled'` → seul `runtime:heartbeat` passe (déjà géré dans `authAgent`). Ou `revokedAt` sur toutes les credentials.
- **Expiration** : `expiresAt` vérifié dans `authAgent` (déjà en place).
- **Usage** : header `Authorization: Bearer dos_…` sur MCP et `/api/agent/*`. Jamais dans le repo ; injecté par Hermes (EnvironmentFile systemd par `runtimeService`, ou `headers.Authorization: "Bearer ${DATAOS_TOKEN_COO}"` dans config.yaml).
- **Least privilege** : un nouvel outil sans mapping = refusé. Le token ne porte que les scopes des permission rows.

## 8. Modèle de données Convex

**Réutilisé tel quel** : `os_agents`, `os_agent_credentials`, `os_agent_permissions`, `os_agent_events`, `os_agent_approvals`, `os_agent_runs`, `os_activities`.

**Ajouts minimaux** :
1. `os_handoffs` (§6).
2. `os_permission_templates` — presets de rôle, rend la matrice lisible/re-seedable depuis le dashboard :
```ts
os_permission_templates: defineTable({
  role:    v.string(),          // coo | kb | csm | ops | analyst
  scope:   v.string(),          // module
  level:   v.string(),          // read|write|execute|approve|admin
  requiresApproval: v.boolean(),
  resource: v.optional(v.string()),
}).index("by_role", ["role"])
```
3. Étendre l'enum `os_agent_permissions.level` à `read|write|execute|approve|admin` (compat `admin_limited`).

Seed : `seedAgentPermissions()` applique chaque template au `os_agents` correspondant (par slug) → `os_agent_permissions`, puis `issueAgentToken` par agent.

## 9. Application des permissions (enforcement)

### Couche centrale (Convex) — `enforce()`
Un helper unique partagé MCP + routes :
```
enforce(ctx, tokenHash, module, action) →
  1. authAgent(tokenHash)               // token valide, non révoqué/expiré, agent actif
  2. perm = permissions(agent).find(module)
  3. si !perm || level(perm) < level(action) → throw FORBIDDEN (log event high)
  4. si perm.requiresApproval || action destructive → return { mode:'approval' }  (pas d'exécution)
  5. sinon return { mode:'execute', agent }
```

### MCP (`src/app/api/mcp/route.ts`)
- Remplacer le secret partagé `authorized()` par `resolveAgent(req)` : hash du Bearer → `agentApi.authenticate`. Pas de token → `tools/call` refusé (`-32001`). `tools/list` reste ouvert.
- Tagger chaque outil dans une **POLICY map** `{ tool → {module, action, destructive?} }` (~56 entrées, une fois).
- Dispatch `tools/call` : `enforce()` → si `forbidden` `-32003` ; si `approval` → insère `os_agent_approvals` pending et renvoie `{status:'pending', approvalId}` (pas de mutation) ; sinon exécute, log event + activity avec `actorId='agent:'+slug` (supprime le `AGENT` hardcodé).

### Routes Next.js (`/api/agent/*`, `/api/hermes/*`)
- `/api/agent/*` utilisent déjà `tokenHashFromRequest` + `agentApi.authAgent(requiredScope)` → étendre `authAgent` pour appeler `enforce()` (module/action + approval).
- `guardHermes` (secret partagé) conservé uniquement comme **break-glass** console humaine/COO, pas pour les agents.
- `HERMES_API_SECRET` défini en prod ⇒ ferme l'accès non authentifié actuel (Auth: none).

## 10. Tests à écrire

**Unitaires `enforce()` (Convex)**
- token absent/altéré → Unauthorized ; révoqué → Unauthorized ; expiré → Unauthorized.
- agent `disabled` → seul `runtime:heartbeat` passe.
- niveau insuffisant (analyst `contacts:write`) → Forbidden.
- `requiresApproval` (CSM `clients:value`) → renvoie `approval`, **aucune** mutation.
- destructif (`contacts:archive`) → `approval`, l'enregistrement existe toujours.

**Isolation par agent**
- token A ne peut pas agir en tant que B : `actorId` vient du token, pas du payload.
- KB `knowledge:approve` → Forbidden/approval (ne valide pas ses propres candidats).
- Ops `performance:write` → Forbidden ; Analyst `pipeline:write` → Forbidden.
- COO action destructive → `approval` (jamais `executed` direct).

**Soft-delete**
- tout outil "delete" mappe sur archive → après appel, record présent `status='archived'`.

**Audit**
- après chaque write → 1 ligne `os_agent_events` **et** 1 ligne `os_activities`.
- heartbeat → event seulement, pas d'activity.
- échec d'outil → event riskLevel `medium`+ + `agent.lastError` patché.

**Tokens / lifecycle**
- rotation : ancienne credential `revokedAt` → 401 ; nouvelle → 200.
- scopes du token = exactement les permission rows (pas de scope fantôme).

**Handoff**
- receveur sans scope sur l'entité → ne peut pas agir même après `accept`.
- handoff vers action sensible → déclenche l'approval.

**Intégration MCP (HTTP)**
- `tools/call contacts_create` avec token Analyst → `-32003` ; avec token CSM → ok + activity logée.
- `tools/list` sans token → ok ; `tools/call` sans token → `-32001`.

## 11. Ordre d'implémentation (rapide)

1. `enforce()` + POLICY map + `seedAgentPermissions` + `issueAgentToken`.
2. Brancher le MCP sur `resolveAgent`/`enforce` (retire le secret hardcodé).
3. Seed des 5 agents (templates) + émission tokens (affichés une fois, injectés dans Hermes).
4. Table `os_handoffs` + outils handoff.
5. Tests (§10).
6. Section dashboard "Permissions" (lecture de la matrice via `os_permission_templates` + `os_agent_permissions`).
7. Set `HERMES_API_SECRET` en prod → ferme l'accès anonyme.

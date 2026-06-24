---
name: vividflow-data-os-ops
description: Operations sur le Data OS VividFlow (Convex) — lire, creer, mettre a jour des processes/SOPs, contacts, et modules depuis les outils MCP.
version: 1.0.0
author: VividFlow
license: private
metadata:
  hermes:
    tags: [vividflow, data-os, convex, process, sop, mcp]
    related_skills: [context-loader-core, prospection-outbound]
---

# VividFlow Data OS Operations

## R&R fiches — Playbook agents

Créer une fiche R&R (Rôles & Responsabilités) pour chaque agent dans le sous-dossier **playbook** de la catégorie Process/Processus internes.

### Structure standard

```
Processus internes / Playbooks / R&R — Agent <Rôle>
```

### Contenu type (bloc HTML)

```json
{
  "text": "<h2>Mission</h2>
<p>Définition concise de la mission de l'agent.</p>
<h2>Responsabilités</h2>
<ul><li>Responsabilité 1</li><li>Responsabilité 2</li></ul>
<h2>Ce qu'il fait et ne fait pas</h2>
<p>Périmètre clair.</p>
<h2>Autonomie</h2>
<p>Ce qu'il peut décider sans validation, ce qui nécessite un humain.</p>
<h2>Sources</h2>
<p>SOPs, Data OS, outils, accès dont il dispose.</p>
<h2>Interactions</h2>
<p>Avec quels autres agents/humains il collabore.</p>
<h2>⏱️ Règle de temps</h2>
<p>Temps max par tâche, protocole si dépassement.</p>",
  "type": "doc"
}
```

### Workflow

1. `mcp_data_os_modules_list()` — repérer le module Process.
2. `mcp_data_os_categories_list(moduleId="process")` — trouver les catégories existantes.
3. `mcp_data_os_processes_list(categoryId=<id_playbook>)` — vérifier les doublons.
4. `mcp_data_os_processes_create(title="R&R — Agent X", categoryId=...)` — créer la fiche, récupérer son ID.
5. `mcp_data_os_processes_update(id=..., blocks=[{"type": "doc", "text": "..."}])` — remplir le contenu.
6. `mcp_data_os_activities_log(entityId=..., action="updated", details="...")` — logger.

### Block type — PITFALL CRITIQUE

Quand tu mets à jour le bloc d'un Process/SOP :

```json
{
  "text": "<h2>Objectif</h2>\n<p>...</p>",
  "type": "doc"    // ✅ OBLIGATOIRE — render correct dans le Data OS UI
}
```

**Ne JAMAIS utiliser `type: "html"`** — le renderer Data OS n'affiche pas le contenu, les balises HTML brutes s'affichent en texte ou le bloc devient invisible.

Autres SOPs utilisent `type: "doc"` pour leur contenu HTML. `type: "doc"` est le format attendu par le Data OS pour tout contenu HTML.

### Modification chirurgicale — RÈGLE

- **Ne jamais remplacer tout le bloc HTML** d'un SOP existant.
- L'utilisateur tient à son format, sa mise en page et son style d'écriture.
- **Ajouter uniquement** ce qui manque (ex: une étape supplémentaire), sans supprimer ni modifier le texte existant.
- Si tu as besoin d'ajouter, récupère d'abord le contenu actuel du bloc, puis *append* uniquement la nouvelle section.

### Workflow safe

1. `mcp_data_os_processes_list` → repérer le Process par son titre dans la bonne subfolder.
2. Lire le `blocks[0].text` existant.
3. Si besoin d'ajouter → concaténer le nouveau HTML à la fin du texte existant (ou avant la section qui suit).
4. `mcp_data_os_processes_update(id, blocks=[{"type": "doc", "text": "..."}])`
5. Vérifier que `ok: true` en retour.

### Dédoublonnage

Si deux SOPs couvrent le même sujet (ex: "Présentation email outbound" + "Création contacts leads outbound dans Data OS"), proposer à l'utilisateur de :
- Fusionner les points utiles du SOP secondaire dans le SOP principal.
- Vider ou archiver le SOP redondant.

Ne pas décider seul — proposer, attendre validation.

## Contacts outbound (MCP : mcp_data_os_contacts_*)

L'import de contacts outbound suit le SOP "Présentation email outbound" (Étape 5 — Import Data OS).
Conditions : validation Coordinateur, déduplication, source/statut/note "leads outbound", jamais de Qualité C/suspect/incomplet.

Voir le SOP dans Data OS pour les détails.

## Leads outbound — création via MCP (mcp_data_os_leads_create)

**Outil :** `mcp_data_os_leads_create`

Crée un contact + lead + pipeline (stage `nouveau-lead`) en un seul appel MCP.

### Paramètres

| champ | obligatoire | valeurs / notes |
|---|---|---|
| `name` | oui | Prénom Nom complet (string) |
| `email` | oui | Email professionnel vérifié (string) |
| `company` | oui | Nom exact de l'entreprise (string) |
| `source` | oui | **`outbound`** \| `inbound` \| `recommandation` uniquement. Toute autre valeur sera rejetée (ex: `test-manuel-thomas` → erreur). |
| `phone` | non | Format libre (string) |
| `value` | non | Valeur estimée en CHF (number, ex: 10000) |

### Retour

```json
{
  "result": {
    "leadId": "p97a6ffrfnbm3p6bwt2vv0mhy988v6q2",
    "contactId": "p574vycdr8vn38qaxpv58gvqz988tc6m",
    "pipelineId": "pn73y0a6tzhbwdh29bv9wqrrrh87wfrs",
    "stageId": "nouveau-lead"
  }
}
```

- Le lead est immédiatement dans le pipeline, stage `nouveau-lead`.
- Les trois IDs (lead, contact, pipeline) sont liés automatiquement.
- Vérification possible via `mcp_data_os_pipeline_get(id=leadId)` et `mcp_data_os_contacts_get(id=contactId)`.

### Nettoyage d'un lead test

```json
mcp_data_os_contacts_delete_or_archive(id=contactId)
```

Archiver le contact archive automatiquement le lead et le pipeline associés. `ok: true` confirme la suppression.

### Pitfalls

- **Source invalide** : le champ `source` est strict. Les seules valeurs acceptées sont `outbound`, `inbound`, `recommandation`. Ne pas utiliser `test`, `dev`, `manuel`, ou tout autre libellé inventé.
- **Doublon** : la création ne checke pas les doublons automatiquement. Un même email peut être créé plusieurs fois. Le SOP "Présentation email outbound" exige une déduplication manuelle avant import.
- **Pipeline view** : après création, le lead est visible dans la vue pipeline Data OS avec les autres leads outbound. Pas de tag spécial à ajouter.

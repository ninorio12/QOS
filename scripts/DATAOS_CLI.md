# Data OS — MCP + CLI (Hermes Agent)

Le **VividFlow Data OS** expose une API opérationnelle complète. Deux façons d'y accéder :

## 1. MCP (pour agents)
Serveur MCP déployé : `https://data-os.vividflow.co/api/mcp`
- Transport : Streamable HTTP, JSON-RPC 2.0 (`2025-06-18`)
- **56 outils** : contacts, pipeline/leads, clients, sales calls, outreach, tâches,
  activités, mémoire/connaissance, process, prospection, performance, état COO (`dataos_state`).
- Toute écriture logge une activité (audit).
- Enregistré dans Hermes : `~/.hermes/config.yaml` → `mcp_servers.dataos`.
  Les agents Hermes y accèdent nativement après reload du gateway.

## 2. CLI (terminal, scripts, agents non-MCP)
`scripts/dataos.mjs` → installé en `dataos` (`/usr/local/bin/dataos`).
Client universel, zéro dépendance (Node 18+), auto-découvre les outils.

```bash
dataos state                          # vue COO complète
dataos tools [filtre]                 # liste / filtre les outils
dataos describe leads_create          # schéma d'un outil
dataos contacts_list                  # appel direct
dataos leads_create --name "Jean Dupont" --email jean@x.ch --value 5000
dataos call prospection_summary       # forme explicite
dataos prospection_summary --raw      # JSON brut (scripts)
```

Arguments : `--clé valeur` ou `--clé=valeur` ; `--json '{...}'` pour un payload complet ;
`--clé` répété → tableau ; bool/number coercés automatiquement.

### Env
- `DATAOS_URL` — défaut `https://data-os.vividflow.co/api/mcp`
- `DATAOS_TOKEN` (ou `HERMES_API_SECRET`) — Bearer pour les écritures si l'endpoint est verrouillé.

## ⚠️ Sécurité
`HERMES_API_SECRET` n'est **pas défini** côté Vercel prod → les écritures sont
actuellement **ouvertes** (n'importe qui peut muter le CRM via l'endpoint public).
Pour verrouiller : définir `HERMES_API_SECRET` dans l'env Vercel prod, puis
décommenter le header `Authorization` dans `~/.hermes/config.yaml` et exporter
`DATAOS_TOKEN` pour la CLI.

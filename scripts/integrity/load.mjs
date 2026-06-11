// Lecture SEULE des tables Convex via les list queries DÉJÀ déployées.
// Aucune écriture, aucun déploiement. Mappe nom de table → fonction api.<module>.list.
import { ConvexHttpClient } from 'convex/browser'
import { readFileSync } from 'node:fs'
import { api } from '../../convex/_generated/api.js'

function convexUrl() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) return process.env.NEXT_PUBLIC_CONVEX_URL
  const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
  const m = env.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m)
  if (!m) throw new Error('NEXT_PUBLIC_CONVEX_URL introuvable (env ou .env.local)')
  return m[1].trim().replace(/^"|"$/g, '')
}

// libellé logique → query list existante (lecture seule). Les clés doivent matcher
// ALL_TABLES / les tables des règles dans invariant-map.mjs.
export const TABLE_QUERY = {
  crm_contacts:     api.crm_contacts.list,
  crm_leads:        api.crm_leads.list,
  pipeline_clients: api.pipeline_clients.list,
  osProspection:    api.osProspection.list,   // lit la table prospection_records
  os_sales_calls:   api.osSalesCalls.list,
  os_outreach:      api.osOutreach.list,
  onboarding:       api.onboarding.list,
}

// Charge les tables demandées. Retourne { [table]: rows[] }. Une table sans query connue lève une erreur explicite.
export async function loadTables(tableNames) {
  const client = new ConvexHttpClient(convexUrl())
  const result = {}
  for (const name of tableNames) {
    const q = TABLE_QUERY[name]
    if (!q) throw new Error(`Pas de list query connue pour la table "${name}" — l'ajouter à TABLE_QUERY (lecture seule).`)
    result[name] = await client.query(q, {})
  }
  return result
}

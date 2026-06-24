import DataView from '@/components/bibliotheque/DataView'

// Vue dashboard authentifiée (Convex live + Clerk) — pas de prerender statique
// (sinon throw "Missing publishableKey" au build). Cohérent avec /contacts, /paiement, etc.
export const dynamic = 'force-dynamic'

export default function DataPage() {
  return <DataView />
}

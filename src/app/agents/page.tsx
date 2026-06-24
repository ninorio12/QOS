import { redirect } from 'next/navigation'

// Gouvernance IA retirée du produit (masquée pour tous les comptes, admins compris).
// La route est neutralisée : tout accès direct est renvoyé à l'atterrissage racine
// (`/` décide la page selon les droits du compte). Le composant AgentGovernanceView
// est conservé au cas où on voudrait le réactiver.
export default function AgentsPage() {
  redirect('/')
}

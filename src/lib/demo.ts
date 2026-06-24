// Mode démo : activé par la variable d'env NEXT_PUBLIC_DEMO_MODE (inlinée au build).
// Quand actif → pas de Clerk (auth bypassée), backend Convex démo, données factices.
// Constante au build : la prod (variable absente) garde 100% son comportement Clerk.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// Utilisateur admin statique présenté en mode démo (aucun appel Clerk).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DEMO_CLERK_USER: any = {
  id: 'demo-admin',
  firstName: 'Démo',
  lastName: 'VividFlow',
  fullName: 'Démo VividFlow',
  primaryEmailAddress: { emailAddress: 'demo@vividflow.app' },
  imageUrl: '',
  hasImage: false,
  setProfileImage: async () => ({}),
  updatePassword: async () => ({}),
}

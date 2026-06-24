import LandingRedirect from '@/components/LandingRedirect'

// Atterrissage selon les droits du compte (jamais /dashboard en dur — cf. LandingRedirect).
export default function Home() {
  return <LandingRedirect />
}

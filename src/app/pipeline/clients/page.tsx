import { redirect } from 'next/navigation'

// Les deux pipelines n'en font plus qu'un : l'ancienne adresse mène au module
// fusionné, pour que les liens et les favoris existants continuent de marcher.
export default function ClientsPipelinePage() {
  redirect('/pipeline')
}

import ClosingView from '@/components/closing/ClosingView'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default function ClosingPage() {
  return (
    <Suspense fallback={null}>
      <ClosingView />
    </Suspense>
  )
}

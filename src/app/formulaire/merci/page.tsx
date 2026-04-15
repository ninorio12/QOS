import { Suspense } from 'react'
import MerciContent from './MerciContent'

export default function MerciPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EEF0EB] p-6">
      <Suspense fallback={null}>
        <MerciContent />
      </Suspense>
    </main>
  )
}

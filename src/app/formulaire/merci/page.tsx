import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import MerciContent from './MerciContent'

async function getCompanySettings() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .single()
    return data
  } catch {
    return null
  }
}

export default async function MerciPage() {
  const company = await getCompanySettings()

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EEF0EB] p-6">
      <Suspense fallback={null}>
        <MerciContent
          companyName={company?.name       ?? 'Votre entreprise'}
          brandColor={company?.brand_color ?? '#FF4D00'}
          logoSvg={company?.logo_svg       ?? null}
        />
      </Suspense>
    </main>
  )
}

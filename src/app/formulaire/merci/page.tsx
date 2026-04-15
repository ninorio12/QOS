import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import MerciContent from './MerciContent'

async function getCompanySettings() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
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
          brandColor={company?.brand_color ?? '#E2FF8D'}
          ctaColor={company?.cta_color     ?? '#F97316'}
          logoSvg={company?.logo_svg       ?? null}
        />
      </Suspense>
    </main>
  )
}

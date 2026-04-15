import { createClient } from '@supabase/supabase-js'
import FormulaireForm from './FormulaireForm'

async function getCompanySettings() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('company_settings')
      .select('name, tagline, brand_color, logo_svg')
      .single()
    return data
  } catch {
    return null
  }
}

export default async function FormulairePublicPage() {
  const company = await getCompanySettings()

  return (
    <FormulaireForm
      companyName={company?.name    ?? 'Votre entreprise'}
      companyTagline={company?.tagline   ?? ''}
      brandColor={company?.brand_color ?? '#E2FF8D'}
      logoSvg={company?.logo_svg   ?? null}
    />
  )
}

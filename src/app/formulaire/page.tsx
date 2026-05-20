import { createAdminClient } from '@/lib/supabase/admin'
import FormulaireForm, { DEFAULT_FIELDS, type FormField } from './FormulaireForm'

export const dynamic = 'force-dynamic'

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

export default async function FormulairePublicPage() {
  const company = await getCompanySettings()

  const formFields: FormField[] = (company?.form_fields as FormField[] | null) ?? DEFAULT_FIELDS

  return (
    <FormulaireForm
      companyName={company?.name       ?? 'Votre entreprise'}
      companyTagline={company?.tagline ?? ''}
      brandColor={company?.brand_color ?? '#FF4D00'}
      logoSvg={company?.logo_svg       ?? null}
      formFields={formFields}
    />
  )
}

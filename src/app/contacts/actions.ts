'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createContact(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('contacts').insert({
    user_id: user.id,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    company: formData.get('company') as string || null,
    job_title: formData.get('job_title') as string || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/contacts')
  return { success: true }
}

export async function deleteContact(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contacts')
  return { success: true }
}

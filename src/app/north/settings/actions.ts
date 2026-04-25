'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function saveSettings(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/north/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/north/login')

  const plan = formData.get('plan') as string || 'free'

  const updateData: any = {
    plan,
    updated_at: new Date().toISOString(),
  }

  if (formData.has('ai_provider')) updateData.ai_provider = formData.get('ai_provider')
  if (formData.has('ai_model')) updateData.ai_model = formData.get('ai_model')
  if (formData.has('system_context')) updateData.system_context = formData.get('system_context')
  if (formData.has('credits_limit')) updateData.credits_limit = parseInt(formData.get('credits_limit') as string) || 0
  if (formData.has('max_chat_per_generation')) updateData.max_chat_per_generation = parseInt(formData.get('max_chat_per_generation') as string) || 0

  const { error } = await supabase.from('plan_settings').upsert(updateData)

  revalidatePath('/north/settings')
  redirect(error ? `/north/settings?plan=${plan}&saved=error` : `/north/settings?plan=${plan}&saved=ok`)
}

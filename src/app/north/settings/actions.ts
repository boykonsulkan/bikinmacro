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

export async function savePaymentSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const payment_provider = formData.get('payment_provider') as string
  const lynk_url_addon = formData.get('lynk_url_addon') as string
  const lynk_url_starter = formData.get('lynk_url_starter') as string
  const lynk_url_pro = formData.get('lynk_url_pro') as string

  const { error } = await supabase
    .from('admin_settings')
    .update({
      payment_provider,
      lynk_url_addon: lynk_url_addon || '',
      lynk_url_starter: lynk_url_starter || '',
      lynk_url_pro: lynk_url_pro || '',
      updated_at: new Date().toISOString()
    })
    .eq('id', 1)

  if (error) {
    console.error('savePaymentSettings error:', error)
    return { error: error.message }
  }

  revalidatePath('/north/settings')
  return { success: true }
}

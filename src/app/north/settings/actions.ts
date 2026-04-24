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

  const { error } = await supabase.from('admin_settings').update({
    ai_provider: formData.get('ai_provider') as string,
    ai_model: formData.get('ai_model') as string,
    system_context: formData.get('system_context') as string,
    free_credits_limit: parseInt(formData.get('free_credits_limit') as string) || 3,
    max_chat_per_generation: parseInt(formData.get('max_chat_per_generation') as string) || 10,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  revalidatePath('/north/settings')
  redirect(error ? '/north/settings?saved=error' : '/north/settings?saved=ok')
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function manualUpgrade(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const email = formData.get('email') as string
  const plan = formData.get('plan') as string

  if (!email || !plan) {
    return { error: 'Email and Plan are required' }
  }

  // Find user by email
  const { data: targetUser, error: findError } = await supabase
    .from('users')
    .select('id, credits_limit')
    .eq('email', email)
    .single()

  if (findError || !targetUser) {
    return { error: 'User with that email not found' }
  }

  // Determine limits based on plan
  let newLimit = targetUser.credits_limit
  let newPlan = plan
  let resetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  let amount = 0

  if (plan === 'addon') {
    newLimit += 5
    newPlan = undefined as any
    resetAt = undefined as any
    amount = 25000
  } else {
    const { data: planSettings } = await supabase.from('plan_settings').select('credits_limit').eq('plan', plan).single()
    if (planSettings) {
      newLimit = planSettings.credits_limit
    }
    if (plan === 'starter') amount = 79000
    if (plan === 'pro') amount = 149000
  }

  // Update user
  const updateData: any = { credits_limit: newLimit }
  if (newPlan) updateData.plan = newPlan
  if (resetAt) updateData.reset_at = resetAt

  await supabase.from('users').update(updateData).eq('id', targetUser.id)

  // Log payment as manual
  await supabase.from('payments').insert({
    user_id: targetUser.id,
    plan: plan,
    amount: amount,
    status: 'success',
    midtrans_id: `MANUAL_${Date.now()}`
  })

  revalidatePath('/north/payments')
  return { success: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { activateInvite, lookupInvite } from '@/lib/invites/server'
import { PLAN_LABEL, STATE_MESSAGE, maskEmail, validatePassword } from '@/lib/invites/rules'
import type { InviteState } from '@/lib/invites/rules'
import { createClient } from '@/utils/supabase/server'

export type InviteView = { state: InviteState; maskedEmail?: string; planLabel?: string; existing?: boolean }

/** Cek undangan tanpa memakainya, untuk menampilkan form (email disamarkan). */
export async function checkInvite(token: string): Promise<InviteView> {
  const info = await lookupInvite(token)
  if (info.state !== 'ok' || !info.email) return { state: info.state }
  return { state: 'ok', maskedEmail: maskEmail(info.email), planLabel: PLAN_LABEL[info.plan ?? ''] ?? info.plan, existing: info.existing }
}

export type ActivateState = { status: 'idle' | 'error'; message: string }

/**
 * Aktivasi satu klik: pengguna cuma membuat password. Akun dibuat, paket beta aktif, dan langsung masuk.
 * Token datang dari field tersembunyi (dibaca dari bagian # URL di browser).
 */
export async function activateAction(_prev: ActivateState, formData: FormData): Promise<ActivateState> {
  const token = String(formData.get('token') ?? '')
  const password = formData.get('password')
  const confirm = formData.get('confirm')

  const info = await lookupInvite(token)
  if (info.state !== 'ok' || !info.email) {
    return { status: 'error', message: STATE_MESSAGE[info.state === 'ok' ? 'invalid' : info.state] }
  }

  // Email yang sudah punya akun nggak perlu password baru: paketnya saja yang dinaikkan.
  if (!info.existing) {
    const passwordError = validatePassword(password, confirm, info.email)
    if (passwordError) return { status: 'error', message: passwordError }
  }

  const result = await activateInvite(token, String(password ?? ''))
  if (!result.ok) {
    return { status: 'error', message: result.state && result.state !== 'ok' ? STATE_MESSAGE[result.state] : result.error }
  }

  // redirect() melempar, jadi harus di luar try/catch.
  if (result.existing) {
    redirect('/auth/login?message=' + encodeURIComponent('Paket beta sudah aktif di akunmu. Silakan masuk dengan password kamu.'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: result.email, password: String(password) })
  if (error) {
    redirect('/auth/login?message=' + encodeURIComponent('Akunmu sudah aktif. Silakan masuk dengan email dan password yang baru kamu buat.'))
  }
  revalidatePath('/', 'layout')
  redirect('/generate')
}

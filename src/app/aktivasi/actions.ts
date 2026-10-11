'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { activateInvite, lookupInvite } from '@/lib/invites/server'
import { PLAN_LABEL, STATE_MESSAGE, maskEmail, validatePassword } from '@/lib/invites/rules'
import type { InviteState } from '@/lib/invites/rules'
import { createClient } from '@/utils/supabase/server'

export type InviteView = {
  state: InviteState
  maskedEmail?: string
  planLabel?: string
  /** Email ini sudah punya akun (password akan diatur ulang lewat aktivasi, kecuali akun admin). */
  existing?: boolean
  /** Akun admin: nggak ada password yang diminta atau diubah. */
  existingAdmin?: boolean
}

/** Cek undangan tanpa memakainya, untuk menampilkan form (email disamarkan). */
export async function checkInvite(token: string): Promise<InviteView> {
  const info = await lookupInvite(token)
  if (info.state !== 'ok' || !info.email) return { state: info.state }
  return {
    state: 'ok',
    maskedEmail: maskEmail(info.email),
    planLabel: PLAN_LABEL[info.plan ?? ''] ?? info.plan,
    existing: info.existing,
    existingAdmin: info.existingAdmin,
  }
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

  // Semua akun membuat password baru lewat aktivasi (akun baru, atau akun lama yang lupa password-nya).
  // Pengecualian: akun admin nggak disentuh, jadi nggak ada password yang diminta.
  if (!info.existingAdmin) {
    const passwordError = validatePassword(password, confirm, info.email)
    if (passwordError) return { status: 'error', message: passwordError }
  }

  const result = await activateInvite(token, String(password ?? ''))
  if (!result.ok) {
    return { status: 'error', message: result.state && result.state !== 'ok' ? STATE_MESSAGE[result.state] : result.error }
  }

  // redirect() melempar, jadi harus di luar try/catch.
  if (!result.passwordSet) {
    // Akun admin: paket diproses tapi password nggak diubah, jadi masuk seperti biasa.
    redirect('/auth/login?message=' + encodeURIComponent('Undangan diproses. Akun ini akun admin, jadi password-nya nggak diubah. Silakan masuk seperti biasa.'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: result.email, password: String(password) })
  if (error) {
    redirect('/auth/login?message=' + encodeURIComponent('Akunmu sudah aktif. Silakan masuk dengan email dan password yang baru kamu buat.'))
  }
  revalidatePath('/', 'layout')
  redirect('/generate')
}

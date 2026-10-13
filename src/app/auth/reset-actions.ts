'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { sendOne } from '@/lib/email/resend'
import { validatePassword } from '@/lib/invites/rules'
import { RESET, RESET_NEUTRAL_MESSAGE, RESET_TOKEN_INVALID_MESSAGE, buildResetEmail, isPlausibleToken, normalizeEmail } from '@/lib/auth/reset'
import { serviceClient } from '@/lib/orders/server'
import { rateLimit } from '@/lib/rate'
import { createClient } from '@/utils/supabase/server'

export type ResetState = { status: 'idle' | 'sent' | 'error'; message: string }

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://bikinmacro.my.id').replace(/\/+$/, '')
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Minta tautan atur ulang password. Jawabannya SELALU sama untuk email terdaftar maupun tidak, dan waktu responsnya
 * diratakan, supaya fitur ini nggak bisa dipakai menebak siapa saja yang punya akun.
 */
export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const startedAt = Date.now()
  const sent: ResetState = { status: 'sent', message: RESET_NEUTRAL_MESSAGE }
  const finish = async (state: ResetState): Promise<ResetState> => {
    await pause(Math.max(0, RESET.minResponseMs - (Date.now() - startedAt)))
    return state
  }

  const email = normalizeEmail(formData.get('email'))
  if (!email) return { status: 'error', message: 'Masukkan alamat email yang valid.' }

  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  if (!rateLimit(`reset-ip:${ip}`, RESET.perIpPerHour, 3_600_000)) {
    return { status: 'error', message: 'Terlalu banyak percobaan. Coba lagi dalam satu jam.' }
  }
  if (!rateLimit(`reset-email:${email}`, RESET.perEmailPerHour, 3_600_000)) return finish(sent)

  try {
    const db = serviceClient()

    // Batas per email yang tahan lintas instance: hitung dari catatan email_logs satu jam terakhir.
    const since = new Date(Date.now() - 3_600_000).toISOString()
    const { count } = await db
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('template', 'password_reset')
      .ilike('to_email', email)
      .gte('created_at', since)
    if ((count ?? 0) >= RESET.perEmailPerHour) return finish(sent)

    const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email })
    const token = data?.properties?.hashed_token
    // Email nggak terdaftar, akun nonaktif, atau galat lain: diam saja, jawaban tetap sama.
    if (error || !token || data.user?.banned_until) return finish(sent)

    const mail = buildResetEmail(siteUrl(), token)
    const result = await sendOne({ to: email, subject: mail.subject, html: mail.html, text: mail.text })
    await db.from('email_logs').insert({
      to_email: email,
      subject: mail.subject,
      template: 'password_reset',
      status: result.ok ? 'terkirim' : 'gagal',
      provider_id: result.ok ? result.id : null,
      error: result.ok ? null : result.error,
    })
    if (!result.ok) console.error('Email atur ulang password gagal dikirim:', result.error)
  } catch (e) {
    console.error('requestPasswordReset gagal:', e instanceof Error ? e.message : e)
  }
  return finish(sent)
}

/**
 * Simpan password baru. Token dari bagian # tautan dipakai sekali di sini. Password divalidasi LEBIH DULU supaya salah
 * ketik nggak menghabiskan token. Setelah berhasil, sesi di perangkat lain dicabut dan pengguna langsung masuk.
 */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = formData.get('token')
  const password = formData.get('password')
  const confirm = formData.get('confirm')

  if (!isPlausibleToken(token)) return { status: 'error', message: RESET_TOKEN_INVALID_MESSAGE }
  const passwordError = validatePassword(password, confirm)
  if (passwordError) return { status: 'error', message: passwordError }

  const supabase = await createClient()
  const verified = await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' })
  if (verified.error || !verified.data.user) return { status: 'error', message: RESET_TOKEN_INVALID_MESSAGE }

  const updated = await supabase.auth.updateUser({ password: String(password) })
  if (updated.error) {
    await supabase.auth.signOut()
    const same = /different from the old password|same password/i.test(updated.error.message)
    return {
      status: 'error',
      message: same
        ? 'Password baru harus berbeda dari yang lama. Minta tautan baru untuk mencoba lagi.'
        : 'Password belum tersimpan. Minta tautan baru untuk mencoba lagi.',
    }
  }

  // Semua perangkat lain keluar (kalau password lama bocor, sesi lamanya ikut mati).
  await supabase.auth.signOut({ scope: 'others' })
  revalidatePath('/', 'layout')
  redirect('/generate')
}

// Aturan dan isi email "lupa password". Murni (tanpa jaringan/DB) supaya gampang dites.
// Alur: token pemulihan dibuat Supabase (admin.generateLink), dikirim lewat Resend kita sendiri, dan tautannya menaruh
// token di bagian # (fragment) supaya pemindai email nggak bisa menghabiskannya dan token nggak masuk log server.
// Tokennya dipakai sekali lewat form (verifyOtp), jadi hanya klik tombol "Simpan password" yang mengonsumsinya.

import { renderEmail } from '@/lib/email/templates'
import type { RenderedEmail } from '@/lib/email/templates'

export const RESET = {
  /** Masa berlaku token di Supabase (pengaturan OTP expiry, bawaan 1 jam). Hanya untuk teks email. */
  ttlLabel: '1 jam',
  /** Maksimal permintaan per email per jam (diam-diam dilewati setelahnya). */
  perEmailPerHour: 3,
  /** Maksimal permintaan per alamat IP per jam. */
  perIpPerHour: 10,
  /** Waktu respons minimum (ms), supaya cepat atau lambatnya jawaban nggak membocorkan email itu terdaftar atau tidak. */
  minResponseMs: 1200,
} as const

/** Jawaban SAMA untuk email yang terdaftar maupun tidak, supaya daftar akun nggak bisa ditebak. */
export const RESET_NEUTRAL_MESSAGE =
  'Kalau email itu terdaftar, kami sudah mengirim tautan untuk mengatur ulang password. Cek kotak masuk (dan folder spam). Tautannya berlaku 1 jam.'

export const RESET_TOKEN_INVALID_MESSAGE = 'Tautan ini nggak berlaku lagi (sudah dipakai atau kedaluwarsa). Minta tautan baru di bawah.'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const email = input.trim().toLowerCase()
  if (email.length < 5 || email.length > 254 || !EMAIL_RE.test(email)) return null
  return email
}

/** Token hash dari Supabase: huruf, angka, strip, garis bawah. Cuma pagar kasar sebelum dikirim ke Supabase. */
export function isPlausibleToken(token: unknown): token is string {
  return typeof token === 'string' && token.length >= 16 && token.length <= 256 && /^[A-Za-z0-9_-]+$/.test(token)
}

export function resetUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/auth/reset#t=${token}`
}

export const RESET_FOOTER =
  'Email ini dikirim karena ada permintaan atur ulang password untuk akun BikinMacro dengan alamat ini. Kalau bukan kamu, abaikan saja: password lamamu tetap aman.'

export function buildResetEmail(siteUrl: string, token: string): RenderedEmail {
  return renderEmail({
    subject: 'Atur ulang password BikinMacro',
    body: [
      'Ada permintaan untuk mengatur ulang password akun BikinMacro kamu. Klik tombol di bawah, lalu buat password baru.',
      `Tautan ini berlaku ${RESET.ttlLabel} dan hanya bisa dipakai sekali. Setelah password diganti, semua perangkat lain otomatis keluar.`,
      'Kalau kamu tidak merasa memintanya, abaikan email ini. Password lamamu tidak berubah.',
    ].join('\n\n'),
    recipient: { email: '', name: '' },
    ctas: [{ label: 'Atur ulang password', url: resetUrl(siteUrl, token), style: 'primary' }],
    footer: RESET_FOOTER,
  })
}

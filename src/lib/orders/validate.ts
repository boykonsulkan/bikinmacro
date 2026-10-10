// Validasi murni (tanpa dependensi server) untuk form pesanan dan chat.
import { ORDER_LIMITS, PLAN_KEYS } from './config'
import type { PlanKey } from './config'

export type OrderField = 'email' | 'plan' | 'midtransOrderId' | 'description' | 'file'
export type FieldErrors = Partial<Record<OrderField, string>>

export type OrderInput = {
  email: unknown
  plan: unknown
  midtransOrderId: unknown
  description: unknown
}

export type ValidOrder = {
  email: string
  plan: PlanKey
  midtransOrderId: string
  description: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ORDER_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/: ]*$/

const asText = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function validateOrderInput(
  input: OrderInput,
): { ok: true; value: ValidOrder } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {}

  const email = asText(input.email).toLowerCase()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    errors.email = 'Email nggak valid. Pakai email yang sama dengan saat bayar.'
  }

  const plan = asText(input.plan)
  if (!(PLAN_KEYS as string[]).includes(plan)) {
    errors.plan = 'Pilih paket yang kamu beli.'
  }

  const midtransOrderId = asText(input.midtransOrderId)
  const { min, max } = ORDER_LIMITS.midtransOrderId
  if (midtransOrderId.length < min || midtransOrderId.length > max || !ORDER_ID_RE.test(midtransOrderId)) {
    errors.midtransOrderId = 'Nomor order nggak valid. Cek lagi di struk atau email dari Midtrans.'
  }

  const description = asText(input.description)
  const d = ORDER_LIMITS.description
  if (description.length < d.min) {
    errors.description = `Ceritain kerjaan kamu lebih lengkap, minimal ${d.min} karakter.`
  } else if (description.length > d.max) {
    errors.description = `Terlalu panjang, maksimal ${d.max} karakter.`
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { email, plan: plan as PlanKey, midtransOrderId, description } }
}

/** File contoh: harus .xlsx, ukurannya masuk batas, dan isinya beneran zip (xlsx = zip). */
export function validateSampleFile(name: string, size: number, head: Uint8Array): string | null {
  if (!name.toLowerCase().endsWith('.xlsx')) return 'Formatnya harus .xlsx.'
  if (size <= 0) return 'File kosong.'
  if (size > ORDER_LIMITS.sampleFileMaxBytes) {
    return `File terlalu besar, maksimal ${Math.round(ORDER_LIMITS.sampleFileMaxBytes / 1024 / 1024)} MB.`
  }
  const isZip = head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04
  if (!isZip) return 'File nggak bisa dibaca sebagai Excel .xlsx.'
  return null
}

export function validateMessage(body: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const text = typeof body === 'string' ? body.trim() : ''
  if (!text) return { ok: false, error: 'Pesannya kosong.' }
  if (text.length > ORDER_LIMITS.message.max) {
    return { ok: false, error: `Pesan terlalu panjang, maksimal ${ORDER_LIMITS.message.max} karakter.` }
  }
  return { ok: true, value: text }
}

/** Nama file aman buat disimpan dan ditampilkan: tanpa path, huruf, angka, titik, strip, underscore. */
export function safeFileName(name: string, fallback = 'file'): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const clean = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80)
  return clean || fallback
}

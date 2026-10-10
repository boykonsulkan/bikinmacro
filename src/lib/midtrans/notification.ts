import { createHash, timingSafeEqual } from 'node:crypto'

export type MidtransNotification = {
  order_id?: unknown
  status_code?: unknown
  gross_amount?: unknown
  signature_key?: unknown
}

/**
 * Verifikasi tanda tangan notifikasi: sha512(order_id + status_code + gross_amount + serverKey).
 * Selalu mengembalikan false kalau ada field yang hilang atau serverKey kosong.
 */
export function verifyNotificationSignature(n: MidtransNotification, serverKey: string): boolean {
  if (!serverKey) return false
  const { order_id, status_code, gross_amount, signature_key } = n
  if (typeof order_id !== 'string' || typeof status_code !== 'string' || typeof gross_amount !== 'string' || typeof signature_key !== 'string') {
    return false
  }
  const expected = createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature_key, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export type PaymentOutcome = 'paid' | 'failed' | 'pending'

/**
 * Arti status notifikasi untuk akun kita.
 * - settlement: lunas.
 * - capture (kartu): lunas hanya kalau fraud_status 'accept' (atau nggak dikirim). 'challenge' ditahan.
 * - deny, cancel, expire, failure: gagal.
 * - sisanya (pending, authorize, refund, ...): belum dihitung lunas.
 */
export function notificationOutcome(transactionStatus: unknown, fraudStatus?: unknown): PaymentOutcome {
  if (transactionStatus === 'settlement') return 'paid'
  if (transactionStatus === 'capture') {
    if (fraudStatus === undefined || fraudStatus === null || fraudStatus === 'accept') return 'paid'
    return fraudStatus === 'deny' ? 'failed' : 'pending'
  }
  if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire' || transactionStatus === 'failure') {
    return 'failed'
  }
  return 'pending'
}

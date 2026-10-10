// Konfigurasi pesanan di satu tempat. Semua batas ada di sini supaya gampang disetel.

export const PLANS = {
  output_1: { label: '1 Output', price: 25000, outputs: 1, revisionsPerOutput: 3 },
  output_3: { label: '3 Output', price: 59000, outputs: 3, revisionsPerOutput: 5 },
  dibuatin: { label: 'Dibuatin', price: null, outputs: 1, revisionsPerOutput: 5 },
} as const

export type PlanKey = keyof typeof PLANS
export const PLAN_KEYS = Object.keys(PLANS) as PlanKey[]

export function planTotals(plan: PlanKey) {
  const p = PLANS[plan]
  return { outputs: p.outputs, revisions: p.outputs * p.revisionsPerOutput }
}

// TODO: konfigurasi lanjutan untuk chat (batas konteks yang dikirim ke AI,
// ringkasan percakapan, dan definisi "satu revisi") ditentukan nanti.
export const ORDER_LIMITS = {
  description: { min: 20, max: 4000 },
  message: { max: 2000 },
  /** Total pesan per pesanan (pembeli dan admin). */
  messagesPerOrder: 200,
  /** Pesan pembeli per jam per pesanan. */
  buyerMessagesPerHour: 20,
  ordersPerEmailPerDay: 5,
  /** Batas pesanan masuk per jam, semua pembeli, untuk jaga dari spam. */
  ordersPerHourGlobal: 60,
  /** Batas request Vercel 4,5 MB, jadi file contoh dibatasi 4 MB. */
  sampleFileMaxBytes: 4 * 1024 * 1024,
  resultFileMaxBytes: 4 * 1024 * 1024,
  midtransOrderId: { min: 4, max: 100 },
} as const

export const STATUS_LABEL = {
  menunggu_cek: 'Menunggu dicek',
  dikerjakan: 'Sedang dikerjakan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
} as const
export type OrderStatus = keyof typeof STATUS_LABEL
export const ORDER_STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[]

export const PAYMENT_LABEL = {
  menunggu: 'Menunggu verifikasi',
  terverifikasi: 'Pembayaran terverifikasi',
  ditolak: 'Pembayaran ditolak',
} as const
export type PaymentStatus = keyof typeof PAYMENT_LABEL
export const PAYMENT_STATUSES = Object.keys(PAYMENT_LABEL) as PaymentStatus[]

export const STORAGE_BUCKET = 'order-files'

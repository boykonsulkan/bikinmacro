// Tujuan semua CTA "Coba gratis" di landing page: demo tanpa login di /coba.
export const TRY_FREE_HREF = '/coba'

// Daftar akun. Dipakai kartu use case dan ajakan setelah demo.
export const SIGNUP_HREF = '/auth/register'

export const NAV_LINKS = [
  { label: 'Use case', href: '/#use-case' },
  { label: 'Template', href: '/#template' },
  { label: 'Harga', href: '/#harga' },
  { label: 'Bantuan', href: '/help' },
] as const

// Midtrans Payment Link lama untuk model "1 Output" (Rp25.000, dikerjakan manual lewat /pesan).
// Landing sekarang menjual paket self-serve di /pricing, jadi konstanta ini cuma dipakai halaman /pesan.
// Disimpan karena alur /pesan dan fulfillment kit (docs/fulfillment) masih ada untuk layanan Dibuatin.
export const PAYMENT_LINK_BASIC =
  'https://app.midtrans.com/payment-links/6a89b99f-aeef-4675-b9cf-b9f77180cc57-VeG41ALF'

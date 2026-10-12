// Tujuan semua CTA "Coba gratis" di landing page: demo tanpa login di /coba.
export const TRY_FREE_HREF = '/coba'

// Kontak: belum ada kotak masuk dukungan sendiri, jadi semua pertanyaan diarahkan ke founder.
export const FOUNDER_EMAIL = 'founder@pelajarin.id'
export const founderMailto = (subject: string) => `mailto:${FOUNDER_EMAIL}?subject=${encodeURIComponent(subject)}`

// Daftar akun. Dipakai kartu use case dan ajakan setelah demo.
export const SIGNUP_HREF = '/auth/register'

export const NAV_LINKS = [
  { label: 'Use case', href: '/#use-case' },
  { label: 'Template', href: '/#template' },
  { label: 'Harga', href: '/#harga' },
  { label: 'Bantuan', href: '/help' },
] as const



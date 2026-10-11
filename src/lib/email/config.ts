// Konfigurasi email di satu tempat. Aman dipakai di client dan server (tanpa import server).

export const EMAIL_LIMITS = {
  /** Penerima per sekali tekan Kirim. Sengaja kecil: tahap beta, bukan blast. */
  maxRecipientsPerSend: 10,
  /** Total email "terkirim" per 24 jam (di luar email tes). Jaga dari salah pencet dan kuota Resend. */
  maxPerDay: 30,
  subjectMax: 150,
  bodyMin: 10,
  bodyMax: 5000,
  nameMax: 60,
} as const

export type TemplateKey = 'beta_invite' | 'free'

export type TemplateDef = {
  label: string
  subject: string
  body: string
  /** Tombol ajakan (CTA) menyala dari awal untuk template ini. */
  cta: boolean
}

// Teks ditulis dengan gaya produk: "kamu", santai, tanpa em dash atau en dash.
// {nama} diganti nama penerima (atau "kamu" kalau nama nggak diisi).
export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  beta_invite: {
    label: 'Undangan beta tester',
    subject: 'Kamu diundang jadi beta tester BikinMacro',
    cta: true,
    body: [
      'Kami lagi uji coba BikinMacro, tool yang bikin file Excel macro dari cerita kerjaan kamu. Kamu salah satu dari beberapa orang yang kami undang buat nyoba duluan.',
      'Yang perlu kamu lakuin:\n1. Daftar di BikinMacro pakai email ini.\n2. Ceritain satu kerjaan Excel yang sering kamu ulang.\n3. Coba macro-nya, lalu kasih tahu kami apa yang kurang pas.',
      'Akses kamu kami buka khusus selama masa beta. Kalau ada pertanyaan, balas aja email ini.',
    ].join('\n\n'),
  },
  free: {
    label: 'Pesan bebas',
    subject: '',
    cta: false,
    body: '',
  },
}

export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[]

export const FOOTER_TEXT =
  'Kamu menerima email ini karena kami mengundangmu secara langsung. Kalau nggak mau dihubungi lagi, balas aja email ini.'

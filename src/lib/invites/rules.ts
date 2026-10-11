// Aturan undangan beta (murni, tanpa jaringan/DB, aman dipakai di client dan server).

export const INVITE = {
  /** Link aktivasi berlaku sekian hari sejak dibuat. */
  ttlDays: 14,
  /** Paket yang boleh diberikan lewat undangan. */
  plans: ['starter', 'pro', 'addon'] as const,
  defaultPlan: 'starter',
  /** Lama paket beta aktif sejak aktivasi (sama dengan upgrade manual: reset_at + 30 hari). */
  benefitDays: 30,
  passwordMin: 8,
  /** Batas bcrypt: lebih dari 72 byte dipotong diam-diam. */
  passwordMax: 72,
} as const

export type InvitePlan = (typeof INVITE.plans)[number]
export const isInvitePlan = (v: unknown): v is InvitePlan => (INVITE.plans as readonly string[]).includes(String(v))

/** Urutan paket: undangan hanya boleh MENAIKKAN paket, nggak pernah menurunkan. */
export const PLAN_RANK: Record<string, number> = { free: 0, addon: 1, starter: 2, pro: 3 }

export function shouldUpgrade(currentPlan: string | null | undefined, role: string | null | undefined, newPlan: string): boolean {
  if (role === 'admin') return false // akun admin nggak disentuh
  return (PLAN_RANK[newPlan] ?? 0) > (PLAN_RANK[currentPlan ?? 'free'] ?? 0)
}

export type PurchaseState = 'available' | 'current' | 'included'

/**
 * Status sebuah paket di halaman harga untuk pengguna ini:
 * - available: boleh dibeli (paket di atas paket sekarang).
 * - current: paket yang sedang aktif.
 * - included: paket di bawah paket sekarang (nggak ada gunanya dibeli, jadi dinonaktifkan).
 * Admin selalu available supaya bisa menguji pembayaran. Berlaku sama di tampilan dan di checkout server.
 */
export function purchaseState(currentPlan: string | null | undefined, role: string | null | undefined, cardPlan: string): PurchaseState {
  if (role === 'admin') return 'available'
  const cur = PLAN_RANK[currentPlan ?? 'free'] ?? 0
  const card = PLAN_RANK[cardPlan] ?? 0
  if (card > cur) return 'available'
  return card === cur ? 'current' : 'included'
}

export const PURCHASE_BLOCK_MESSAGE: Record<Exclude<PurchaseState, 'available'>, string> = {
  current: 'Paket ini sudah aktif di akunmu.',
  included: 'Paketmu sekarang sudah di atas paket ini. Kamu cuma bisa upgrade ke paket yang lebih tinggi.',
}

/**
 * Apakah aktivasi boleh mengatur password? Link undangan membuktikan penerimanya pemilik email (seperti link reset password),
 * jadi akun biasa boleh. Akun admin TIDAK: password admin nggak boleh diubah lewat link yang dikirim.
 */
export function shouldSetPassword(role: string | null | undefined): boolean {
  return role !== 'admin'
}

export function validatePassword(password: unknown, confirm: unknown, email?: string): string | null {
  if (typeof password !== 'string' || password.length < INVITE.passwordMin) {
    return `Password minimal ${INVITE.passwordMin} karakter.`
  }
  if (new TextEncoder().encode(password).length > INVITE.passwordMax) {
    return `Password terlalu panjang (maksimal ${INVITE.passwordMax} karakter).`
  }
  if (password !== confirm) return 'Konfirmasi password nggak sama.'
  if (email && password.toLowerCase() === email.toLowerCase()) return 'Password nggak boleh sama dengan email.'
  if (/^(.)\1+$/.test(password)) return 'Password terlalu mudah ditebak.'
  return null
}

export type InviteState = 'ok' | 'activated' | 'revoked' | 'expired' | 'invalid'

export function inviteState(
  invite: { status: string; expires_at: string } | null | undefined,
  now: number = Date.now(),
): InviteState {
  if (!invite) return 'invalid'
  if (invite.status === 'activated') return 'activated'
  if (invite.status === 'revoked') return 'revoked'
  if (invite.status !== 'pending') return 'invalid'
  const exp = Date.parse(invite.expires_at)
  if (!Number.isFinite(exp) || exp <= now) return 'expired'
  return 'ok'
}

export const STATE_MESSAGE: Record<Exclude<InviteState, 'ok'>, string> = {
  invalid: 'Link aktivasi nggak valid. Pastikan kamu membukanya dari email undangan dengan lengkap.',
  activated: 'Undangan ini sudah dipakai. Silakan masuk dengan email dan password kamu.',
  revoked: 'Undangan ini sudah dicabut. Hubungi kami kalau kamu merasa ini keliru.',
  expired: 'Link aktivasi sudah kedaluwarsa. Minta undangan baru lewat balasan email.',
}

/** budi.santoso@gmail.com -> b***o@gmail.com (cukup untuk dikenali pemilik, tapi nggak membocorkan alamat penuh). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const head = local.slice(0, 1)
  const tail = local.length > 2 ? local.slice(-1) : ''
  return `${head}***${tail}@${domain}`
}

export const PLAN_LABEL: Record<string, string> = { addon: 'Addon', starter: 'Starter', pro: 'Pro' }

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

// Aturan aksi admin pada pengguna. Murni (tanpa jaringan/DB) supaya gampang dites. Dipakai server action di
// src/app/north/users/actions.ts, yang tetap harus memverifikasi bahwa pemanggilnya admin.

export const PLAN_OPTIONS = ['free', 'addon', 'starter', 'pro'] as const
export type PlanOption = (typeof PLAN_OPTIONS)[number]

export type AdminAction = 'change_plan' | 'reset_credits' | 'deactivate' | 'reactivate' | 'hard_delete'

export const ACTION_LABEL: Record<AdminAction, string> = {
  change_plan: 'ubah paket',
  reset_credits: 'reset kredit',
  deactivate: 'nonaktifkan akun',
  reactivate: 'aktifkan kembali akun',
  hard_delete: 'hapus permanen',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

export type ActionInput = {
  action: AdminAction
  actorId: string
  target: { id: string; email: string; role: string | null; deactivated: boolean }
  plan?: unknown
  confirmEmail?: unknown
}

/** null = boleh. Selain itu: pesan alasan penolakan untuk ditampilkan ke admin. */
export function checkAdminAction({ action, actorId, target, plan, confirmEmail }: ActionInput): string | null {
  if (!isUuid(target.id)) return 'ID pengguna tidak valid.'

  if (action === 'change_plan') {
    if (typeof plan !== 'string' || !(PLAN_OPTIONS as readonly string[]).includes(plan)) return 'Paket tidak valid.'
    return null
  }

  if (action === 'deactivate' || action === 'hard_delete') {
    if (target.id === actorId) return 'Kamu tidak bisa menonaktifkan atau menghapus akunmu sendiri.'
    if (target.role === 'admin') return 'Akun admin tidak bisa dinonaktifkan atau dihapus dari sini. Ubah rolenya dulu langsung di database.'
  }

  if (action === 'hard_delete') {
    if (!target.deactivated) return 'Nonaktifkan akun dulu. Hapus permanen hanya untuk akun yang sudah nonaktif.'
    if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== target.email.trim().toLowerCase()) {
      return 'Email konfirmasi tidak cocok. Ketik email akun persis untuk menghapus permanen.'
    }
  }

  if (action === 'reactivate' && !target.deactivated) return 'Akun ini sudah aktif.'

  return null
}

/** Lama blokir untuk "nonaktifkan" (sekitar 100 tahun, praktis permanen sampai diaktifkan kembali). */
export const BAN_DURATION = '876000h'

export function isBanned(bannedUntil: string | null | undefined, now: Date = new Date()): boolean {
  return !!bannedUntil && new Date(bannedUntil).getTime() > now.getTime()
}

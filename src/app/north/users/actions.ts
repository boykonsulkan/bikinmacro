'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser, serviceClient } from '@/lib/orders/server'
import { trackEvent } from '@/lib/events/server'
import { BAN_DURATION, checkAdminAction, isBanned } from '@/lib/admin/users'
import type { AdminAction } from '@/lib/admin/users'

export type ActionResult = { ok: boolean; message: string }

const fail = (message: string): ActionResult => ({ ok: false, message })

type Target = { id: string; email: string; role: string | null; plan: string; deactivated: boolean }

async function loadTarget(userId: string): Promise<Target | null> {
  const db = serviceClient()
  const { data: row } = await db.from('users').select('id, email, role, plan').eq('id', userId).maybeSingle()
  if (!row) return null
  const { data: au } = await db.auth.admin.getUserById(userId)
  return {
    id: row.id as string,
    email: row.email as string,
    role: (row.role as string | null) ?? null,
    plan: (row.plan as string | null) ?? 'free',
    deactivated: isBanned(au?.user?.banned_until),
  }
}

/** Semua aksi: harus admin, divalidasi aturan di lib/admin/users, dicatat sebagai kejadian admin_action. */
async function run(
  action: AdminAction,
  userId: string,
  extra: { plan?: unknown; confirmEmail?: unknown },
  exec: (target: Target, adminId: string) => Promise<ActionResult>,
): Promise<ActionResult> {
  const admin = await getAdminUser()
  if (!admin) return fail('Nggak punya akses.')

  const target = await loadTarget(userId)
  if (!target) return fail('Pengguna tidak ditemukan.')

  const refusal = checkAdminAction({ action, actorId: admin.id, target, ...extra })
  if (refusal) return fail(refusal)

  try {
    const result = await exec(target, admin.id)
    if (result.ok) {
      // Catatan jejak admin. user_id = admin (bukan target) supaya tetap ada setelah target dihapus permanen.
      await trackEvent(admin.id, 'admin_action', { action, target: target.email.slice(0, 80) })
      revalidatePath('/north/users')
    }
    return result
  } catch (e) {
    console.error(`Aksi admin ${action} gagal:`, e)
    return fail('Terjadi kesalahan di server. Coba lagi.')
  }
}

export async function changePlanAction(userId: string, plan: string): Promise<ActionResult> {
  return run('change_plan', userId, { plan }, async (t) => {
    const db = serviceClient()
    const { data: settings } = await db.from('plan_settings').select('credits_limit').eq('plan', plan).maybeSingle()
    const update: Record<string, unknown> = { plan }
    if (typeof settings?.credits_limit === 'number') update.credits_limit = settings.credits_limit
    const { error } = await db.from('users').update(update).eq('id', t.id)
    if (error) return fail('Gagal mengubah paket: ' + error.message)
    return { ok: true, message: `Paket ${t.email} sekarang ${plan}.` }
  })
}

export async function resetCreditsAction(userId: string): Promise<ActionResult> {
  return run('reset_credits', userId, {}, async (t) => {
    const { error } = await serviceClient().from('users').update({ credits_used: 0 }).eq('id', t.id)
    if (error) return fail('Gagal mereset kredit: ' + error.message)
    return { ok: true, message: `Kredit ${t.email} direset ke 0 terpakai.` }
  })
}

/** Soft delete: akun diblokir di Supabase Auth. Login baru ditolak dan sesi aktif langsung putus. Data tetap ada. */
export async function deactivateAction(userId: string): Promise<ActionResult> {
  return run('deactivate', userId, {}, async (t) => {
    const db = serviceClient()
    const { error } = await db.auth.admin.updateUserById(t.id, { ban_duration: BAN_DURATION })
    if (error) return fail('Gagal menonaktifkan: ' + error.message)
    return { ok: true, message: `${t.email} dinonaktifkan. Dia nggak bisa masuk lagi sampai kamu mengaktifkannya kembali.` }
  })
}

export async function reactivateAction(userId: string): Promise<ActionResult> {
  return run('reactivate', userId, {}, async (t) => {
    const { error } = await serviceClient().auth.admin.updateUserById(t.id, { ban_duration: 'none' })
    if (error) return fail('Gagal mengaktifkan kembali: ' + error.message)
    return { ok: true, message: `${t.email} aktif kembali.` }
  })
}

/**
 * Hapus permanen (hanya akun yang sudah nonaktif dan emailnya diketik ulang). Menghapus akun beserta semua datanya.
 * Catatan pembayaran TIDAK dihapus: dilepas dari akun (user_id dikosongkan) supaya pembukuan tetap utuh.
 */
export async function hardDeleteAction(userId: string, confirmEmail: string): Promise<ActionResult> {
  return run('hard_delete', userId, { confirmEmail }, async (t) => {
    const db = serviceClient()
    const email = t.email.toLowerCase()

    const detach = await db.from('payments').update({ user_id: null }).eq('user_id', t.id)
    if (detach.error) return fail('Gagal melepas catatan pembayaran: ' + detach.error.message)

    // Tabel tanpa foreign key ke akun. Gagal di sini (misalnya tabel belum ada) nggak menghentikan penghapusan.
    for (const table of ['events', 'ai_usage', 'ai_rejections']) {
      await db.from(table).delete().eq('user_id', t.id)
    }
    await db.from('beta_invites').delete().ilike('email', email)
    await db.from('email_logs').delete().ilike('to_email', email)
    // generation_chats, generations, feedback ikut terhapus lewat cascade saat baris users dihapus.

    const { error } = await db.auth.admin.deleteUser(t.id)
    if (error) return fail('Gagal menghapus akun: ' + error.message)

    const { data: left } = await db.from('users').select('id').eq('id', t.id).maybeSingle()
    if (left) return fail('Akun auth terhapus tapi baris pengguna masih ada. Cek database.')
    return { ok: true, message: `${t.email} dihapus permanen. Catatan pembayarannya dipertahankan tanpa tautan ke akun.` }
  })
}

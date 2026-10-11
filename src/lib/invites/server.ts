import 'server-only'
import { hashToken, newToken, serviceClient } from '@/lib/orders/server'
import { INVITE, inviteState, shouldSetPassword, shouldUpgrade } from './rules'
import type { InvitePlan, InviteState } from './rules'

const DAY = 24 * 60 * 60 * 1000

export type CreatedInvite = { email: string; url: string }

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://bikinmacro.my.id').replace(/\/+$/, '')
}

/**
 * Buat undangan baru untuk satu email. Undangan lama yang masih menunggu untuk email yang sama dicabut,
 * supaya hanya ada satu link aktif. Token di-return SEKALI; yang disimpan cuma hash-nya.
 * Token ditaruh di bagian # URL, jadi nggak pernah masuk log server atau header referer.
 */
export async function createInvite(email: string, plan: InvitePlan, adminId: string): Promise<{ ok: true; invite: CreatedInvite; id: string } | { ok: false; error: string }> {
  const db = serviceClient()
  const clean = email.trim().toLowerCase()

  await db.from('beta_invites').update({ status: 'revoked' }).ilike('email', clean.replace(/[\\%_]/g, '\\$&')).eq('status', 'pending')

  const token = newToken()
  const { data, error } = await db
    .from('beta_invites')
    .insert({
      email: clean,
      plan,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + INVITE.ttlDays * DAY).toISOString(),
      created_by: adminId,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: 'Undangan belum bisa dibuat.' }
  return { ok: true, id: data.id as string, invite: { email: clean, url: `${siteUrl()}/aktivasi#${token}` } }
}

export async function revokeInviteById(id: string) {
  await serviceClient().from('beta_invites').update({ status: 'revoked' }).eq('id', id).eq('status', 'pending')
}

export type InviteInfo = {
  state: InviteState
  email?: string
  plan?: string
  existing?: boolean
  /** Akun yang sudah ada berstatus admin: password-nya nggak akan diubah lewat undangan. */
  existingAdmin?: boolean
}

/** Cek undangan TANPA memakainya (dipakai halaman aktivasi untuk menampilkan form). */
export async function lookupInvite(token: string): Promise<InviteInfo> {
  if (!token || token.length > 200) return { state: 'invalid' }
  const { data } = await serviceClient()
    .from('beta_invites')
    .select('email, plan, status, expires_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  const state = inviteState(data)
  if (state !== 'ok' || !data) return { state }
  const { data: user } = await serviceClient()
    .from('users')
    .select('id, role')
    .ilike('email', (data.email as string).replace(/[\\%_]/g, '\\$&'))
    .maybeSingle()
  return { state, email: data.email as string, plan: data.plan as string, existing: !!user, existingAdmin: user?.role === 'admin' }
}

async function grantPlan(userId: string, plan: string) {
  const db = serviceClient()
  const { data: ps } = await db.from('plan_settings').select('credits_limit').eq('plan', plan).maybeSingle()
  const creditsLimit = (ps?.credits_limit as number | undefined) ?? (plan === 'pro' ? 999 : plan === 'starter' ? 20 : 5)
  const { error } = await db
    .from('users')
    .update({ plan, credits_limit: creditsLimit, reset_at: new Date(Date.now() + INVITE.benefitDays * DAY).toISOString() })
    .eq('id', userId)
  return !error
}

export type ActivateResult =
  | { ok: true; email: string; existing: boolean; /** True kalau password akun diatur lewat aktivasi ini. */ passwordSet: boolean }
  | { ok: false; error: string; state?: InviteState }

/**
 * Aktivasi: validasi token, "klaim" undangan (sekali pakai, aman dari klik ganda), buat akun dengan password pilihan
 * pengguna (email langsung terkonfirmasi, karena link membuktikan mereka pemilik email), lalu beri paket.
 * Kalau email sudah punya akun: paket dinaikkan (nggak pernah diturunkan) dan password diatur ulang ke pilihan pengguna
 * (link ini membuktikan mereka pemilik email, seperti link reset password). Akun admin nggak disentuh sama sekali.
 */
export async function activateInvite(token: string, password: string): Promise<ActivateResult> {
  if (!token || token.length > 200) return { ok: false, error: 'Link aktivasi nggak valid.', state: 'invalid' }
  const db = serviceClient()

  const { data: inv } = await db
    .from('beta_invites')
    .select('id, email, plan, status, expires_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  const state = inviteState(inv)
  if (state !== 'ok' || !inv) return { ok: false, error: 'Undangan nggak bisa dipakai.', state }

  // Klaim dulu: hanya satu permintaan yang menang kalau ada klik ganda atau dua tab.
  const { data: claimed } = await db
    .from('beta_invites')
    .update({ status: 'activated', activated_at: new Date().toISOString() })
    .eq('id', inv.id)
    .eq('status', 'pending')
    .select('id')
  if (!claimed || claimed.length === 0) return { ok: false, error: 'Undangan ini baru saja dipakai.', state: 'activated' }

  const release = async () => {
    await db.from('beta_invites').update({ status: 'pending', activated_at: null }).eq('id', inv.id)
  }

  const email = inv.email as string
  const plan = inv.plan as string

  const { data: existing } = await db
    .from('users')
    .select('id, role, plan')
    .ilike('email', email.replace(/[\\%_]/g, '\\$&'))
    .maybeSingle()

  if (existing) {
    // Link undangan membuktikan penerimanya pemilik email (seperti link reset password), jadi password akun biasa
    // diatur ulang ke pilihannya. Akun admin nggak disentuh. Password diatur DULU: kalau gagal, paket belum berubah.
    const setPassword = shouldSetPassword(existing.role as string)
    if (setPassword) {
      const { error: pwError } = await db.auth.admin.updateUserById(existing.id as string, { password, email_confirm: true })
      if (pwError) {
        await release()
        console.error('invite updateUserById failed', pwError.message)
        return { ok: false, error: 'Password belum bisa diatur. Coba lagi sebentar.' }
      }
    }
    if (shouldUpgrade(existing.plan as string, existing.role as string, plan)) {
      if (!(await grantPlan(existing.id as string, plan))) {
        await release()
        return { ok: false, error: 'Paket belum bisa diaktifkan. Coba lagi sebentar.' }
      }
    }
    await db.from('beta_invites').update({ activated_user_id: existing.id }).eq('id', inv.id)
    return { ok: true, email, existing: true, passwordSet: setPassword }
  }

  const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !created.user) {
    await release()
    console.error('invite createUser failed', error?.message)
    return { ok: false, error: 'Akun belum bisa dibuat. Coba lagi sebentar.' }
  }

  const userId = created.user.id
  // Baris profil dibuat trigger handle_new_user. Kalau belum ada (trigger belum terpasang), buat sendiri.
  const { data: profile } = await db.from('users').select('id').eq('id', userId).maybeSingle()
  if (!profile) await db.from('users').insert({ id: userId, email, role: 'user' })

  if (!(await grantPlan(userId, plan))) {
    await db.auth.admin.deleteUser(userId)
    await release()
    return { ok: false, error: 'Paket belum bisa diaktifkan. Coba lagi sebentar.' }
  }
  await db.from('beta_invites').update({ activated_user_id: userId }).eq('id', inv.id)
  return { ok: true, email, existing: false, passwordSet: true }
}

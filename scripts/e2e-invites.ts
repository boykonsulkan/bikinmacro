// Uji uji-tuntas alur undangan beta terhadap Supabase NYATA (service role dari .env.local).
// Membuat akun uji (alamat @example.com, nggak mengirim email apa pun), menjalankan aktivasi, login, dan
// jalur-jalur gagal, lalu MENGHAPUS semua yang dibuat (akun, profil, undangan), juga kalau tes gagal di tengah.
//
// Syarat: scripts/beta_invites_schema.sql sudah dijalankan.
// Pakai:  npx tsx scripts/e2e-invites.ts --confirm
import fs from 'node:fs'
import path from 'node:path'
import Module from 'node:module'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

if (!process.argv.includes('--confirm')) {
  console.log('Skrip ini membuat dan menghapus akun uji di Supabase milikmu. Jalankan lagi dengan --confirm.')
  process.exit(0)
}

// modul server memakai 'server-only', yang hanya valid di dalam Next. Di sini diganti modul kosong.
const original = (Module as unknown as { _resolveFilename: (...a: unknown[]) => string })._resolveFilename
;(Module as unknown as { _resolveFilename: (...a: unknown[]) => string })._resolveFilename = function (request: unknown, ...rest: unknown[]) {
  if (request === 'server-only') return path.join(__dirname, 'empty-module.cjs')
  return original.call(this, request, ...rest)
}
fs.writeFileSync(path.join(__dirname, 'empty-module.cjs'), 'module.exports = {}\n')

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]
    }),
) as Record<string, string>
Object.assign(process.env, env)

/* eslint-disable @typescript-eslint/no-require-imports */
const inv = require('../src/lib/invites/server') as typeof import('../src/lib/invites/server')
/* eslint-enable @typescript-eslint/no-require-imports */

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const stamp = Date.now()
const emails = { fresh: `beta-e2e-${stamp}@example.com`, existing: `beta-e2e-ada-${stamp}@example.com`, expired: `beta-e2e-exp-${stamp}@example.com` }
const createdUserIds: string[] = []
let passed = 0

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`PASS  ${name}`)
  } catch (e) {
    console.log(`FAIL  ${name}\n      ${(e as Error).message}`)
    process.exitCode = 1
  }
}

const tokenOf = (url: string) => url.split('#')[1]

async function main() {
  // Pakai GET biasa: query HEAD nggak melaporkan error untuk tabel yang hilang.
  const { error: tableError } = await db.from('beta_invites').select('id').limit(1)
  if (tableError) {
    console.log('Tabel beta_invites belum ada. Jalankan scripts/beta_invites_schema.sql di Supabase dulu.')
    process.exitCode = 1
    return
  }
  const { data: admin } = await db.from('users').select('id').eq('role', 'admin').limit(1).maybeSingle()
  const adminId = (admin?.id as string) ?? '00000000-0000-0000-0000-000000000000'
  const { data: ps } = await db.from('plan_settings').select('credits_limit').eq('plan', 'starter').maybeSingle()
  const starterCredits = (ps?.credits_limit as number | undefined) ?? 20
  const PASSWORD = 'Uji-Coba-Beta-2026!'

  let freshToken = ''
  let freshUserId = ''

  await step('buat undangan: link berisi token di bagian #, hanya hash yang tersimpan', async () => {
    const r = await inv.createInvite(emails.fresh, 'starter', adminId)
    assert.ok(r.ok)
    if (!r.ok) return
    freshToken = tokenOf(r.invite.url)
    assert.ok(r.invite.url.includes('/aktivasi#') && freshToken.length >= 30)
    const { data: row } = await db.from('beta_invites').select('token_hash, status').eq('id', r.id).single()
    assert.equal(row?.status, 'pending')
    assert.notEqual(row?.token_hash, freshToken, 'token mentah nggak boleh tersimpan')
    assert.match(String(row?.token_hash), /^[0-9a-f]{64}$/)
  })

  await step('lookup: ok, email baru (belum punya akun), TANPA memakai undangan', async () => {
    const info = await inv.lookupInvite(freshToken)
    assert.equal(info.state, 'ok')
    assert.equal(info.existing, false)
    assert.equal(info.plan, 'starter')
    assert.equal((await inv.lookupInvite(freshToken)).state, 'ok', 'lookup kedua masih ok: membuka link nggak menghanguskan')
  })

  await step('token salah, kosong, dan terlalu panjang ditolak', async () => {
    assert.equal((await inv.lookupInvite('salah-total')).state, 'invalid')
    assert.equal((await inv.lookupInvite('')).state, 'invalid')
    assert.equal((await inv.lookupInvite('x'.repeat(500))).state, 'invalid')
    const r = await inv.activateInvite('salah-total', PASSWORD)
    assert.ok(!r.ok)
  })

  await step('aktivasi: akun dibuat, email terkonfirmasi, paket starter menyala', async () => {
    const r = await inv.activateInvite(freshToken, PASSWORD)
    assert.ok(r.ok, JSON.stringify(r))
    if (!r.ok) return
    assert.equal(r.existing, false)
    const { data: u } = await db.from('users').select('id, plan, credits_limit, role, reset_at').ilike('email', emails.fresh).single()
    assert.ok(u, 'baris profil harus ada')
    freshUserId = u!.id as string
    createdUserIds.push(freshUserId)
    assert.equal(u!.plan, 'starter')
    assert.equal(u!.credits_limit, starterCredits)
    assert.equal(u!.role, 'user')
    assert.ok(Date.parse(String(u!.reset_at)) > Date.now() + 25 * 86_400_000, 'reset_at sekitar 30 hari ke depan')
    const { data: au } = await db.auth.admin.getUserById(freshUserId)
    assert.ok(au.user?.email_confirmed_at, 'email harus langsung terkonfirmasi')
  })

  await step('pengguna bisa LOGIN dengan password yang dia buat (bisa masuk lagi kapan pun)', async () => {
    const { data, error } = await anon.auth.signInWithPassword({ email: emails.fresh, password: PASSWORD })
    assert.ok(!error && data.session, error?.message)
    const bad = await anon.auth.signInWithPassword({ email: emails.fresh, password: 'password-salah-123' })
    assert.ok(bad.error, 'password salah harus ditolak')
  })

  await step('undangan sekali pakai: aktivasi kedua dan lookup kedua ditolak', async () => {
    const again = await inv.activateInvite(freshToken, PASSWORD)
    assert.ok(!again.ok && again.state === 'activated')
    assert.equal((await inv.lookupInvite(freshToken)).state, 'activated')
  })

  await step('klik ganda bersamaan: hanya satu yang menang, dan cuma satu akun yang ada', async () => {
    const r = await inv.createInvite(emails.existing, 'starter', adminId)
    assert.ok(r.ok)
    if (!r.ok) return
    const t = tokenOf(r.invite.url)
    const results = await Promise.all([inv.activateInvite(t, PASSWORD), inv.activateInvite(t, PASSWORD), inv.activateInvite(t, PASSWORD)])
    assert.equal(results.filter((x) => x.ok).length, 1, `harus tepat satu sukses, dapat ${results.filter((x) => x.ok).length}`)
    const { data: users } = await db.from('users').select('id').ilike('email', emails.existing)
    assert.equal(users?.length, 1)
    if (users?.[0]) createdUserIds.push(users[0].id as string)
  })

  await step('email yang sudah punya akun: paket naik, password lama nggak berubah, nggak pernah turun', async () => {
    const { data: u } = await db.from('users').select('id').ilike('email', emails.existing).single()
    const uid = u!.id as string
    await db.from('users').update({ plan: 'pro', credits_limit: 999 }).eq('id', uid)
    const r = await inv.createInvite(emails.existing, 'starter', adminId)
    assert.ok(r.ok)
    if (!r.ok) return
    const info = await inv.lookupInvite(tokenOf(r.invite.url))
    assert.equal(info.existing, true)
    const act = await inv.activateInvite(tokenOf(r.invite.url), 'password-lain-yang-nggak-dipakai')
    assert.ok(act.ok && act.existing)
    const { data: after } = await db.from('users').select('plan, credits_limit').eq('id', uid).single()
    assert.equal(after?.plan, 'pro', 'pelanggan Pro nggak boleh turun jadi starter')
    assert.equal(after?.credits_limit, 999)
    const login = await anon.auth.signInWithPassword({ email: emails.existing, password: PASSWORD })
    assert.ok(!login.error, 'password lama harus tetap berlaku')
  })

  await step('undangan baru untuk email yang sama mencabut yang lama', async () => {
    const a = await inv.createInvite(emails.expired, 'starter', adminId)
    const b = await inv.createInvite(emails.expired, 'starter', adminId)
    assert.ok(a.ok && b.ok)
    if (!a.ok || !b.ok) return
    assert.equal((await inv.lookupInvite(tokenOf(a.invite.url))).state, 'revoked')
    assert.equal((await inv.lookupInvite(tokenOf(b.invite.url))).state, 'ok')
    await inv.revokeInviteById(b.id)
    assert.equal((await inv.lookupInvite(tokenOf(b.invite.url))).state, 'revoked')
    const r = await inv.activateInvite(tokenOf(b.invite.url), PASSWORD)
    assert.ok(!r.ok && r.state === 'revoked')
  })

  await step('undangan kedaluwarsa ditolak dan nggak membuat akun', async () => {
    const r = await inv.createInvite(emails.expired, 'starter', adminId)
    assert.ok(r.ok)
    if (!r.ok) return
    await db.from('beta_invites').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', r.id)
    assert.equal((await inv.lookupInvite(tokenOf(r.invite.url))).state, 'expired')
    const act = await inv.activateInvite(tokenOf(r.invite.url), PASSWORD)
    assert.ok(!act.ok && act.state === 'expired')
    const { data: users } = await db.from('users').select('id').ilike('email', emails.expired)
    assert.equal(users?.length ?? 0, 0)
  })
}

async function cleanup() {
  for (const id of createdUserIds) await db.auth.admin.deleteUser(id).catch(() => undefined)
  for (const e of Object.values(emails)) {
    await db.from('beta_invites').delete().ilike('email', e)
    const { data: leftover } = await db.from('users').select('id').ilike('email', e)
    for (const u of leftover ?? []) {
      await db.auth.admin.deleteUser(u.id as string).catch(() => undefined)
      await db.from('users').delete().eq('id', u.id as string)
    }
  }
  fs.rmSync(path.join(__dirname, 'empty-module.cjs'), { force: true })
  const { data: check } = await db.from('users').select('id').like('email', `beta-e2e-%${stamp}@example.com`)
  console.log(`\nBersih-bersih selesai. Sisa data uji: ${check?.length ?? 0} akun.`)
}

main()
  .catch((e) => {
    console.log('Galat tak terduga:', (e as Error).message)
    process.exitCode = 1
  })
  .finally(async () => {
    await cleanup()
    console.log(`${passed} langkah lolos${process.exitCode ? ', ADA YANG GAGAL' : ''}`)
  })

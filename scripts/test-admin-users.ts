// Tes aturan aksi admin pada pengguna: npx tsx scripts/test-admin-users.ts
import assert from 'node:assert/strict'
import { BAN_DURATION, checkAdminAction, isBanned, isUuid } from '../src/lib/admin/users'
import type { ActionInput } from '../src/lib/admin/users'

let passed = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`PASS  ${name}`)
  } catch (e) {
    console.log(`FAIL  ${name}\n      ${(e as Error).message}`)
    process.exitCode = 1
  }
}

const ADMIN = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const target = (over: Partial<ActionInput['target']> = {}) => ({ id: USER, email: 'Tester@Example.com', role: 'user', deactivated: false, ...over })
const check = (over: Partial<ActionInput>) => checkAdminAction({ action: 'change_plan', actorId: ADMIN, target: target(), ...over })

test('ubah paket: hanya free, addon, starter, pro', () => {
  for (const p of ['free', 'addon', 'starter', 'pro']) assert.equal(check({ action: 'change_plan', plan: p }), null)
  for (const p of ['admin', 'PRO', '', undefined, 5, null]) assert.notEqual(check({ action: 'change_plan', plan: p }), null, String(p))
})
test('ID yang bukan UUID ditolak untuk semua aksi', () => {
  for (const action of ['change_plan', 'reset_credits', 'deactivate', 'reactivate', 'hard_delete'] as const) {
    assert.match(check({ action, plan: 'pro', target: target({ id: "1' or '1'='1" }) }) ?? '', /tidak valid/)
  }
  assert.ok(isUuid(USER) && !isUuid('abc') && !isUuid(undefined))
})
test('nonaktifkan: tidak bisa diri sendiri', () => {
  assert.match(check({ action: 'deactivate', target: target({ id: ADMIN }) }) ?? '', /akunmu sendiri/)
})
test('nonaktifkan dan hapus: tidak bisa pada akun admin lain', () => {
  assert.match(check({ action: 'deactivate', target: target({ role: 'admin' }) }) ?? '', /admin/i)
  assert.match(check({ action: 'hard_delete', target: target({ role: 'admin', deactivated: true }), confirmEmail: 'tester@example.com' }) ?? '', /admin/i)
})
test('nonaktifkan pengguna biasa: boleh', () => {
  assert.equal(check({ action: 'deactivate' }), null)
})
test('aktifkan kembali: hanya untuk akun yang memang nonaktif', () => {
  assert.equal(check({ action: 'reactivate', target: target({ deactivated: true }) }), null)
  assert.match(check({ action: 'reactivate' }) ?? '', /sudah aktif/)
})
test('hapus permanen: ditolak kalau akun belum dinonaktifkan', () => {
  assert.match(check({ action: 'hard_delete', confirmEmail: 'tester@example.com' }) ?? '', /Nonaktifkan akun dulu/)
})
test('hapus permanen: email konfirmasi harus cocok (tanpa peduli huruf besar dan spasi)', () => {
  const t = target({ deactivated: true })
  assert.equal(check({ action: 'hard_delete', target: t, confirmEmail: '  tester@example.COM ' }), null)
  for (const bad of ['', 'tester@example', 'lain@example.com', undefined, null, 42]) {
    assert.match(check({ action: 'hard_delete', target: t, confirmEmail: bad }) ?? '', /konfirmasi/i, String(bad))
  }
})
test('hapus permanen: tidak bisa diri sendiri walau sudah nonaktif', () => {
  assert.match(check({ action: 'hard_delete', target: target({ id: ADMIN, deactivated: true }), confirmEmail: 'tester@example.com' }) ?? '', /akunmu sendiri/)
})
test('reset kredit: boleh untuk siapa pun, termasuk admin', () => {
  assert.equal(check({ action: 'reset_credits', target: target({ role: 'admin' }) }), null)
})
test('isBanned: masa depan = nonaktif, lampau atau kosong = aktif', () => {
  const now = new Date('2026-10-12T00:00:00Z')
  assert.equal(isBanned('2126-09-18T04:42:14Z', now), true)
  assert.equal(isBanned('2026-10-11T00:00:00Z', now), false)
  assert.equal(isBanned(null, now), false)
  assert.equal(isBanned(undefined, now), false)
})
test('lama blokir sangat panjang (praktis permanen sampai diaktifkan kembali)', () => {
  assert.ok(Number(BAN_DURATION.replace('h', '')) > 24 * 365 * 50)
})

console.log(`\n${passed} tes lolos`)

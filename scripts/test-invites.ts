// Tes aturan undangan beta (murni, tanpa jaringan/DB). Pakai:  npx tsx scripts/test-invites.ts
import assert from 'node:assert/strict'
import {
  INVITE,
  STATE_MESSAGE,
  inviteState,
  isInvitePlan,
  PURCHASE_BLOCK_MESSAGE,
  maskEmail,
  purchaseState,
  shouldSetPassword,
  shouldUpgrade,
  validatePassword,
} from '../src/lib/invites/rules'

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

const NOW = Date.parse('2026-10-12T00:00:00Z')
const future = new Date(NOW + 86_400_000).toISOString()
const past = new Date(NOW - 1000).toISOString()

test('password valid diterima', () => {
  assert.equal(validatePassword('Rahasia123', 'Rahasia123', 'budi@x.com'), null)
  assert.equal(validatePassword('a'.repeat(INVITE.passwordMin), 'a'.repeat(INVITE.passwordMin)), 'Password terlalu mudah ditebak.')
  assert.equal(validatePassword('abcdefgh', 'abcdefgh'), null)
})
test('password: terlalu pendek, konfirmasi beda, sama dengan email, terlalu panjang ditolak', () => {
  assert.ok(validatePassword('pendek1', 'pendek1'))
  assert.ok(validatePassword('Rahasia123', 'Rahasia124'))
  assert.ok(validatePassword('budi@x.com', 'budi@x.com', 'budi@x.com'))
  assert.ok(validatePassword('BUDI@X.COM', 'BUDI@X.COM', 'budi@x.com'))
  assert.ok(validatePassword('x1'.repeat(40), 'x1'.repeat(40))) // 80 karakter > 72
  assert.ok(validatePassword(undefined, undefined))
  assert.ok(validatePassword(12345678, 12345678))
})
test('password dengan karakter multi-byte dihitung per byte (batas bcrypt 72)', () => {
  const emoji = 'abé'.repeat(30) // 3 karakter, 4 byte per ulangan = 120 byte
  assert.ok(validatePassword(emoji, emoji))
})
test('inviteState: menunggu yang masih berlaku = ok', () => {
  assert.equal(inviteState({ status: 'pending', expires_at: future }, NOW), 'ok')
})
test('inviteState: kedaluwarsa, sudah dipakai, dicabut, nggak ada, status aneh, tanggal rusak', () => {
  assert.equal(inviteState({ status: 'pending', expires_at: past }, NOW), 'expired')
  assert.equal(inviteState({ status: 'pending', expires_at: new Date(NOW).toISOString() }, NOW), 'expired') // tepat saat kedaluwarsa
  assert.equal(inviteState({ status: 'activated', expires_at: future }, NOW), 'activated')
  assert.equal(inviteState({ status: 'activated', expires_at: past }, NOW), 'activated')
  assert.equal(inviteState({ status: 'revoked', expires_at: future }, NOW), 'revoked')
  assert.equal(inviteState(null, NOW), 'invalid')
  assert.equal(inviteState(undefined, NOW), 'invalid')
  assert.equal(inviteState({ status: 'hacked', expires_at: future }, NOW), 'invalid')
  assert.equal(inviteState({ status: 'pending', expires_at: 'bukan-tanggal' }, NOW), 'expired')
})
test('shouldUpgrade: hanya menaikkan, nggak pernah menurunkan, admin nggak disentuh', () => {
  assert.equal(shouldUpgrade('free', 'user', 'starter'), true)
  assert.equal(shouldUpgrade(null, 'user', 'starter'), true)
  assert.equal(shouldUpgrade('addon', 'user', 'starter'), true)
  assert.equal(shouldUpgrade('starter', 'user', 'starter'), false)
  assert.equal(shouldUpgrade('pro', 'user', 'starter'), false) // pelanggan Pro nggak boleh turun
  assert.equal(shouldUpgrade('starter', 'user', 'addon'), false)
  assert.equal(shouldUpgrade('free', 'admin', 'pro'), false)
  assert.equal(shouldUpgrade('free', 'user', 'tidak-ada'), false)
})
test('purchaseState: cuma paket di atas paket sekarang yang bisa dibeli (kasus Starter: addon dan starter abu-abu)', () => {
  // pengguna Starter
  assert.equal(purchaseState('starter', 'user', 'addon'), 'included')
  assert.equal(purchaseState('starter', 'user', 'starter'), 'current')
  assert.equal(purchaseState('starter', 'user', 'pro'), 'available')
  // pengguna Pro: semuanya terkunci
  assert.deepEqual(['addon', 'starter', 'pro'].map((p) => purchaseState('pro', 'user', p)), ['included', 'included', 'current'])
  // pengguna free atau belum punya paket: semuanya terbuka
  assert.deepEqual(['addon', 'starter', 'pro'].map((p) => purchaseState('free', 'user', p)), ['available', 'available', 'available'])
  assert.deepEqual(['addon', 'starter', 'pro'].map((p) => purchaseState(null, null, p)), ['available', 'available', 'available'])
  // pengguna Addon: addon terkunci, starter dan pro terbuka
  assert.deepEqual(['addon', 'starter', 'pro'].map((p) => purchaseState('addon', 'user', p)), ['current', 'available', 'available'])
})
test('purchaseState: admin selalu bisa membeli (untuk menguji pembayaran), dan paket asing nggak dianggap bisa dibeli', () => {
  for (const plan of ['free', 'addon', 'starter', 'pro']) {
    for (const card of ['addon', 'starter', 'pro']) assert.equal(purchaseState(plan, 'admin', card), 'available')
  }
  assert.notEqual(purchaseState('starter', 'user', 'paket-ngawur'), 'available')
  assert.ok(PURCHASE_BLOCK_MESSAGE.current.length > 10 && PURCHASE_BLOCK_MESSAGE.included.length > 10)
  assert.ok(!/[–—]/.test(PURCHASE_BLOCK_MESSAGE.current + PURCHASE_BLOCK_MESSAGE.included))
})
test('shouldSetPassword: akun biasa boleh diatur ulang lewat undangan, admin TIDAK', () => {
  assert.equal(shouldSetPassword('user'), true)
  assert.equal(shouldSetPassword(null), true)
  assert.equal(shouldSetPassword(undefined), true)
  assert.equal(shouldSetPassword('admin'), false)
})
test('isInvitePlan hanya menerima paket yang diizinkan', () => {
  for (const p of INVITE.plans) assert.ok(isInvitePlan(p))
  for (const p of ['free', 'admin', '', undefined, null, 'STARTER', 'starter ']) assert.ok(!isInvitePlan(p), String(p))
})
test('maskEmail menyamarkan tanpa membocorkan alamat penuh', () => {
  assert.equal(maskEmail('budi.santoso@gmail.com'), 'b***o@gmail.com')
  assert.equal(maskEmail('ab@x.id'), 'a***@x.id')
  assert.equal(maskEmail('a@x.id'), 'a***@x.id')
  assert.equal(maskEmail('tanpa-at'), '***')
})
test('pesan status jelas dan tanpa em dash atau en dash', () => {
  for (const m of Object.values(STATE_MESSAGE)) {
    assert.ok(m.length > 20)
    assert.ok(!/[–—]/.test(m))
  }
})
test('batas undangan masuk akal', () => {
  assert.equal(INVITE.ttlDays, 14)
  assert.ok(INVITE.passwordMin >= 8 && INVITE.passwordMax === 72)
  assert.equal(INVITE.defaultPlan, 'starter')
})

console.log(`\n${passed} tes lolos`)

// Tes helper Midtrans (murni, tanpa jaringan dan tanpa key asli).
// Pakai:  npx tsx scripts/test-midtrans.ts
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { SNAP_PRODUCTION_URL, SNAP_SANDBOX_URL, checkKeys, describeKey, snapScriptUrl } from '../src/lib/midtrans/keys'
import { notificationOutcome, verifyNotificationSignature } from '../src/lib/midtrans/notification'

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

const SB_SERVER = 'SB-Mid-server-abcdef1234567890'
const SB_CLIENT = 'SB-Mid-client-abcdef1234567890'
const PROD_SERVER = 'Mid-server-abcdef1234567890'
const PROD_CLIENT = 'Mid-client-abcdef1234567890'

test('key produksi dikenali sebagai produksi', () => {
  assert.deepEqual(checkKeys(PROD_SERVER, PROD_CLIENT), { ok: true, production: true })
})
test('key sandbox dikenali sebagai sandbox', () => {
  assert.deepEqual(checkKeys(SB_SERVER, SB_CLIENT), { ok: true, production: false })
})
test('server dan client beda lingkungan ditolak (kasus yang bikin gagal sebelumnya)', () => {
  assert.equal(checkKeys(PROD_SERVER, SB_CLIENT).ok, false)
  assert.equal(checkKeys(SB_SERVER, PROD_CLIENT).ok, false)
})
test('kosong, placeholder, dan salah jenis ditolak', () => {
  for (const [s, c] of [
    [undefined, PROD_CLIENT],
    [PROD_SERVER, undefined],
    ['your_midtrans_server_key_here', PROD_CLIENT],
    [PROD_SERVER, 'your_midtrans_client_key_here'],
    [PROD_CLIENT, PROD_SERVER], // tertukar
    ['', ''],
  ] as const) {
    assert.equal(checkKeys(s, c).ok, false, `harusnya ditolak: ${s} / ${c}`)
  }
})
test('describeKey: jenis key tanpa membuka isinya', () => {
  assert.equal(describeKey(PROD_SERVER, 'server'), 'produksi')
  assert.equal(describeKey(SB_SERVER, 'server'), 'sandbox')
  assert.equal(describeKey(PROD_CLIENT, 'client'), 'produksi')
  assert.equal(describeKey(SB_CLIENT, 'client'), 'sandbox')
  assert.equal(describeKey(undefined, 'server'), 'kosong')
  assert.equal(describeKey('  ', 'client'), 'kosong')
  assert.equal(describeKey('your_midtrans_server_key_here', 'server'), 'placeholder')
  assert.equal(describeKey(PROD_CLIENT, 'server'), 'tidak dikenal') // peran tertukar
  assert.equal(describeKey('abc123', 'server'), 'tidak dikenal')
})
test('URL snap.js mengikuti client key', () => {
  assert.equal(snapScriptUrl(PROD_CLIENT), SNAP_PRODUCTION_URL)
  assert.equal(snapScriptUrl(SB_CLIENT), SNAP_SANDBOX_URL)
  assert.equal(snapScriptUrl(undefined), SNAP_PRODUCTION_URL)
})

const sign = (o: string, sc: string, g: string, key: string) => createHash('sha512').update(`${o}${sc}${g}${key}`).digest('hex')
const base = { order_id: 'BM-abc-123', status_code: '200', gross_amount: '25000.00' }

test('tanda tangan valid diterima', () => {
  assert.equal(verifyNotificationSignature({ ...base, signature_key: sign(base.order_id, base.status_code, base.gross_amount, PROD_SERVER) }, PROD_SERVER), true)
})
test('tanda tangan salah, key beda, atau data diubah ditolak', () => {
  const good = sign(base.order_id, base.status_code, base.gross_amount, PROD_SERVER)
  assert.equal(verifyNotificationSignature({ ...base, signature_key: 'x'.repeat(128) }, PROD_SERVER), false)
  assert.equal(verifyNotificationSignature({ ...base, signature_key: good }, 'Mid-server-lain'), false)
  assert.equal(verifyNotificationSignature({ ...base, gross_amount: '1000.00', signature_key: good }, PROD_SERVER), false)
})
test('server key kosong atau field hilang SELALU ditolak (dulu verifikasi dilewati)', () => {
  const sig = sign(base.order_id, base.status_code, base.gross_amount, '')
  assert.equal(verifyNotificationSignature({ ...base, signature_key: sig }, ''), false)
  assert.equal(verifyNotificationSignature({ order_id: 'x' }, PROD_SERVER), false)
  assert.equal(verifyNotificationSignature({ ...base, signature_key: 123 }, PROD_SERVER), false)
  assert.equal(verifyNotificationSignature({}, PROD_SERVER), false)
})
test('settlement dan capture-accept dihitung lunas', () => {
  assert.equal(notificationOutcome('settlement'), 'paid')
  assert.equal(notificationOutcome('capture', 'accept'), 'paid')
  assert.equal(notificationOutcome('capture'), 'paid')
})
test('capture challenge ditahan, capture deny gagal', () => {
  assert.equal(notificationOutcome('capture', 'challenge'), 'pending')
  assert.equal(notificationOutcome('capture', 'deny'), 'failed')
})
test('deny, cancel, expire, failure gagal; pending dan lainnya belum lunas', () => {
  for (const s of ['deny', 'cancel', 'expire', 'failure']) assert.equal(notificationOutcome(s), 'failed')
  for (const s of ['pending', 'authorize', 'refund', 'chargeback', undefined, 'apa-saja']) assert.equal(notificationOutcome(s), 'pending')
})

console.log(`\n${passed} tes lolos`)

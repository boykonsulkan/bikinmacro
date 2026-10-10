// Tes validasi pesanan (murni, tanpa database).
// Pakai:  npx tsx scripts/test-orders-validate.ts
import assert from 'node:assert/strict'
import { ORDER_LIMITS, planTotals } from '../src/lib/orders/config'
import { safeFileName, validateMessage, validateOrderInput, validateSampleFile } from '../src/lib/orders/validate'

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

const good = {
  email: '  Budi@Perusahaan.CO.id ',
  plan: 'output_1',
  midtransOrderId: 'ORDER-12345',
  description: 'Gabungin 20 file penjualan cabang jadi satu sheet dan hitung komisi tiap sales.',
}
const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0])

test('pesanan valid dinormalkan (email huruf kecil dan dirapikan)', () => {
  const r = validateOrderInput(good)
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.value.email, 'budi@perusahaan.co.id')
})
test('email jelek ditolak', () => {
  for (const email of ['', 'budi', 'budi@', 'budi@x', 'a b@c.com']) {
    const r = validateOrderInput({ ...good, email })
    assert.ok(!r.ok && r.errors.email, `email "${email}" harusnya ditolak`)
  }
})
test('paket di luar daftar ditolak', () => {
  for (const plan of ['', 'gratis', 'output_99', undefined, 1]) {
    const r = validateOrderInput({ ...good, plan })
    assert.ok(!r.ok && r.errors.plan)
  }
})
test('nomor order: terlalu pendek, karakter aneh, dan terlalu panjang ditolak', () => {
  for (const midtransOrderId of ['ab', '<script>', "x'; drop table orders;--", 'a'.repeat(101)]) {
    const r = validateOrderInput({ ...good, midtransOrderId })
    assert.ok(!r.ok && r.errors.midtransOrderId, `"${midtransOrderId}" harusnya ditolak`)
  }
  assert.ok(validateOrderInput({ ...good, midtransOrderId: 'PL-6a89b99f/abc: 1' }).ok)
})
test('cerita kerjaan: batas bawah dan atas', () => {
  assert.ok(!validateOrderInput({ ...good, description: 'terlalu pendek' }).ok)
  assert.ok(!validateOrderInput({ ...good, description: 'x'.repeat(ORDER_LIMITS.description.max + 1) }).ok)
  assert.ok(validateOrderInput({ ...good, description: 'x'.repeat(ORDER_LIMITS.description.max) }).ok)
})
test('nilai bukan string ditolak tanpa error', () => {
  const r = validateOrderInput({ email: null, plan: {}, midtransOrderId: 5, description: [] })
  assert.ok(!r.ok && Object.keys(r.errors).length === 4)
})
test('file contoh valid', () => {
  assert.equal(validateSampleFile('contoh.xlsx', 1000, zip), null)
})
test('file contoh: ekstensi, ukuran, dan isi palsu ditolak', () => {
  assert.ok(validateSampleFile('contoh.xls', 1000, zip))
  assert.ok(validateSampleFile('contoh.xlsm', 1000, zip))
  assert.ok(validateSampleFile('contoh.xlsx', 0, zip))
  assert.ok(validateSampleFile('contoh.xlsx', ORDER_LIMITS.sampleFileMaxBytes + 1, zip))
  assert.ok(validateSampleFile('contoh.xlsx', 1000, new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))) // exe
  assert.ok(validateSampleFile('contoh.xlsx', 1000, new Uint8Array([0x50, 0x4b])))
})
test('pesan chat: kosong, spasi saja, terlalu panjang ditolak', () => {
  assert.ok(!validateMessage('').ok)
  assert.ok(!validateMessage('   \n ').ok)
  assert.ok(!validateMessage(undefined).ok)
  assert.ok(!validateMessage('x'.repeat(ORDER_LIMITS.message.max + 1)).ok)
  const ok = validateMessage('  tolong tambah kolom total  ')
  assert.ok(ok.ok && ok.value === 'tolong tambah kolom total')
})
test('nama file dibersihkan dari path dan karakter berbahaya', () => {
  assert.equal(safeFileName('C:\\Users\\boy\\laporan penjualan.xlsx'), 'laporan_penjualan.xlsx')
  assert.equal(safeFileName('../../etc/passwd'), 'passwd')
  assert.equal(safeFileName('<script>alert(1)</script>.xlsx'), 'script.xlsx') // dipotong di '/' seperti path
  assert.equal(safeFileName('a<b>c"d.xlsx'), 'abcd.xlsx')
  assert.equal(safeFileName('...'), 'file')
  assert.equal(safeFileName('a'.repeat(200) + '.xlsx').length, 80)
})
test('total output dan revisi per paket', () => {
  assert.deepEqual(planTotals('output_1'), { outputs: 1, revisions: 3 })
  assert.deepEqual(planTotals('output_3'), { outputs: 3, revisions: 15 })
})

console.log(`\n${passed} tes lolos`)

// Tes aturan dan email "lupa password": npx tsx scripts/test-password-reset.ts
import './shim-server-only'
import assert from 'node:assert/strict'
import { RESET, RESET_NEUTRAL_MESSAGE, RESET_FOOTER, buildResetEmail, isPlausibleToken, normalizeEmail, resetUrl } from '../src/lib/auth/reset'

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

const TOKEN = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6'

test('email dinormalkan: huruf kecil dan tanpa spasi', () => {
  assert.equal(normalizeEmail('  Boy@Example.COM '), 'boy@example.com')
})
test('email tidak valid ditolak', () => {
  for (const bad of ['', 'a', 'tanpa-at.com', 'a@b', 'spasi di@dalam.com', null, undefined, 42, 'x'.repeat(260) + '@a.id']) {
    assert.equal(normalizeEmail(bad), null, String(bad))
  }
})
test('token masuk akal: huruf, angka, strip, garis bawah, panjang wajar', () => {
  assert.ok(isPlausibleToken(TOKEN) && isPlausibleToken('abc_DEF-1234567890'))
  for (const bad of ['', 'pendek', 'ada spasi di sini 1234567890', "x'; drop table users;--1234567890", '../../etc/passwd1234567890', 'a'.repeat(300), null, undefined, 5]) {
    assert.equal(isPlausibleToken(bad), false, String(bad))
  }
})
test('tautan menaruh token di fragment (#), bukan di query', () => {
  const url = resetUrl('https://bikinmacro.my.id/', TOKEN)
  assert.equal(url, `https://bikinmacro.my.id/auth/reset#t=${TOKEN}`)
  assert.ok(!url.includes('?'))
})
test('email: subjek polos tanpa token, token hanya di tautan tombol', () => {
  const m = buildResetEmail('https://bikinmacro.my.id', TOKEN)
  assert.equal(m.subject, 'Atur ulang password BikinMacro')
  assert.ok(!m.subject.includes(TOKEN))
  assert.ok(m.html.includes(`https://bikinmacro.my.id/auth/reset#t=${TOKEN}`))
  assert.ok(m.text.includes(`Atur ulang password: https://bikinmacro.my.id/auth/reset#t=${TOKEN}`))
})
test('email: menyebut masa berlaku, sekali pakai, perangkat lain keluar, dan abaikan kalau bukan kamu', () => {
  const m = buildResetEmail('https://bikinmacro.my.id', TOKEN)
  assert.ok(m.text.includes(RESET.ttlLabel) && /sekali/.test(m.text) && /perangkat lain/.test(m.text) && /abaikan/i.test(m.text))
})
test('email: kaki email khusus sistem, BUKAN kalimat undangan beta', () => {
  const m = buildResetEmail('https://bikinmacro.my.id', TOKEN)
  assert.ok(m.text.includes(RESET_FOOTER))
  assert.ok(!/mengundangmu/.test(m.text) && !/mengundangmu/.test(m.html))
})
test('email: tanpa em dash atau en dash dan tanpa sapaan nama kosong aneh', () => {
  const m = buildResetEmail('https://bikinmacro.my.id', TOKEN)
  assert.ok(!/[\u2013\u2014]/.test(m.text + m.html))
  assert.ok(m.text.startsWith('Halo,'))
})
test('jawaban netral nggak memuat kata yang membocorkan status akun', () => {
  assert.ok(/kalau email itu terdaftar/i.test(RESET_NEUTRAL_MESSAGE))
  assert.ok(!/tidak ditemukan|nggak ditemukan|belum terdaftar/i.test(RESET_NEUTRAL_MESSAGE))
})
test('batas: token 1 jam, 3 per email, respons minimum cukup untuk meratakan waktu', () => {
  assert.equal(RESET.ttlLabel, '1 jam')
  assert.equal(RESET.perEmailPerHour, 3)
  assert.ok(RESET.minResponseMs >= 1000)
})

console.log(`\n${passed} tes lolos`)

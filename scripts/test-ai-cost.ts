// Tes perhitungan biaya AI: npx tsx scripts/test-ai-cost.ts
import assert from 'node:assert/strict'
import { AI_BUDGET, budgetLevel, estimateCostUsd, monthStartIso, priceFor, summarizeUsage, wibDay } from '../src/lib/ai/cost'
import type { UsageRow } from '../src/lib/ai/cost'

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
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('biaya gpt-4o-mini: 1 juta token masuk = 0,15 USD, keluar = 0,60 USD', () => {
  close(estimateCostUsd('openai/gpt-4o-mini', 1_000_000, 0), 0.15)
  close(estimateCostUsd('openai/gpt-4o-mini', 0, 1_000_000), 0.6)
})
test('satu generate tipikal (700 masuk, 1500 keluar) sekitar Rp16', () => {
  const idr = estimateCostUsd('openai/gpt-4o-mini', 700, 1500) * AI_BUDGET.usdToIdr
  assert.ok(idr > 10 && idr < 25, String(idr))
})
test('model yang nggak dikenal dihitung mahal (konservatif), bukan nol', () => {
  assert.ok(priceFor('model-baru-entah-apa').in >= 3)
  assert.ok(estimateCostUsd('model-baru-entah-apa', 1000, 1000) > estimateCostUsd('openai/gpt-4o-mini', 1000, 1000))
})
test('token negatif atau kosong tidak menghasilkan biaya negatif', () => {
  assert.equal(estimateCostUsd('openai/gpt-4o-mini', -5, -5), 0)
  assert.equal(estimateCostUsd('openai/gpt-4o-mini', 0, 0), 0)
})
test('anggaran aplikasi lebih rendah dari batas keras penyedia (aplikasi berhenti lebih dulu)', () => {
  assert.ok(AI_BUDGET.monthlyUsd < AI_BUDGET.providerCapUsd)
})
test('level anggaran: aman, peringatan, habis', () => {
  assert.equal(budgetLevel(0), 'ok')
  assert.equal(budgetLevel(AI_BUDGET.monthlyUsd * AI_BUDGET.warnRatio), 'warn')
  assert.equal(budgetLevel(AI_BUDGET.monthlyUsd), 'exceeded')
  assert.equal(budgetLevel(AI_BUDGET.monthlyUsd + 1), 'exceeded')
})
test('hari dan awal bulan memakai WIB (UTC+7)', () => {
  assert.equal(wibDay('2026-10-12T18:00:00Z'), '2026-10-13') // 01.00 WIB hari berikutnya
  assert.equal(wibDay('2026-10-12T16:59:00Z'), '2026-10-12')
  assert.equal(monthStartIso(new Date('2026-10-12T05:00:00Z')), '2026-09-30T17:00:00.000Z') // 1 Okt 00.00 WIB
  assert.equal(monthStartIso(new Date('2026-09-30T18:00:00Z')), '2026-09-30T17:00:00.000Z') // sudah 1 Okt WIB
})

const now = new Date('2026-10-12T05:00:00Z')
const row = (over: Partial<UsageRow>): UsageRow => ({
  user_id: 'u1', created_at: '2026-10-12T04:00:00Z', kind: 'generate', provider: 'openrouter', model: 'openai/gpt-4o-mini', input_tokens: 1000, output_tokens: 1000, ...over,
})
test('ringkasan: bulan ini, hari ini, dan 7 hari dipisah dengan benar', () => {
  const rows = [
    row({}), // hari ini
    row({ created_at: '2026-10-08T04:00:00Z' }), // 4 hari lalu, bulan ini
    row({ created_at: '2026-10-01T04:00:00Z' }), // bulan ini, di luar 7 hari
    row({ created_at: '2026-09-20T04:00:00Z' }), // bulan lalu
  ]
  const s = summarizeUsage(rows, now)
  const one = estimateCostUsd('openai/gpt-4o-mini', 1000, 1000)
  close(s.todayUsd, one)
  close(s.last7Usd, one * 2)
  close(s.monthUsd, one * 3)
  assert.equal(s.monthCalls, 3)
})
test('ringkasan: rata-rata per macro hanya menghitung generate, bukan chat', () => {
  const s = summarizeUsage([row({}), row({ kind: 'chat', output_tokens: 100000 })], now)
  assert.equal(s.generateCalls, 1)
  close(s.avgUsdPerGenerate, estimateCostUsd('openai/gpt-4o-mini', 1000, 1000))
})
test('ringkasan: per model dan per pengguna diurutkan dari yang termahal', () => {
  const s = summarizeUsage([row({ user_id: 'a' }), row({ user_id: 'b', input_tokens: 90000, output_tokens: 90000 }), row({ user_id: 'b', model: 'x-baru', input_tokens: 90000, output_tokens: 90000 })], now)
  assert.equal(s.perUser[0].userId, 'b')
  assert.equal(s.perModel[0].model, 'x-baru')
  assert.equal(s.perModel.find((m) => m.model === 'x-baru')?.known, false)
})
test('ringkasan: 14 hari selalu lengkap walau kosong, urut dari terlama', () => {
  const s = summarizeUsage([], now)
  assert.equal(s.perDay.length, 14)
  assert.equal(s.perDay[13].date, '2026-10-12')
  assert.equal(s.perDay[0].date, '2026-09-29')
  assert.equal(s.monthUsd, 0)
  assert.equal(s.level, 'ok')
  assert.equal(s.avgUsdPerGenerate, 0)
})
test('ringkasan: pemakaian besar memicu level exceeded', () => {
  const big = Array.from({ length: 40 }, () => row({ input_tokens: 5_000_000, output_tokens: 5_000_000 }))
  assert.equal(summarizeUsage(big, now).level, 'exceeded')
})

console.log(`\n${passed} tes lolos`)

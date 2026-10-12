// Tes pengaman kuota dan laju: npx tsx scripts/test-security.ts
// Mengimpor reserveCredit lewat jalur relatif; modul 'server-only' dilewati lewat alias di bawah.
import assert from 'node:assert/strict'
import Module from 'node:module'

// 'server-only' melempar galat di luar bundler Next. Untuk tes, anggap kosong.
const origResolve = (Module as unknown as { _resolveFilename: (...a: unknown[]) => string })._resolveFilename
;(Module as unknown as { _resolveFilename: (...a: unknown[]) => string })._resolveFilename = function (request: unknown, ...rest: unknown[]) {
  if (request === 'server-only') return require.resolve('./empty-module.cjs')
  return origResolve.call(this, request, ...rest)
}

let passed = 0
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    passed++
    console.log(`PASS  ${name}`)
  } catch (e) {
    console.log(`FAIL  ${name}\n      ${(e as Error).message}`)
    process.exitCode = 1
  }
}

type Row = { id: string; credits_used: number }
/** DB palsu minimal yang meniru compare-and-swap: update hanya berlaku kalau semua filter .eq cocok. */
function fakeDb(initial: number) {
  const row: Row = { id: 'u1', credits_used: initial }
  const tick = () => new Promise<void>((r) => setImmediate(r))
  const from = () => {
    let patch: Partial<Row> | null = null
    const filters: [keyof Row, unknown][] = []
    const matches = () => filters.every(([k, v]) => row[k] === v)
    const builder = {
      select: () => builder,
      update: (p: Partial<Row>) => {
        patch = p
        return builder
      },
      eq: (k: keyof Row, v: unknown) => {
        filters.push([k, v])
        return builder
      },
      single: async () => {
        await tick()
        return { data: matches() ? { credits_used: row.credits_used } : null }
      },
      then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
        (async () => {
          await tick()
          if (patch && matches()) {
            Object.assign(row, patch)
            return { data: [{ credits_used: row.credits_used }] }
          }
          return { data: [] }
        })().then(ok, bad),
    }
    return builder
  }
  return { row, db: { from } as never }
}

async function main() {
  const { reserveCredit } = await import('../src/lib/ai/server')
  const { rateLimit, resetRateLimits } = await import('../src/lib/rate')

  await test('kuota 3, lima permintaan PARALEL: tepat 3 yang lolos, tidak lebih', async () => {
    const { row, db } = fakeDb(0)
    const results = await Promise.all(Array.from({ length: 5 }, () => reserveCredit('u1', 3, db)))
    assert.equal(results.filter((r) => r.ok).length, 3)
    assert.equal(row.credits_used, 3)
  })
  await test('kuota sudah habis: langsung ditolak tanpa mengubah angka', async () => {
    const { row, db } = fakeDb(3)
    assert.equal((await reserveCredit('u1', 3, db)).ok, false)
    assert.equal(row.credits_used, 3)
  })
  await test('release mengembalikan kredit (generate gagal tidak memotong kuota)', async () => {
    const { row, db } = fakeDb(1)
    const r = await reserveCredit('u1', 3, db)
    assert.ok(r.ok)
    assert.equal(row.credits_used, 2)
    if (r.ok) await r.release()
    assert.equal(row.credits_used, 1)
  })
  await test('release nggak pernah membuat kredit negatif', async () => {
    const { row, db } = fakeDb(0)
    const r = await reserveCredit('u1', 3, db)
    row.credits_used = 0
    if (r.ok) await r.release()
    assert.equal(row.credits_used, 0)
  })
  await test('banyak permintaan paralel dan sebagian dikembalikan: hitungan akhir konsisten', async () => {
    const { row, db } = fakeDb(0)
    const rs = await Promise.all(Array.from({ length: 4 }, () => reserveCredit('u1', 10, db)))
    await Promise.all(rs.slice(0, 2).map((r) => (r.ok ? r.release() : Promise.resolve())))
    assert.equal(row.credits_used, 2)
  })

  await test('rateLimit: izinkan sebanyak batas lalu tolak', () => {
    resetRateLimits()
    const t = 1_000_000
    assert.deepEqual([1, 2, 3].map(() => rateLimit('k', 3, 1000, t)), [true, true, true])
    assert.equal(rateLimit('k', 3, 1000, t), false)
  })
  await test('rateLimit: jendela bergeser, boleh lagi setelah waktunya lewat', () => {
    resetRateLimits()
    for (let i = 0; i < 3; i++) rateLimit('k', 3, 1000, 5000)
    assert.equal(rateLimit('k', 3, 1000, 5500), false)
    assert.equal(rateLimit('k', 3, 1000, 6001), true)
  })
  await test('rateLimit: kunci berbeda nggak saling memengaruhi', () => {
    resetRateLimits()
    for (let i = 0; i < 3; i++) rateLimit('a', 3, 1000, 1)
    assert.equal(rateLimit('a', 3, 1000, 1), false)
    assert.equal(rateLimit('b', 3, 1000, 1), true)
  })

  console.log(`\n${passed} tes lolos`)
}
main()

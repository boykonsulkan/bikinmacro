// Perkiraan biaya AI dan ringkasan pemakaian. Murni (tanpa jaringan/DB) supaya gampang dites.
// Harga adalah PERKIRAAN dari daftar harga penyedia dan bisa berubah. Tagihan asli ada di dashboard penyedia.

export const AI_BUDGET = {
  /**
   * Anggaran bulanan di aplikasi (USD). Di atas ini generate dan chat berhenti untuk pengguna biasa (admin lolos).
   * Sengaja 80% dari batas keras di penyedia supaya aplikasi berhenti lebih dulu, bukan diputus mendadak.
   */
  monthlyUsd: 8,
  /** Batas keras yang disarankan di dashboard penyedia (OpenRouter: limit kredit pada API key). */
  providerCapUsd: 10,
  /** Di atas rasio ini halaman admin menampilkan peringatan. */
  warnRatio: 0.7,
  usdToIdr: 16500,
} as const

/** USD per 1 juta token. */
type Price = { in: number; out: number }

const PRICES: Record<string, Price> = {
  'openai/gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  // Perkiraan: model ini dipakai di tier gratis, harga berbayarnya belum dipastikan.
  'gemini-3.5-flash-lite': { in: 0.1, out: 0.4 },
}
/** Model yang nggak dikenal dihitung mahal (konservatif) supaya anggaran nggak kecolongan. */
const FALLBACK_PRICE: Price = { in: 3, out: 15 }

export function priceFor(model: string): Price {
  return PRICES[model] ?? FALLBACK_PRICE
}

export function isKnownModel(model: string): boolean {
  return model in PRICES
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceFor(model)
  return (Math.max(0, inputTokens) * p.in + Math.max(0, outputTokens) * p.out) / 1_000_000
}

export const toIdr = (usd: number) => usd * AI_BUDGET.usdToIdr

export type UsageRow = {
  user_id: string
  created_at: string
  kind: string
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
}

export type BudgetLevel = 'ok' | 'warn' | 'exceeded'

export function budgetLevel(monthUsd: number): BudgetLevel {
  if (monthUsd >= AI_BUDGET.monthlyUsd) return 'exceeded'
  if (monthUsd >= AI_BUDGET.monthlyUsd * AI_BUDGET.warnRatio) return 'warn'
  return 'ok'
}

const WIB_MS = 7 * 3600 * 1000
/** Tanggal (YYYY-MM-DD) dalam WIB, supaya "hari ini" sesuai jam Indonesia. */
export const wibDay = (iso: string | number) => new Date(new Date(iso).getTime() + WIB_MS).toISOString().slice(0, 10)

/** Awal bulan berjalan (WIB) sebagai ISO UTC, untuk filter database. */
export function monthStartIso(now: Date): string {
  const wib = new Date(now.getTime() + WIB_MS)
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1) - WIB_MS).toISOString()
}

export type UsageSummary = {
  monthUsd: number
  todayUsd: number
  last7Usd: number
  monthCalls: number
  generateCalls: number
  avgUsdPerGenerate: number
  level: BudgetLevel
  perModel: { model: string; calls: number; inputTokens: number; outputTokens: number; usd: number; known: boolean }[]
  perUser: { userId: string; calls: number; usd: number }[]
  perDay: { date: string; calls: number; usd: number }[]
}

export function summarizeUsage(rows: UsageRow[], now: Date): UsageSummary {
  const monthStart = monthStartIso(now)
  const today = wibDay(now.getTime())
  const sevenAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  let monthUsd = 0, todayUsd = 0, last7Usd = 0, monthCalls = 0, generateCalls = 0, generateUsd = 0
  const models = new Map<string, UsageSummary['perModel'][number]>()
  const users = new Map<string, { calls: number; usd: number }>()
  const days = new Map<string, { calls: number; usd: number }>()

  for (const r of rows) {
    const usd = estimateCostUsd(r.model, r.input_tokens, r.output_tokens)
    const day = wibDay(r.created_at)
    const d = days.get(day) ?? { calls: 0, usd: 0 }
    d.calls++
    d.usd += usd
    days.set(day, d)
    if (day === today) todayUsd += usd
    if (r.created_at >= sevenAgo) last7Usd += usd
    if (r.created_at >= monthStart) {
      monthUsd += usd
      monthCalls++
      if (r.kind === 'generate') {
        generateCalls++
        generateUsd += usd
      }
      const m = models.get(r.model) ?? { model: r.model, calls: 0, inputTokens: 0, outputTokens: 0, usd: 0, known: isKnownModel(r.model) }
      m.calls++
      m.inputTokens += r.input_tokens
      m.outputTokens += r.output_tokens
      m.usd += usd
      models.set(r.model, m)
      const u = users.get(r.user_id) ?? { calls: 0, usd: 0 }
      u.calls++
      u.usd += usd
      users.set(r.user_id, u)
    }
  }

  const perDay: UsageSummary['perDay'] = []
  for (let i = 13; i >= 0; i--) {
    const date = wibDay(now.getTime() - i * 86400000)
    perDay.push({ date, ...(days.get(date) ?? { calls: 0, usd: 0 }) })
  }

  return {
    monthUsd, todayUsd, last7Usd, monthCalls, generateCalls,
    avgUsdPerGenerate: generateCalls ? generateUsd / generateCalls : 0,
    level: budgetLevel(monthUsd),
    perModel: [...models.values()].sort((a, b) => b.usd - a.usd),
    perUser: [...users.entries()].map(([userId, v]) => ({ userId, ...v })).sort((a, b) => b.usd - a.usd).slice(0, 10),
    perDay,
  }
}

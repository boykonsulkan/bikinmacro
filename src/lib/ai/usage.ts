import 'server-only'
import { serviceClient } from '@/lib/orders/server'
import { AI_BUDGET, estimateCostUsd, monthStartIso } from './cost'

type Usage = { inputTokens?: number; outputTokens?: number } | undefined

/** Catat pemakaian token satu panggilan AI. Best effort: gagal (misalnya tabel belum dibuat) nggak boleh mengganggu pengguna. */
export async function recordUsage(userId: string, kind: 'generate' | 'chat', provider: string, model: string, usage: Usage): Promise<void> {
  try {
    const input = Math.max(0, Math.round(usage?.inputTokens ?? 0))
    const output = Math.max(0, Math.round(usage?.outputTokens ?? 0))
    const { error } = await serviceClient().from('ai_usage').insert({ user_id: userId, kind, provider, model, input_tokens: input, output_tokens: output })
    if (!error && cache) cache.usd += estimateCostUsd(model, input, output)
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') console.warn('recordUsage:', error.message)
  } catch (e) {
    console.warn('recordUsage gagal:', e instanceof Error ? e.message : e)
  }
}

let cache: { at: number; usd: number } | null = null

/** Perkiraan biaya bulan ini (USD), di-cache 60 detik per instance. null = tabel belum ada atau galat (jangan blokir pengguna). */
export async function monthSpendUsd(): Promise<number | null> {
  if (cache && Date.now() - cache.at < 60_000) return cache.usd
  try {
    const { data, error } = await serviceClient()
      .from('ai_usage')
      .select('model, input_tokens, output_tokens')
      .gte('created_at', monthStartIso(new Date()))
      .limit(100000)
    if (error) return null
    const usd = (data ?? []).reduce((sum, r) => sum + estimateCostUsd(r.model as string, r.input_tokens as number, r.output_tokens as number), 0)
    cache = { at: Date.now(), usd }
    return usd
  } catch {
    return null
  }
}

/**
 * Pemutus global: kalau perkiraan biaya bulan ini melewati anggaran, generate dan chat berhenti untuk pengguna biasa.
 * Fail-open kalau datanya nggak tersedia; batas keras di dashboard penyedia tetap jadi pengaman terakhir.
 */
export async function isOverBudget(): Promise<boolean> {
  const usd = await monthSpendUsd()
  return usd !== null && usd >= AI_BUDGET.monthlyUsd
}

export const BUDGET_MESSAGE = 'Layanan sedang dibatasi sementara. Coba lagi nanti, atau hubungi founder lewat halaman Bantuan.'

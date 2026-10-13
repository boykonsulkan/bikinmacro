import { redirect } from 'next/navigation'
import { getAdminForPage, serviceClient } from '@/lib/orders/server'
import { AI_BUDGET, monthStartIso, summarizeUsage, toIdr } from '@/lib/ai/cost'
import type { UsageRow } from '@/lib/ai/cost'

export const dynamic = 'force-dynamic'

const idr = (usd: number) => `Rp${Math.round(toIdr(usd)).toLocaleString('id-ID')}`
const usdFmt = (usd: number) => `$${usd.toFixed(usd < 0.1 ? 4 : 2)}`
const tokens = (n: number) => n.toLocaleString('id-ID')

const LEVEL = {
  ok: { label: 'Aman', cls: 'border-border bg-card text-card-foreground', bar: 'bg-primary' },
  warn: { label: 'Mendekati anggaran', cls: 'border-warning-border bg-warning-bg text-warning-ink', bar: 'bg-warning-ink' },
  exceeded: { label: 'Anggaran habis: generate dan chat dihentikan untuk pengguna biasa', cls: 'border-danger bg-danger/10 text-danger', bar: 'bg-danger' },
} as const

export default async function AdminAiCostPage() {
  if (!(await getAdminForPage())) redirect('/north/login')

  const db = serviceClient()
  const now = new Date()
  const since = new Date(Math.min(new Date(monthStartIso(now)).getTime(), now.getTime() - 14 * 86400000)).toISOString()

  const usage = await db.from('ai_usage').select('user_id, created_at, kind, provider, model, input_tokens, output_tokens').gte('created_at', since).limit(100000)
  const ready = !usage.error // tabel belum dibuat = error
  const summary = summarizeUsage((usage.data ?? []) as UsageRow[], now)

  const ids = summary.perUser.map((u) => u.userId)
  const emailById = new Map<string, string>()
  if (ids.length > 0) {
    const { data: users } = await db.from('users').select('id, email').in('id', ids)
    for (const u of users ?? []) emailById.set(u.id as string, u.email as string)
  }

  const level = LEVEL[summary.level]
  const ratio = Math.min(1, summary.monthUsd / AI_BUDGET.monthlyUsd)
  const maxDay = Math.max(0.0001, ...summary.perDay.map((d) => d.usd))

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Biaya AI</h1>
        <p className="mt-1 text-sm text-muted">
          Perkiraan biaya dari jumlah token yang dipakai. Angkanya estimasi dari daftar harga penyedia, jadi tagihan asli di
          dashboard penyedia tetap yang berlaku. Kurs Rp{AI_BUDGET.usdToIdr.toLocaleString('id-ID')} per USD. Semua angka ada di
          src/lib/ai/cost.ts.
        </p>
      </div>

      {!ready && (
        <p className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm font-semibold text-warning-ink">
          Tabel ai_usage belum ada. Jalankan scripts/ai_usage_schema.sql di Supabase. Sampai itu dilakukan pemakaian belum
          tercatat dan pemutus anggaran otomatis nonaktif (batas keras di penyedia tetap jadi pengaman).
        </p>
      )}

      <section className={`rounded-2xl border p-5 shadow-sm ${level.cls}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold">Anggaran bulan ini: {level.label}</h2>
          <p className="text-sm font-semibold">
            {usdFmt(summary.monthUsd)} ({idr(summary.monthUsd)}) dari {usdFmt(AI_BUDGET.monthlyUsd)} ({idr(AI_BUDGET.monthlyUsd)})
          </p>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full ${level.bar}`} style={{ width: `${ratio * 100}%` }} />
        </div>
        <p className="mt-3 text-xs font-medium opacity-80">
          Di angka anggaran, generate dan chat berhenti otomatis untuk pengguna biasa (admin tetap bisa). Batas keras yang
          disarankan di penyedia: {usdFmt(AI_BUDGET.providerCapUsd)} ({idr(AI_BUDGET.providerCapUsd)}) per bulan, misalnya limit
          kredit pada API key OpenRouter. Anggaran aplikasi sengaja lebih rendah supaya aplikasi berhenti lebih dulu.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Hari ini', `${usdFmt(summary.todayUsd)} (${idr(summary.todayUsd)})`],
          ['7 hari terakhir', `${usdFmt(summary.last7Usd)} (${idr(summary.last7Usd)})`],
          ['Panggilan AI bulan ini', String(summary.monthCalls)],
          ['Rata-rata per macro dibuat', `${usdFmt(summary.avgUsdPerGenerate)} (${idr(summary.avgUsdPerGenerate)})`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className="mt-2 text-lg font-bold text-card-foreground">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-bold text-card-foreground">14 hari terakhir (WIB)</h2>
        <ul className="mt-3 space-y-1.5">
          {summary.perDay.map((d) => (
            <li key={d.date} className="flex items-center gap-3 text-xs">
              <span className="w-20 shrink-0 font-mono text-muted">{d.date.slice(5)}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-border/60">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(d.usd / maxDay) * 100}%` }} />
              </span>
              <span className="w-40 shrink-0 text-right font-mono text-card-foreground">
                {d.calls} panggilan, {idr(d.usd)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="px-5 pt-5 text-sm font-bold text-card-foreground">Per model (bulan ini)</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-y border-border bg-excel-head text-xs font-semibold text-muted">
              <tr>
                <th className="px-4 py-2">Model</th>
                <th className="px-4 py-2 text-right">Panggilan</th>
                <th className="px-4 py-2 text-right">Token masuk / keluar</th>
                <th className="px-4 py-2 text-right">Biaya</th>
              </tr>
            </thead>
            <tbody>
              {summary.perModel.map((m) => (
                <tr key={m.model} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-xs text-card-foreground">
                    {m.model}
                    {!m.known && <span className="block text-[11px] font-sans text-warning-ink">Harga belum diketahui, dihitung mahal (konservatif)</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{m.calls}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{tokens(m.inputTokens)} / {tokens(m.outputTokens)}</td>
                  <td className="px-4 py-2 text-right font-mono">{idr(m.usd)}</td>
                </tr>
              ))}
              {summary.perModel.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Belum ada pemakaian tercatat bulan ini.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="px-5 pt-5 text-sm font-bold text-card-foreground">10 pengguna terbesar (bulan ini)</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-y border-border bg-excel-head text-xs font-semibold text-muted">
              <tr>
                <th className="px-4 py-2">Pengguna</th>
                <th className="px-4 py-2 text-right">Panggilan</th>
                <th className="px-4 py-2 text-right">Biaya</th>
              </tr>
            </thead>
            <tbody>
              {summary.perUser.map((u) => (
                <tr key={u.userId} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-xs text-card-foreground">{emailById.get(u.userId) ?? u.userId}</td>
                  <td className="px-4 py-2 text-right font-mono">{u.calls}</td>
                  <td className="px-4 py-2 text-right font-mono">{idr(u.usd)}</td>
                </tr>
              ))}
              {summary.perUser.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted">Belum ada pemakaian tercatat bulan ini.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

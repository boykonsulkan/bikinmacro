import { redirect } from 'next/navigation'
import { AI_LIMITS, REJECTION_MESSAGES } from '@/lib/ai/guard'
import { getAdminForPage, serviceClient } from '@/lib/orders/server'
import { formatDateTime } from '@/components/pesan/format'

export const dynamic = 'force-dynamic'

const REASON_LABEL: Record<string, string> = {
  refusal: 'Di luar topik',
  not_vba: 'Balasan bukan VBA',
  empty: 'Balasan kosong',
  too_long: 'Terlalu panjang',
  unsafe: 'Perintah berbahaya',
}

export default async function AdminAiLogPage() {
  if (!(await getAdminForPage())) redirect('/north/login')

  const db = serviceClient()
  const { data: rows, error } = await db
    .from('ai_rejections')
    .select('id, created_at, user_id, kind, reason, detail, excerpt')
    .order('created_at', { ascending: false })
    .limit(100)

  const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id as string)))
  const emailById = new Map<string, string>()
  if (ids.length > 0) {
    const { data: users } = await db.from('users').select('id, email').in('id', ids)
    for (const u of users ?? []) emailById.set(u.id as string, u.email as string)
  }

  // Siapa yang paling sering ditolak (100 terakhir): bantu lihat pola penyalahgunaan.
  const perUser = new Map<string, number>()
  for (const r of rows ?? []) perUser.set(r.user_id as string, (perUser.get(r.user_id as string) ?? 0) + 1)
  const top = [...perUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Log pengaman AI</h1>
        <p className="mt-1 text-sm text-muted">
          Permintaan yang ditolak: di luar topik, balasan AI bukan VBA, atau memuat perintah berbahaya. Penolakan nggak memotong
          kredit. Akun yang ditolak {AI_LIMITS.rejectionsPerHour} kali dalam satu jam ditahan sementara. Batas pemakaian:{' '}
          {AI_LIMITS.requestsPerMinute} per menit dan {AI_LIMITS.requestsPerDay} per hari. Semua angka di src/lib/ai/guard.ts.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm font-semibold text-warning-ink">
          Tabel ai_rejections belum ada. Jalankan scripts/ai_guard_schema.sql di Supabase. Pengaman lain tetap jalan, tapi
          penahanan akun dan halaman ini nonaktif sampai tabelnya ada.
        </p>
      )}

      {top.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-card-foreground">Paling sering ditolak (100 log terakhir)</h2>
          <ul className="mt-2 space-y-1 text-sm text-card-foreground">
            {top.map(([id, n]) => (
              <li key={id}>
                <span className="font-mono">{emailById.get(id) ?? id}</span>: {n} kali
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-excel-head text-xs font-semibold text-muted">
              <tr>
                <th className="px-5 py-3">Waktu</th>
                <th className="px-5 py-3">Pengguna</th>
                <th className="px-5 py-3">Jalur</th>
                <th className="px-5 py-3">Alasan</th>
                <th className="px-5 py-3">Kutipan permintaan</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(r.created_at)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-card-foreground">{emailById.get(r.user_id as string) ?? r.user_id}</td>
                  <td className="px-5 py-3 text-card-foreground">{r.kind}</td>
                  <td className="px-5 py-3 text-card-foreground" title={REJECTION_MESSAGES[r.reason as keyof typeof REJECTION_MESSAGES] ?? ''}>
                    {REASON_LABEL[r.reason as string] ?? r.reason}
                    {r.detail ? <span className="block text-xs text-muted">{r.detail}</span> : null}
                  </td>
                  <td className="max-w-md px-5 py-3 text-xs text-muted">{r.excerpt}</td>
                </tr>
              ))}
              {(rows ?? []).length === 0 && !error && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">Belum ada penolakan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

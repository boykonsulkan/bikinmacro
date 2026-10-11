import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminUser, serviceClient, tableExists } from '@/lib/orders/server'
import { buildReport } from '@/lib/events/report'
import type { ChatRow, EventRow, GenerationRow, RejectionRow, UserRow } from '@/lib/events/report'
import { formatDateTime } from '@/components/pesan/format'

export const dynamic = 'force-dynamic'

const RANGES = [7, 30, 90]
const pct = (n: number | null) => (n === null ? '-' : `${Math.round(n * 100)}%`)

function duration(minutes: number | null): string {
  if (minutes === null) return '-'
  if (minutes < 60) return `${minutes} mnt`
  if (minutes < 60 * 48) return `${Math.round(minutes / 60)} jam`
  return `${Math.round(minutes / 1440)} hari`
}

export default async function AdminBehaviorPage({ searchParams }: { searchParams: Promise<{ days?: string; admin?: string }> }) {
  if (!(await getAdminUser())) redirect('/north/login')
  const params = await searchParams
  const days = RANGES.includes(Number(params.days)) ? Number(params.days) : 30
  const includeAdmins = params.admin === '1'

  const db = serviceClient()
  const now = new Date()
  const since = new Date(now.getTime() - days * 86400000).toISOString()
  const eventsReady = await tableExists(db, 'events')

  const [users, generations, chats, events, rejections, authUsers] = await Promise.all([
    db.from('users').select('id, email, plan, role, created_at').limit(2000),
    db.from('generations').select('id, user_id, created_at, category, prompt').gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
    db.from('generation_chats').select('generation_id, user_id, role, created_at').gte('created_at', since).limit(20000),
    eventsReady ? db.from('events').select('user_id, name, created_at').gte('created_at', since).limit(50000) : Promise.resolve({ data: [] }),
    db.from('ai_rejections').select('user_id').gte('created_at', since).limit(5000),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const signIns = new Map<string, string | null>()
  for (const u of authUsers.data?.users ?? []) signIns.set(u.id, u.last_sign_in_at ?? null)

  const report = buildReport({
    now,
    users: (users.data ?? []) as UserRow[],
    signIns,
    generations: (generations.data ?? []) as GenerationRow[],
    chats: (chats.data ?? []) as ChatRow[],
    events: (events.data ?? []) as EventRow[],
    rejections: (rejections.data ?? []) as RejectionRow[],
    includeAdmins,
  })
  const { summary, funnel, formats, perUser, recent } = report
  const outputs = formats.copy + formats.bas + formats.xlsm
  const link = (d: number, a: boolean) => `/north/behavior?days=${d}${a ? '&admin=1' : ''}`
  const chip = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-xs font-semibold ${active ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-muted hover:text-foreground'}`

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Perilaku pengguna</h1>
          <p className="mt-1 text-sm text-muted">
            Apa yang dilakukan beta tester: seberapa jauh mereka sampai, apa yang mereka minta, dan hasil mana yang mereka pakai.
            Periode {days} hari terakhir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((d) => (
            <Link key={d} href={link(d, includeAdmins)} className={chip(d === days)}>{d} hari</Link>
          ))}
          <Link href={link(days, !includeAdmins)} className={chip(includeAdmins)}>
            {includeAdmins ? 'Termasuk admin' : 'Tanpa admin'}
          </Link>
        </div>
      </div>

      {!eventsReady && (
        <p className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm font-semibold text-warning-ink">
          Tabel events belum ada. Jalankan scripts/events_schema.sql di Supabase. Sampai itu dilakukan, funnel dan data unduhan
          kosong. Jumlah generate, chat, dan terakhir aktif tetap tampil karena diambil dari data yang sudah ada.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Pengguna aktif 7 hari', `${summary.active7d} dari ${summary.users}`],
          ['Sudah pernah generate', `${summary.usersWithGeneration} dari ${summary.users}`],
          ['Macro dibuat', String(summary.generations)],
          ['Direvisi lewat chat', `${pct(summary.revisionRate)} (${summary.chatsPerGeneration.toFixed(1)} chat per macro)`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className="mt-2 text-xl font-bold text-card-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-card-foreground">Funnel (pengguna unik)</h2>
          <p className="mt-1 text-xs text-muted">Di langkah mana orang berhenti. Persen terhadap langkah pertama dan langkah sebelumnya.</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {funnel.map((f) => (
                <tr key={f.key} className="border-t border-border">
                  <td className="py-2 pr-3 text-card-foreground">{f.label}</td>
                  <td className="py-2 pr-3 text-right font-mono font-bold">{f.users}</td>
                  <td className="py-2 pr-3 text-right text-xs text-muted">{pct(f.ofFirst)}</td>
                  <td className="py-2 text-right text-xs text-muted">{f.ofPrevious === null ? '' : `dari sebelumnya ${pct(f.ofPrevious)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-card-foreground">Hasil yang mereka pakai</h2>
          <p className="mt-1 text-xs text-muted">Jumlah kejadian. Ini sinyal "macro ini berguna", lebih jujur daripada jumlah generate.</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {[
                ['Copy VBA', formats.copy],
                ['Unduh .bas', formats.bas],
                ['Unduh .xlsm (beta)', formats.xlsm],
              ].map(([label, n]) => (
                <tr key={label as string} className="border-t border-border">
                  <td className="py-2 text-card-foreground">{label}</td>
                  <td className="py-2 text-right font-mono font-bold">{n}</td>
                  <td className="py-2 text-right text-xs text-muted">{outputs ? pct((n as number) / outputs) : '-'}</td>
                </tr>
              ))}
              <tr className="border-t border-border">
                <td className="py-2 text-card-foreground">.xlsm gagal dibuat</td>
                <td className="py-2 text-right font-mono font-bold">{formats.xlsmFailed}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <h2 className="px-5 pt-5 text-sm font-bold text-card-foreground">Per pengguna</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-border bg-excel-head text-xs font-semibold text-muted">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Paket</th>
                <th className="px-4 py-3">Terakhir aktif</th>
                <th className="px-4 py-3 text-right">Hari aktif</th>
                <th className="px-4 py-3 text-right">Generate</th>
                <th className="px-4 py-3 text-right">Chat</th>
                <th className="px-4 py-3 text-right">Copy</th>
                <th className="px-4 py-3 text-right">.bas</th>
                <th className="px-4 py-3 text-right">.xlsm</th>
                <th className="px-4 py-3 text-right">Ditolak</th>
                <th className="px-4 py-3">Generate pertama setelah daftar</th>
              </tr>
            </thead>
            <tbody>
              {perUser.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs text-card-foreground">{p.email}{p.isAdmin ? ' (admin)' : ''}</td>
                  <td className="px-4 py-3 text-card-foreground">{p.plan}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{p.lastActive ? formatDateTime(p.lastActive) : 'belum pernah'}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.activeDays}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.generations}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.chats}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.copy}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.bas}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.xlsm}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.rejections}</td>
                  <td className="px-4 py-3 text-muted">{duration(p.minutesToFirstGeneration)}</td>
                </tr>
              ))}
              {perUser.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-6 text-center text-muted">Belum ada pengguna.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <h2 className="px-5 pt-5 text-sm font-bold text-card-foreground">Permintaan terbaru</h2>
        <p className="px-5 pt-1 text-xs text-muted">
          Baca ini satu per satu: ini yang paling jujur menunjukkan apa yang mereka butuhkan. Isi permintaan adalah data pengguna,
          jadi jangan dibagikan di luar tim.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-border bg-excel-head text-xs font-semibold text-muted">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Permintaan</th>
                <th className="px-4 py-3 text-right">Revisi</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-card-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-card-foreground">{r.category}</td>
                  <td className="max-w-xl px-4 py-3 text-card-foreground">{r.prompt}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.revisions}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Belum ada permintaan pada periode ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

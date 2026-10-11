import { redirect } from 'next/navigation'
import { emailConfig } from '@/lib/email/resend'
import { EMAIL_LIMITS } from '@/lib/email/config'
import { getAdminUser, serviceClient } from '@/lib/orders/server'
import { formatDateTime } from '@/components/pesan/format'
import EmailForm from './EmailForm'

export const dynamic = 'force-dynamic'

export default async function AdminEmailPage() {
  if (!(await getAdminUser())) redirect('/north/login')

  const cfg = emailConfig()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://bikinmacro.my.id').replace(/\/+$/, '')

  const db = serviceClient()
  const { data: logs, error } = await db
    .from('email_logs')
    .select('id, created_at, to_email, subject, template, status, error')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Email</h1>
        <p className="mt-1 text-sm text-muted">
          Kirim email lewat Resend dari sini, cuma saat kamu menekan tombol. Maksimal {EMAIL_LIMITS.maxRecipientsPerSend} penerima sekali
          kirim dan {EMAIL_LIMITS.maxPerDay} per 24 jam. Pengirim: <span className="font-mono">{cfg.from}</span>
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm font-semibold text-warning-ink">
          Tabel email_logs belum ada. Jalankan scripts/email_schema.sql di Supabase. Tombol kirim akan menolak sampai tabelnya ada.
        </p>
      )}

      <EmailForm configured={cfg.configured} sandbox={cfg.sandbox} siteUrl={siteUrl} />

      <section>
        <h2 className="mb-3 text-sm font-bold text-foreground">Riwayat kirim (50 terakhir)</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-excel-head text-xs font-semibold text-muted">
                <tr>
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Penerima</th>
                  <th className="px-5 py-3">Subjek</th>
                  <th className="px-5 py-3">Template</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map((l) => (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(l.created_at)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-card-foreground">{l.to_email}</td>
                    <td className="px-5 py-3 text-card-foreground">{l.subject}</td>
                    <td className="px-5 py-3 text-muted">{l.template}</td>
                    <td className="px-5 py-3">
                      {l.status === 'terkirim' ? (
                        <span className="font-semibold text-accent-ink">Terkirim</span>
                      ) : (
                        <span className="font-semibold text-danger" title={l.error ?? ''}>Gagal{l.error ? `: ${l.error}` : ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(logs ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">Belum ada email terkirim.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

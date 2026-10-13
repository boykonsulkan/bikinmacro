import { redirect } from 'next/navigation'
import { checkSenderDomain, emailConfig } from '@/lib/email/resend'
import { EMAIL_LIMITS } from '@/lib/email/config'
import { getAdminForPage, serviceClient } from '@/lib/orders/server'
import { formatDateTime } from '@/components/pesan/format'
import { PLAN_LABEL, inviteState } from '@/lib/invites/rules'
import EmailForm from './EmailForm'
import { revokeInviteAction } from './invite-actions'

export const dynamic = 'force-dynamic'

export default async function AdminEmailPage() {
  if (!(await getAdminForPage())) redirect('/north/login')

  const cfg = emailConfig()
  const domain = cfg.configured ? await checkSenderDomain() : null
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://bikinmacro.my.id').replace(/\/+$/, '')

  const db = serviceClient()
  const { data: logs, error } = await db
    .from('email_logs')
    .select('id, created_at, to_email, subject, template, status, error')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: invites, error: invitesError } = await db
    .from('beta_invites')
    .select('id, created_at, email, plan, status, expires_at, activated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Email</h1>
        <p className="mt-1 text-sm text-muted">
          Kirim email lewat Resend dari sini, cuma saat kamu menekan tombol. Maksimal {EMAIL_LIMITS.maxRecipientsPerSend} penerima sekali
          kirim dan {EMAIL_LIMITS.maxPerDay} per 24 jam. Pengirim: <span className="font-mono">{cfg.from}</span>. Balasan penerima masuk
          ke: <span className="font-mono">{cfg.replyTo}</span>{cfg.replyToIsDefault ? ' (bawaan sementara)' : ''}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm font-semibold text-warning-ink">
          Tabel email_logs belum ada. Jalankan scripts/email_schema.sql di Supabase. Tombol kirim akan menolak sampai tabelnya ada.
        </p>
      )}

      {cfg.replyToIsDefault && (
        <p className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-muted">
          Balasan penerima sementara masuk ke {cfg.replyTo} (bawaan di kode). Untuk menggantinya, isi EMAIL_REPLY_TO di environment
          lalu deploy ulang.
        </p>
      )}

      {domain?.state === 'verified' && (
        <p className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-accent-ink">
          Domain pengirim {domain.domain} sudah terverifikasi di Resend. Email bisa dikirim ke siapa saja.
        </p>
      )}
      {domain && (domain.state === 'pending' || domain.state === 'gagal' || domain.state === 'tidak_ada') && (
        <p className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm font-semibold text-warning-ink">
          {domain.state === 'tidak_ada'
            ? `Domain ${domain.domain} belum ditambahkan di Resend (Domains, Add Domain).`
            : domain.state === 'pending'
              ? `Domain ${domain.domain} belum terverifikasi di Resend. Pastikan record DNS-nya sudah ditambahkan, lalu klik Verify di dashboard Resend.`
              : `Verifikasi domain ${domain.domain} di Resend gagal. Cek lagi record DNS-nya.`}{' '}
          Selama belum terverifikasi, pengiriman ke orang lain akan gagal.
        </p>
      )}
      {domain?.state === 'tidak_bisa_dicek' && (
        <p className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-muted">
          Status domain pengirim nggak bisa dicek otomatis ({domain.detail}). Cek manual di dashboard Resend, bagian Domains.
        </p>
      )}

      <EmailForm configured={cfg.configured} sandbox={cfg.sandbox} siteUrl={siteUrl} />

      <section>
        <h2 className="mb-1 text-sm font-bold text-foreground">Undangan beta (50 terakhir)</h2>
        <p className="mb-3 text-xs text-muted">
          Tiap penerima yang diundang lewat tombol &quot;Aktifkan akun beta&quot; punya satu link unik. Status &quot;Aktif&quot; berarti akunnya sudah
          dibuat dan paketnya menyala.
        </p>
        {invitesError && (
          <p className="mb-3 rounded-lg border border-warning-border bg-warning-bg p-4 text-sm font-semibold text-warning-ink">
            Tabel beta_invites belum ada. Jalankan scripts/beta_invites_schema.sql di Supabase. Tombol &quot;Aktifkan akun beta&quot; menolak
            bekerja sampai tabelnya ada.
          </p>
        )}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-excel-head text-xs font-semibold text-muted">
                <tr>
                  <th className="px-5 py-3">Dibuat</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Paket</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Berlaku sampai</th>
                  <th className="px-5 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {(invites ?? []).map((i) => {
                  const state = inviteState(i)
                  return (
                    <tr key={i.id} className="border-t border-border align-top">
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(i.created_at)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-card-foreground">{i.email}</td>
                      <td className="px-5 py-3 text-card-foreground">{PLAN_LABEL[i.plan as string] ?? i.plan}</td>
                      <td className="px-5 py-3">
                        <span className={state === 'activated' ? 'font-semibold text-accent-ink' : state === 'ok' ? 'font-semibold text-card-foreground' : 'text-muted'}>
                          {state === 'ok' ? 'Menunggu' : state === 'activated' ? `Aktif (${i.activated_at ? formatDateTime(i.activated_at) : ''})` : state === 'expired' ? 'Kedaluwarsa' : 'Dicabut'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(i.expires_at)}</td>
                      <td className="px-5 py-3">
                        {state === 'ok' && (
                          <form action={revokeInviteAction}>
                            <input type="hidden" name="id" value={i.id} />
                            <button type="submit" className="text-xs font-bold text-danger hover:underline">Cabut</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {(invites ?? []).length === 0 && !invitesError && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">Belum ada undangan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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

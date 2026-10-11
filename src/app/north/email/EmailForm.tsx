'use client'

import { useActionState, useMemo, useState } from 'react'
import { AlertCircle, Check, Loader2, Send } from 'lucide-react'
import { EMAIL_LIMITS, TEMPLATES, TEMPLATE_KEYS } from '@/lib/email/config'
import type { TemplateKey } from '@/lib/email/config'
import { parseRecipients } from '@/lib/email/recipients'
import { buildCtas, renderEmail } from '@/lib/email/templates'
import { sendEmailAction } from './actions'
import type { SendState } from './actions'

const INITIAL: SendState = { status: 'idle', message: '', results: [] }

const field = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground'
const label = 'text-xs font-semibold text-muted'

export default function EmailForm({ configured, sandbox, siteUrl }: { configured: boolean; sandbox: boolean; siteUrl: string }) {
  const [state, action, pending] = useActionState(sendEmailAction, INITIAL)
  const [template, setTemplate] = useState<TemplateKey>('beta_invite')
  const [subject, setSubject] = useState(TEMPLATES.beta_invite.subject)
  const [body, setBody] = useState(TEMPLATES.beta_invite.body)
  const [ctaCoba, setCtaCoba] = useState(TEMPLATES.beta_invite.ctas.coba)
  const [ctaDaftar, setCtaDaftar] = useState(TEMPLATES.beta_invite.ctas.daftar)
  const [recipients, setRecipients] = useState('')

  const parsed = useMemo(() => parseRecipients(recipients), [recipients])
  const tooMany = parsed.valid.length > EMAIL_LIMITS.maxRecipientsPerSend

  const preview = useMemo(
    () =>
      renderEmail({
        subject,
        body: body || '(isi email kosong)',
        recipient: parsed.valid[0] ?? { email: 'contoh@email.com', name: '' },
        ctas: buildCtas({ coba: ctaCoba, daftar: ctaDaftar }, siteUrl),
      }),
    [subject, body, ctaCoba, ctaDaftar, parsed.valid, siteUrl],
  )

  function pickTemplate(key: TemplateKey) {
    setTemplate(key)
    setSubject(TEMPLATES[key].subject)
    setBody(TEMPLATES[key].body)
    setCtaCoba(TEMPLATES[key].ctas.coba)
    setCtaDaftar(TEMPLATES[key].ctas.daftar)
  }

  const canSend = configured && !pending && parsed.valid.length > 0 && parsed.invalid.length === 0 && !tooMany

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="template" className={label}>Template</label>
          <select id="template" name="template" value={template} onChange={(e) => pickTemplate(e.target.value as TemplateKey)} className={field}>
            {TEMPLATE_KEYS.map((k) => <option key={k} value={k}>{TEMPLATES[k].label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="subject" className={label}>Subjek</label>
          <input id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={EMAIL_LIMITS.subjectMax} className={field} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="body" className={label}>Isi email (baris kosong = paragraf baru, {'{nama}'} = nama penerima)</label>
          <textarea id="body" name="body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} maxLength={EMAIL_LIMITS.bodyMax} className={`${field} resize-y`} />
        </div>

        <fieldset className="space-y-1.5">
          <legend className={label}>Tombol di bawah isi email</legend>
          <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            <input type="checkbox" name="cta_coba" checked={ctaCoba} onChange={(e) => setCtaCoba(e.target.checked)} />
            &quot;Coba contoh dulu&quot; (ke {siteUrl}/coba). Tombol utama, demo tanpa daftar.
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            <input type="checkbox" name="cta_daftar" checked={ctaDaftar} onChange={(e) => setCtaDaftar(e.target.checked)} />
            &quot;Daftar sebagai beta tester&quot; (ke {siteUrl}/auth/register)
          </label>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="recipients" className={label}>
            Penerima: satu per baris. Boleh &quot;email&quot;, &quot;email, Nama&quot;, atau &quot;Nama &lt;email&gt;&quot;. Maksimal {EMAIL_LIMITS.maxRecipientsPerSend}.
          </label>
          <textarea id="recipients" name="recipients" rows={5} value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder={'budi@perusahaan.com, Budi\nsiti@perusahaan.com'} className={`${field} resize-y font-mono`} />
          <p className={`text-xs font-medium ${parsed.invalid.length || tooMany ? 'text-danger' : 'text-muted'}`} aria-live="polite">
            {parsed.valid.length} penerima valid
            {parsed.duplicates > 0 && `, ${parsed.duplicates} dobel dibuang`}
            {parsed.invalid.length > 0 && `, ${parsed.invalid.length} baris bukan email (${parsed.invalid.slice(0, 2).join(' | ')})`}
            {tooMany && `. Maksimal ${EMAIL_LIMITS.maxRecipientsPerSend} sekali kirim`}
          </p>
        </div>

        {!configured && (
          <p className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-bg p-3 text-sm font-semibold text-warning-ink">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Resend belum dikonfigurasi (RESEND_API_KEY kosong). Tombol kirim dimatikan.
          </p>
        )}
        {configured && sandbox && (
          <p className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-bg p-3 text-sm font-semibold text-warning-ink">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Pengirim masih sandbox Resend (onboarding@resend.dev). Email cuma bisa sampai ke pemilik akun Resend. Verifikasi domain dan isi EMAIL_FROM untuk kirim ke orang lain.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="mode"
            value="test"
            disabled={!configured || pending}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-bold text-foreground hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Kirim tes ke saya
          </button>
          <button
            type="submit"
            name="mode"
            value="send"
            disabled={!canSend}
            onClick={(e) => {
              if (!window.confirm(`Kirim email "${subject}" ke ${parsed.valid.length} penerima?\n\n${parsed.valid.map((r) => r.email).join('\n')}`)) e.preventDefault()
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-action px-5 text-sm font-bold text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
            {pending ? 'Mengirim...' : `Kirim ke ${parsed.valid.length} penerima`}
          </button>
        </div>

        {state.status !== 'idle' && (
          <div role={state.status === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm font-semibold ${state.status === 'ok' ? 'border-border bg-card text-accent-ink' : 'border-warning-border bg-warning-bg text-warning-ink'}`}>
            <p>{state.message}</p>
            {state.results.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs font-medium">
                {state.results.map((r) => (
                  <li key={r.email} className="flex items-start gap-1.5">
                    {r.ok ? <Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
                    <span><span className="font-mono">{r.email}</span>{r.note ? `: ${r.note}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div>
        <p className={`${label} mb-1.5`}>Pratinjau untuk {parsed.valid[0]?.email ?? 'contoh@email.com'} (subjek: {preview.subject || '-'})</p>
        {/* sandbox="" mematikan skrip dan akses ke halaman ini. */}
        <iframe title="Pratinjau email" sandbox="" srcDoc={preview.html} className="h-[640px] w-full rounded-xl border border-border bg-white" />
      </div>
    </form>
  )
}

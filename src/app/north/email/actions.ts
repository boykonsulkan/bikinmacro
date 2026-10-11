'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { EMAIL_LIMITS, TEMPLATE_KEYS } from '@/lib/email/config'
import type { TemplateKey } from '@/lib/email/config'
import { parseRecipients } from '@/lib/email/recipients'
import { emailConfig, sendOne } from '@/lib/email/resend'
import { buildCtas, oneLine, renderEmail } from '@/lib/email/templates'
import { INVITE, isInvitePlan } from '@/lib/invites/rules'
import { createInvite, revokeInviteById } from '@/lib/invites/server'
import { getAdminUser, serviceClient, tableExists } from '@/lib/orders/server'

export type SendResultRow = { email: string; ok: boolean; note?: string }
export type SendState = { status: 'idle' | 'ok' | 'error'; message: string; results: SendResultRow[] }

const fail = (message: string): SendState => ({ status: 'error', message, results: [] })

/**
 * Kirim email dari halaman admin. mode=test mengirim satu email ke admin sendiri,
 * mode=send mengirim ke daftar penerima. Semua hasil dicatat di tabel email_logs.
 */
export async function sendEmailAction(_prev: SendState, formData: FormData): Promise<SendState> {
  const admin = await getAdminUser()
  if (!admin) return fail('Nggak punya akses.')

  const cfg = emailConfig()
  if (!cfg.configured) return fail('Resend belum dikonfigurasi. Isi RESEND_API_KEY di environment, lalu deploy ulang.')

  const mode = formData.get('mode') === 'test' ? 'test' : 'send'
  const templateRaw = String(formData.get('template') ?? '')
  const template = (TEMPLATE_KEYS as string[]).includes(templateRaw) ? (templateRaw as TemplateKey) : 'free'
  const subject = oneLine(String(formData.get('subject') ?? ''))
  const body = String(formData.get('body') ?? '').trim()
  const ctaFlags = {
    coba: formData.get('cta_coba') === 'on',
    daftar: formData.get('cta_daftar') === 'on',
    aktivasi: formData.get('cta_aktivasi') === 'on',
  }
  const planRaw = formData.get('invite_plan')
  const invitePlan = isInvitePlan(planRaw) ? planRaw : INVITE.defaultPlan

  if (!subject) return fail('Subjek belum diisi.')
  if (subject.length > EMAIL_LIMITS.subjectMax) return fail(`Subjek maksimal ${EMAIL_LIMITS.subjectMax} karakter.`)
  if (body.length < EMAIL_LIMITS.bodyMin) return fail('Isi email terlalu pendek.')
  if (body.length > EMAIL_LIMITS.bodyMax) return fail(`Isi email maksimal ${EMAIL_LIMITS.bodyMax} karakter.`)

  let recipients
  if (mode === 'test') {
    if (!admin.email) return fail('Akun admin nggak punya email.')
    recipients = [{ email: admin.email.toLowerCase(), name: '' }]
  } else {
    const parsed = parseRecipients(String(formData.get('recipients') ?? ''))
    if (parsed.invalid.length > 0) {
      return fail(`Ada ${parsed.invalid.length} baris yang bukan email: ${parsed.invalid.slice(0, 3).join(' | ')}. Benerin dulu, belum ada yang dikirim.`)
    }
    if (parsed.valid.length === 0) return fail('Belum ada penerima.')
    if (parsed.valid.length > EMAIL_LIMITS.maxRecipientsPerSend) {
      return fail(`Maksimal ${EMAIL_LIMITS.maxRecipientsPerSend} penerima sekali kirim (sekarang ${parsed.valid.length}).`)
    }
    recipients = parsed.valid
  }

  const db = serviceClient()

  // Tabel log harus ada: nggak mau mengirim email yang nggak tercatat.
  if (!(await tableExists(db, 'email_logs'))) return fail('Tabel email_logs belum ada. Jalankan scripts/email_schema.sql di Supabase dulu.')

  if (ctaFlags.aktivasi) {
    if (!(await tableExists(db, 'beta_invites'))) return fail('Tabel beta_invites belum ada. Jalankan scripts/beta_invites_schema.sql di Supabase dulu.')
  }


  if (mode === 'send') {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await db
      .from('email_logs')
      .select('id', { head: true, count: 'exact' })
      .eq('status', 'terkirim')
      .neq('template', 'test')
      .gte('created_at', dayAgo)
    if ((count ?? 0) + recipients.length > EMAIL_LIMITS.maxPerDay) {
      return fail(`Batas ${EMAIL_LIMITS.maxPerDay} email per 24 jam akan terlewati (sudah ${count ?? 0}). Belum ada yang dikirim.`)
    }
  }

  // Cegah email dobel (klik ganda atau refresh): lewati yang sudah menerima subjek sama dalam 10 menit terakhir.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recent } = await db
    .from('email_logs')
    .select('to_email, subject')
    .eq('status', 'terkirim')
    .in('to_email', recipients.map((r) => r.email))
    .gte('created_at', tenMinAgo)
  const already = new Set((recent ?? []).map((r) => `${String(r.to_email).toLowerCase()}|${r.subject}`))

  const results: SendResultRow[] = []
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i]
    const finalSubject = renderEmail({ subject, body, recipient: r }).subject

    if (already.has(`${r.email}|${finalSubject}`)) {
      results.push({ email: r.email, ok: false, note: 'Dilewati: baru saja dikirim.' })
      continue
    }

    // Undangan unik per penerima (link aktivasi). Dibuat sebelum kirim, dicabut kalau pengiriman gagal.
    let inviteId: string | null = null
    let activationUrl: string | undefined
    if (ctaFlags.aktivasi) {
      const inv = await createInvite(r.email, invitePlan, admin.id)
      if (!inv.ok) {
        results.push({ email: r.email, ok: false, note: inv.error })
        continue
      }
      inviteId = inv.id
      activationUrl = inv.invite.url
    }

    const rendered = renderEmail({ subject, body, recipient: r, ctas: buildCtas(ctaFlags, siteUrl(), activationUrl) })
    const sent = await sendOne({ to: r.email, subject: rendered.subject, html: rendered.html, text: rendered.text }, { idempotencyKey: randomUUID() })
    if (!sent.ok && inviteId) await revokeInviteById(inviteId)
    await db.from('email_logs').insert({
      to_email: r.email,
      subject: rendered.subject,
      template: mode === 'test' ? 'test' : template,
      status: sent.ok ? 'terkirim' : 'gagal',
      provider_id: sent.ok ? sent.id : null,
      error: sent.ok ? null : sent.error,
      sent_by: admin.id,
    })
    results.push({ email: r.email, ok: sent.ok, note: sent.ok ? undefined : sent.error })
    if (i < recipients.length - 1) await new Promise((resolve) => setTimeout(resolve, 150)) // di bawah batas 10 request per detik
  }

  revalidatePath('/north/email')
  const okCount = results.filter((x) => x.ok).length
  const failCount = results.length - okCount
  return {
    status: okCount > 0 ? 'ok' : 'error',
    message:
      mode === 'test'
        ? okCount > 0
          ? `Email tes terkirim ke ${recipients[0].email}.`
          : 'Email tes gagal terkirim.'
        : `${okCount} terkirim${failCount ? `, ${failCount} gagal atau dilewati` : ''}.`,
    results,
  }
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://bikinmacro.my.id').replace(/\/+$/, '')
}

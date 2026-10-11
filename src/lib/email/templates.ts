import { FOOTER_TEXT } from './config'
import type { Recipient } from './recipients'

const BRAND = '#007a4e'
const NAVY = '#051c2c'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Satu baris saja: buang newline dan karakter kontrol (subjek email). */
export function oneLine(s: string): string {
  return s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export type RenderInput = {
  subject: string
  body: string
  recipient: Recipient
  /** Tombol ajakan di bawah isi email. */
  cta?: { label: string; url: string } | null
}

export type RenderedEmail = { subject: string; html: string; text: string }

function fillName(s: string, recipient: Recipient): string {
  return s.replace(/\{nama\}/gi, recipient.name || 'kamu')
}

/** Isi email -> HTML aman. Paragraf dipisah baris kosong, baris tunggal jadi <br>. Semua teks di-escape. */
export function renderEmail({ subject, body, recipient, cta }: RenderInput): RenderedEmail {
  const finalSubject = oneLine(fillName(subject, recipient))
  const filledBody = fillName(body, recipient).replace(/\r\n/g, '\n').trim()
  const greeting = recipient.name ? `Halo ${recipient.name},` : 'Halo,'

  const paragraphs = filledBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const htmlParagraphs = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td bgcolor="${BRAND}" style="border-radius:8px;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(cta.label)}</a></td></tr></table>`
    : ''

  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(finalSubject)}</title></head>
<body style="margin:0;padding:0;background:#f4f7f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
<tr><td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 20px;font-size:18px;font-weight:800;color:${NAVY};">BikinMacro</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(greeting)}</p>
${htmlParagraphs}
${button}
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">${escapeHtml(FOOTER_TEXT)}</td></tr>
</table></td></tr></table>
</body></html>`

  const text = [greeting, '', filledBody, ...(cta ? ['', `${cta.label}: ${cta.url}`] : []), '', '--', FOOTER_TEXT].join('\n')

  return { subject: finalSubject, html, text }
}

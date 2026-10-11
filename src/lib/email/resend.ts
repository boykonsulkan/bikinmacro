// Klien Resend tipis lewat fetch (tanpa dependensi). Hanya dipakai di server.
// API key dibaca dari env RESEND_API_KEY dan TIDAK PERNAH masuk ke pesan error atau log.

const ENDPOINT = 'https://api.resend.com/emails'
const SANDBOX_FROM = 'BikinMacro <onboarding@resend.dev>'

export type EmailConfig = {
  configured: boolean
  from: string
  replyTo: string | undefined
  /** Pengirim masih sandbox Resend: cuma bisa kirim ke email pemilik akun Resend. */
  sandbox: boolean
}

export function emailConfig(env: Record<string, string | undefined> = process.env): EmailConfig {
  const key = env.RESEND_API_KEY?.trim()
  const from = env.EMAIL_FROM?.trim() || SANDBOX_FROM
  return {
    configured: !!key && key.startsWith('re_'),
    from,
    replyTo: env.EMAIL_REPLY_TO?.trim() || undefined,
    sandbox: /@resend\.dev>?$/i.test(from),
  }
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string }

export type SendOptions = {
  apiKey?: string
  from?: string
  replyTo?: string
  /** Mencegah email dobel kalau permintaan yang sama terkirim ulang (berlaku 24 jam di Resend). */
  idempotencyKey?: string
  fetchImpl?: typeof fetch
  /** Jeda sebelum mengulang sekali saat kena 429 (ms). */
  retryDelayMs?: number
}

type Message = { to: string; subject: string; html: string; text: string }

function describeError(status: number, body: unknown): string {
  const b = (body ?? {}) as { message?: unknown; name?: unknown }
  const msg = typeof b.message === 'string' ? b.message : ''
  if (status === 401 || status === 403) return 'API key Resend ditolak. Cek RESEND_API_KEY.'
  if (status === 429) return 'Kena batas kirim Resend. Coba lagi sebentar.'
  if (status === 422 && /domain|verif/i.test(msg)) return `Domain pengirim belum diverifikasi di Resend. (${msg.slice(0, 120)})`
  if (status === 403 && /testing emails|own email/i.test(msg)) return 'Pengirim sandbox cuma bisa kirim ke email pemilik akun Resend. Verifikasi domain dulu.'
  return (msg || `Resend membalas HTTP ${status}.`).slice(0, 200)
}

export async function sendOne(msg: Message, opts: SendOptions = {}): Promise<SendResult> {
  const apiKey = (opts.apiKey ?? process.env.RESEND_API_KEY ?? '').trim()
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY belum diisi.' }
  const f = opts.fetchImpl ?? fetch
  const cfg = emailConfig()

  const body = JSON.stringify({
    from: opts.from ?? cfg.from,
    to: [msg.to],
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    ...((opts.replyTo ?? cfg.replyTo) ? { reply_to: opts.replyTo ?? cfg.replyTo } : {}),
  })

  const attempt = async (): Promise<{ status: number; json: unknown } | { network: string }> => {
    try {
      const res = await f(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      return { status: res.status, json: await res.json().catch(() => ({})) }
    } catch (e) {
      return { network: e instanceof Error && e.name === 'TimeoutError' ? 'Resend nggak menjawab (timeout).' : 'Nggak bisa menghubungi Resend.' }
    }
  }

  let r = await attempt()
  if ('status' in r && r.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, opts.retryDelayMs ?? 1200))
    r = await attempt()
  }

  if ('network' in r) return { ok: false, error: r.network }
  if (r.status >= 200 && r.status < 300) {
    const id = (r.json as { id?: unknown }).id
    return typeof id === 'string' ? { ok: true, id } : { ok: false, error: 'Resend membalas tanpa id email.' }
  }
  return { ok: false, error: describeError(r.status, r.json) }
}

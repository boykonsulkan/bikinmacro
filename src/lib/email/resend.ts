// Klien Resend tipis lewat fetch (tanpa dependensi). Hanya dipakai di server.
// API key dibaca dari env RESEND_API_KEY dan TIDAK PERNAH masuk ke pesan error atau log.

const ENDPOINT = 'https://api.resend.com/emails'
const SANDBOX_FROM = 'BikinMacro <onboarding@resend.dev>'

// Balasan penerima masuk ke sini kalau EMAIL_REPLY_TO nggak diisi. Sementara, sampai alamat balasan resmi ada.
export const DEFAULT_REPLY_TO = 'founder@pelajarin.id'

export type EmailConfig = {
  configured: boolean
  from: string
  replyTo: string
  /** True kalau replyTo memakai bawaan (EMAIL_REPLY_TO kosong). */
  replyToIsDefault: boolean
  /** Pengirim masih sandbox Resend: cuma bisa kirim ke email pemilik akun Resend. */
  sandbox: boolean
}

export function emailConfig(env: Record<string, string | undefined> = process.env): EmailConfig {
  const key = env.RESEND_API_KEY?.trim()
  const from = env.EMAIL_FROM?.trim() || SANDBOX_FROM
  return {
    configured: !!key && key.startsWith('re_'),
    from,
    replyTo: env.EMAIL_REPLY_TO?.trim() || DEFAULT_REPLY_TO,
    replyToIsDefault: !env.EMAIL_REPLY_TO?.trim(),
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
  // Kode status dan nama error ikut ditampilkan supaya penyebab asli kelihatan di riwayat kirim.
  const tag = `HTTP ${status}${typeof b.name === 'string' ? ` ${b.name}` : ''}`

  if (status === 429) return `Kena batas kirim Resend. Coba lagi sebentar. (${tag})`
  // 401 = key nggak valid. 403 BUKAN soal key: Resend memakai 403 untuk pengirim sandbox dan domain yang belum diverifikasi.
  if (status === 401) return `API key Resend ditolak (nggak valid atau sudah dicabut). Cek RESEND_API_KEY. (${tag})`
  if (/testing emails|own email address/i.test(msg)) {
    return `Pengirim sandbox (onboarding@resend.dev) cuma bisa kirim ke email pemilik akun Resend. Verifikasi domain di Resend, lalu isi EMAIL_FROM dengan alamat di domain itu. (${tag})`
  }
  if (/domain/i.test(msg) && /verif/i.test(msg)) {
    return `Domain pengirim belum diverifikasi di Resend. Selesaikan record DNS-nya di dashboard Resend. (${tag})`
  }
  if (status === 403 && /restrict|permission|sending access|not allowed/i.test(msg)) {
    return `API key Resend nggak punya izin untuk domain pengirim ini. Pakai key Full access, atau key yang dibatasi ke domain yang benar. (${tag})`
  }
  return `${(msg || 'Resend membalas error.').slice(0, 150)} (${tag})`
}

export type DomainCheck =
  | { state: 'sandbox' }
  | { state: 'verified' | 'pending' | 'gagal'; domain: string }
  | { state: 'tidak_ada'; domain: string }
  | { state: 'tidak_bisa_dicek'; detail: string }

/** Domain dari alamat pengirim: "Nama <halo@x.id>" atau "halo@x.id" -> "x.id". */
export function senderDomain(from: string): string | null {
  const m = from.match(/@([A-Za-z0-9.-]+.[A-Za-z]{2,})>?s*$/)
  return m ? m[1].toLowerCase() : null
}

/**
 * Cek status verifikasi domain pengirim di Resend (hanya baca). Butuh key dengan izin membaca domain;
 * key yang cuma "Sending access" nggak bisa mengeceknya, dan itu bukan berarti domainnya bermasalah.
 */
export async function checkSenderDomain(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<DomainCheck> {
  const cfg = emailConfig(env)
  if (cfg.sandbox) return { state: 'sandbox' }
  const domain = senderDomain(cfg.from)
  const key = env.RESEND_API_KEY?.trim()
  if (!domain || !key) return { state: 'tidak_bisa_dicek', detail: 'Alamat pengirim atau key belum lengkap.' }
  try {
    const res = await fetchImpl('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6000),
    })
    const json = (await res.json().catch(() => ({}))) as { data?: { name?: string; status?: string }[]; message?: string }
    if (!res.ok) {
      return { state: 'tidak_bisa_dicek', detail: res.status === 401 || res.status === 403 ? 'Key ini nggak boleh membaca daftar domain (mungkin Sending access saja).' : `HTTP ${res.status}` }
    }
    const found = (json.data ?? []).find((d) => d.name?.toLowerCase() === domain)
    if (!found) return { state: 'tidak_ada', domain }
    if (found.status === 'verified') return { state: 'verified', domain }
    return { state: found.status === 'failed' || found.status === 'temporary_failure' ? 'gagal' : 'pending', domain }
  } catch {
    return { state: 'tidak_bisa_dicek', detail: 'Nggak bisa menghubungi Resend.' }
  }
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

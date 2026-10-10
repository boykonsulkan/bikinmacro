'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { AlertCircle, Download, FileSpreadsheet, Loader2, Send } from 'lucide-react'
import { ORDER_LIMITS, PAYMENT_LABEL, PLANS, STATUS_LABEL } from '@/lib/orders/config'
import type { PaymentStatus, PlanKey, OrderStatus } from '@/lib/orders/config'
import { formatBytes, formatDateTime, loadOrderToken } from './format'

type OrderDto = {
  code: string
  plan: PlanKey
  status: OrderStatus
  paymentStatus: PaymentStatus
  description: string
  outputsTotal: number
  outputsDelivered: number
  revisionsTotal: number
  revisionsUsed: number
  createdAt: string
}
type FileDto = { id: string; kind: 'contoh' | 'hasil'; name: string; size_bytes: number; created_at: string }
type MessageDto = { id: string; sender: 'pembeli' | 'admin'; body: string; created_at: string }
type Payload = { order: OrderDto; files: FileDto[]; messages: MessageDto[] }

const card = 'rounded-2xl border border-border bg-card p-6 shadow-soft'
const POLL_MS = 10_000

// Token ada di bagian # URL (nggak pernah dikirim ke server). Cadangan: localStorage.
function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
function readToken(code: string): string {
  return window.location.hash.replace(/^#/, '').trim() || loadOrderToken(code) || ''
}

export default function OrderView({ code }: { code: string }) {
  // null = belum tahu (render server), '' = nggak ada token.
  const token = useSyncExternalStore<string | null>(subscribeHash, () => readToken(code), () => null)
  const [data, setData] = useState<Payload | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/orders/${code}`, { headers: { 'x-order-token': token }, cache: 'no-store' })
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (!res.ok) return
      setNotFound(false)
      setData((await res.json()) as Payload)
    } catch {
      /* jaringan putus: biarkan data lama, coba lagi di polling berikutnya */
    }
  }, [code, token])

  useEffect(() => {
    if (!token) return
    // Muat sekali segera, lalu polling tiap POLL_MS selama tab kelihatan.
    const first = setTimeout(() => void load(), 0)
    const id = setInterval(() => {
      if (!document.hidden) void load()
    }, POLL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [token, load])

  const count = data?.messages.length ?? 0
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [count])

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!token || sending || !text.trim()) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch(`/api/orders/${code}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-order-token': token },
        body: JSON.stringify({ body: text }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setText('')
        await load()
      } else {
        setSendError(json.error ?? 'Pesan belum terkirim.')
      }
    } catch {
      setSendError('Koneksi bermasalah. Coba kirim lagi.')
    } finally {
      setSending(false)
    }
  }

  async function download(file: FileDto) {
    if (!token) return
    setDownloadError('')
    try {
      const res = await fetch(`/api/orders/${code}/files/${file.id}`, { headers: { 'x-order-token': token } })
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch {
      setDownloadError('File belum bisa diunduh. Coba lagi.')
    }
  }

  const invalid = notFound || token === ''
  if (!invalid && (token === null || !data)) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-muted" role="status">
        <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Membuka pesanan...
      </p>
    )
  }

  if (invalid || !data) {
    return (
      <div className={card} role="alert">
        <h1 className="text-xl font-extrabold text-card-foreground">Pesanan nggak bisa dibuka</h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
          Link-nya belum lengkap atau salah. Buka lewat link lengkap yang kamu simpan saat mengirim pesanan (yang ada
          tanda # di ujungnya). Kalau link-nya hilang, hubungi kami dengan menyebut kode pesanan{' '}
          <span className="font-mono font-bold">{code}</span>.
        </p>
        <Link href="/help" className="mt-4 inline-block text-sm font-bold text-accent-ink underline">
          Ke halaman Bantuan
        </Link>
      </div>
    )
  }

  const { order, files, messages } = data
  const chatClosed = order.status === 'dibatalkan' || order.paymentStatus === 'ditolak'
  const revisionsLeft = Math.max(0, order.revisionsTotal - order.revisionsUsed)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs font-semibold text-accent-ink">{order.code}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Pesanan {PLANS[order.plan]?.label ?? order.plan}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-navy px-3 py-1 text-white">{STATUS_LABEL[order.status] ?? order.status}</span>
          <span className="rounded-full border border-border px-3 py-1 text-foreground">
            {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
          </span>
          <span className="rounded-full border border-border px-3 py-1 text-foreground">
            Output {order.outputsDelivered}/{order.outputsTotal}
          </span>
          <span className="rounded-full border border-border px-3 py-1 text-foreground">
            Sisa revisi {revisionsLeft}/{order.revisionsTotal}
          </span>
        </div>
      </div>

      <section className={card} aria-labelledby="ceritamu">
        <h2 id="ceritamu" className="text-xs font-semibold tracking-wide text-muted">Cerita kerjaan kamu</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-card-foreground">{order.description}</p>
      </section>

      <section className={card} aria-labelledby="file-heading">
        <h2 id="file-heading" className="text-xs font-semibold tracking-wide text-muted">File</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg bg-surface p-3">
              <FileSpreadsheet size={20} strokeWidth={1.5} className="shrink-0 text-accent-ink" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-semibold text-card-foreground">{f.name}</p>
                <p className="text-xs font-medium text-muted">
                  {f.kind === 'hasil' ? 'Hasil dari kami' : 'Contoh file kamu'} · {formatBytes(f.size_bytes)} · {formatDateTime(f.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void download(f)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:border-foreground/30"
                aria-label={`Download ${f.name}`}
              >
                <Download size={14} aria-hidden="true" />
                Download
              </button>
            </li>
          ))}
        </ul>
        {!files.some((f) => f.kind === 'hasil') && (
          <p className="mt-3 text-sm font-medium text-muted">File hasil belum ada. Kami kabari lewat chat kalau sudah jadi.</p>
        )}
        {downloadError && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{downloadError}</p>}
      </section>

      <section className={card} aria-labelledby="chat-heading">
        <h2 id="chat-heading" className="text-xs font-semibold tracking-wide text-muted">Chat pesanan</h2>
        <p className="mt-1 text-xs font-medium text-muted">
          Buat minta revisi atau tanya seputar pesanan ini saja. Sisa revisi kamu {revisionsLeft} dari {order.revisionsTotal}.
        </p>

        <div className="mt-4 max-h-96 min-h-32 overflow-y-auto rounded-xl bg-surface p-3" role="log" aria-live="polite" aria-label="Isi chat">
          {messages.length === 0 && (
            <p className="p-3 text-center text-sm font-medium text-muted">Belum ada pesan. Tulis kalau ada yang mau kamu tanyakan.</p>
          )}
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className={`flex flex-col ${m.sender === 'pembeli' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm font-medium ${
                    m.sender === 'pembeli' ? 'bg-navy text-white' : 'border border-border bg-card text-card-foreground'
                  }`}
                >
                  {m.body}
                </div>
                <span className="mt-1 text-[11px] font-medium text-muted">
                  {m.sender === 'pembeli' ? 'Kamu' : 'BikinMacro'} · {formatDateTime(m.created_at)}
                </span>
              </li>
            ))}
          </ul>
          <div ref={endRef} />
        </div>

        {chatClosed ? (
          <p className="mt-4 text-sm font-semibold text-muted">Chat pesanan ini sudah ditutup.</p>
        ) : (
          <form onSubmit={send} className="mt-4 flex flex-col gap-2">
            <label htmlFor="pesan" className="sr-only">Tulis pesan</label>
            <textarea
              id="pesan"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={ORDER_LIMITS.message.max}
              placeholder="Tulis pesan atau permintaan revisi kamu"
              className="w-full resize-y rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground placeholder:text-muted/70"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted">{text.length}/{ORDER_LIMITS.message.max}</span>
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-action px-5 text-sm font-bold text-white transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
                Kirim
              </button>
            </div>
            {sendError && (
              <p role="alert" className="flex items-start gap-2 text-xs font-semibold text-danger">
                <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {sendError}
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  )
}

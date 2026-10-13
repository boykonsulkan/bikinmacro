import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ORDER_LIMITS, ORDER_STATUSES, PAYMENT_LABEL, PAYMENT_STATUSES, PLANS, STATUS_LABEL } from '@/lib/orders/config'
import type { PlanKey } from '@/lib/orders/config'
import { ORDER_COLUMNS, getAdminForPage, serviceClient } from '@/lib/orders/server'
import type { OrderFileRow, OrderMessageRow, OrderRow } from '@/lib/orders/server'
import { formatBytes, formatDateTime } from '@/components/pesan/format'
import { sendAdminMessage, updateOrder } from '../actions'
import { ResetLink, UploadResult } from './AdminTools'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const card = 'rounded-2xl border border-border bg-card p-6 shadow-sm'
const field =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground'
const label = 'text-xs font-semibold text-muted'

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  if (!(await getAdminForPage())) redirect('/north/login')
  const { id } = await params
  const { error, ok } = await searchParams
  if (!UUID_RE.test(id)) notFound()

  const db = serviceClient()
  const { data: order } = await db.from('orders').select(ORDER_COLUMNS).eq('id', id).maybeSingle<OrderRow>()
  if (!order) notFound()

  const [{ data: files }, { data: messages }] = await Promise.all([
    db.from('order_files').select('id, kind, name, size_bytes, created_at').eq('order_id', id).order('created_at'),
    db.from('order_messages').select('id, sender, body, created_at').eq('order_id', id).order('created_at').limit(500),
  ])
  const fileList = (files ?? []) as Pick<OrderFileRow, 'id' | 'kind' | 'name' | 'size_bytes' | 'created_at'>[]
  const msgList = (messages ?? []) as Pick<OrderMessageRow, 'id' | 'sender' | 'body' | 'created_at'>[]

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/north/orders" className="text-xs font-semibold text-muted hover:text-foreground">
          &larr; Semua pesanan
        </Link>
        <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">{order.code}</h1>
        <p className="mt-1 text-sm text-muted">
          {PLANS[order.plan as PlanKey]?.label ?? order.plan} &middot; {formatDateTime(order.created_at)}
        </p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-warning-border bg-warning-bg p-3 text-sm font-semibold text-warning-ink">{error}</p>}
      {ok && <p role="status" className="rounded-lg border border-border bg-card p-3 text-sm font-semibold text-accent-ink">Tersimpan.</p>}

      <section className={card}>
        <h2 className="text-sm font-bold text-card-foreground">Pembeli</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className={label}>Email</dt>
            <dd className="font-medium text-card-foreground">
              <a href={`mailto:${order.email}`} className="text-accent-ink hover:underline">{order.email}</a>
            </dd>
          </div>
          <div>
            <dt className={label}>Nomor order Midtrans</dt>
            <dd className="font-mono font-medium text-card-foreground">{order.midtrans_order_id}</dd>
          </div>
        </dl>
        <h3 className={`${label} mt-4`}>Cerita kerjaan</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-card-foreground">{order.description}</p>
      </section>

      <section className={card}>
        <h2 className="text-sm font-bold text-card-foreground">Status</h2>
        <form action={updateOrder} className="mt-3 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={order.id} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="payment_status" className={label}>Pembayaran</label>
            <select id="payment_status" name="payment_status" defaultValue={order.payment_status} className={field}>
              {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className={label}>Status pesanan</label>
            <select id="status" name="status" defaultValue={order.status} className={field}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="outputs_delivered" className={label}>Output terkirim (dari {order.outputs_total})</label>
            <input id="outputs_delivered" name="outputs_delivered" type="number" min={0} max={order.outputs_total} defaultValue={order.outputs_delivered} className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="revisions_used" className={label}>Revisi terpakai (dari {order.revisions_total})</label>
            <input id="revisions_used" name="revisions_used" type="number" min={0} max={order.revisions_total} defaultValue={order.revisions_used} className={field} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-action px-5 text-sm font-bold text-white hover:bg-action-hover">
              Simpan
            </button>
          </div>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-sm font-bold text-card-foreground">File</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {fileList.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg bg-surface p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono font-semibold text-card-foreground">{f.name}</p>
                <p className="text-xs text-muted">
                  {f.kind === 'hasil' ? 'Hasil' : 'Contoh pembeli'} &middot; {formatBytes(f.size_bytes)} &middot; {formatDateTime(f.created_at)}
                </p>
              </div>
              <a href={`/api/north/orders/${order.id}/files/${f.id}`} className="text-sm font-bold text-accent-ink hover:underline">
                Download
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-border pt-4">
          <UploadResult orderId={order.id} />
        </div>
      </section>

      <section className={card}>
        <h2 className="text-sm font-bold text-card-foreground">Chat</h2>
        <div className="mt-3 max-h-96 overflow-y-auto rounded-xl bg-surface p-3">
          {msgList.length === 0 && <p className="p-3 text-center text-sm text-muted">Belum ada pesan.</p>}
          <ul className="flex flex-col gap-3">
            {msgList.map((m) => (
              <li key={m.id} className={`flex flex-col ${m.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm font-medium ${m.sender === 'admin' ? 'bg-navy text-white' : 'border border-border bg-card text-card-foreground'}`}>
                  {m.body}
                </div>
                <span className="mt-1 text-[11px] text-muted">{m.sender === 'admin' ? 'Admin' : 'Pembeli'} &middot; {formatDateTime(m.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
        <form action={sendAdminMessage} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="id" value={order.id} />
          <label htmlFor="body" className="sr-only">Balasan</label>
          <textarea id="body" name="body" rows={3} required maxLength={ORDER_LIMITS.message.max} placeholder="Tulis balasan untuk pembeli" className={field} />
          <button type="submit" className="inline-flex h-10 w-fit items-center rounded-lg bg-action px-5 text-sm font-bold text-white hover:bg-action-hover">
            Kirim balasan
          </button>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-sm font-bold text-card-foreground">Link pembeli hilang?</h2>
        <p className="mb-3 mt-1 text-xs text-muted">Link pesanan nggak bisa dilihat ulang karena yang tersimpan cuma hash-nya. Bikin yang baru dan kirim ke email pembeli.</p>
        <ResetLink orderId={order.id} />
      </section>
    </div>
  )
}

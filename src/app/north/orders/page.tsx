import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PAYMENT_LABEL, PLANS, STATUS_LABEL } from '@/lib/orders/config'
import type { PaymentStatus, PlanKey, OrderStatus } from '@/lib/orders/config'
import { getAdminForPage, serviceClient } from '@/lib/orders/server'
import { formatDateTime } from '@/components/pesan/format'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  if (!(await getAdminForPage())) redirect('/north/login')

  const db = serviceClient()
  const { data: orders, error } = await db
    .from('orders')
    .select('id, code, email, plan, payment_status, status, outputs_total, outputs_delivered, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  // Pesan terakhir tiap pesanan: kalau dari pembeli, berarti menunggu balasan.
  const { data: recent } = await db
    .from('order_messages')
    .select('order_id, sender, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  const lastSender = new Map<string, string>()
  for (const m of recent ?? []) if (!lastSender.has(m.order_id)) lastSender.set(m.order_id, m.sender)

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pesanan</h1>
        <p className="mt-1 text-sm text-muted">Pesanan per use case dari form /pesan. Cek pembayaran di dashboard Midtrans, lalu kerjakan.</p>
      </div>

      {error && (
        <p className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm font-semibold text-warning-ink">
          Tabel pesanan belum bisa dibaca. Sudah menjalankan scripts/orders_schema.sql di Supabase?
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-excel-head text-xs font-semibold text-muted">
              <tr>
                <th className="px-5 py-3">Kode</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Paket</th>
                <th className="px-5 py-3">Pembayaran</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Output</th>
                <th className="px-5 py-3">Chat</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    <Link href={`/north/orders/${o.id}`} className="font-mono font-bold text-accent-ink hover:underline">
                      {o.code}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(o.created_at)}</td>
                  <td className="px-5 py-3 text-card-foreground">{o.email}</td>
                  <td className="px-5 py-3 text-card-foreground">{PLANS[o.plan as PlanKey]?.label ?? o.plan}</td>
                  <td className="px-5 py-3 text-card-foreground">{PAYMENT_LABEL[o.payment_status as PaymentStatus] ?? o.payment_status}</td>
                  <td className="px-5 py-3 text-card-foreground">{STATUS_LABEL[o.status as OrderStatus] ?? o.status}</td>
                  <td className="px-5 py-3 text-card-foreground">{o.outputs_delivered}/{o.outputs_total}</td>
                  <td className="px-5 py-3">
                    {lastSender.get(o.id) === 'pembeli' ? (
                      <span className="rounded-full bg-warning-bg px-2.5 py-1 text-xs font-bold text-warning-ink">Menunggu balasan</span>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {(orders ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-muted">Belum ada pesanan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

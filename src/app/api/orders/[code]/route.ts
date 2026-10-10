import { NextResponse } from 'next/server'
import { getOrderByAccess, serviceClient } from '@/lib/orders/server'
import type { OrderFileRow, OrderMessageRow } from '@/lib/orders/server'

const NO_STORE = { 'Cache-Control': 'no-store' }

// Ringkasan pesanan + file + chat. Token dikirim lewat header x-order-token
// (bukan di URL) supaya nggak masuk log server.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const order = await getOrderByAccess(code, req.headers.get('x-order-token'))
  if (!order) {
    return NextResponse.json({ error: 'Pesanan nggak ketemu atau link-nya nggak valid.' }, { status: 404, headers: NO_STORE })
  }

  const db = serviceClient()
  const [{ data: files }, { data: messages }] = await Promise.all([
    db.from('order_files').select('id, kind, name, size_bytes, created_at').eq('order_id', order.id).order('created_at'),
    db.from('order_messages').select('id, sender, body, created_at').eq('order_id', order.id).order('created_at').limit(500),
  ])

  return NextResponse.json(
    {
      order: {
        code: order.code,
        plan: order.plan,
        status: order.status,
        paymentStatus: order.payment_status,
        description: order.description,
        outputsTotal: order.outputs_total,
        outputsDelivered: order.outputs_delivered,
        revisionsTotal: order.revisions_total,
        revisionsUsed: order.revisions_used,
        createdAt: order.created_at,
      },
      files: (files ?? []) as Pick<OrderFileRow, 'id' | 'kind' | 'name' | 'size_bytes' | 'created_at'>[],
      messages: (messages ?? []) as Pick<OrderMessageRow, 'id' | 'sender' | 'body' | 'created_at'>[],
    },
    { headers: NO_STORE },
  )
}

import { NextResponse } from 'next/server'
import { ORDER_LIMITS } from '@/lib/orders/config'
import { getOrderByAccess, serviceClient } from '@/lib/orders/server'
import { validateMessage } from '@/lib/orders/validate'

// Pesan baru dari pembeli. Batas isi dan jumlah pesan diatur di lib/orders/config.ts.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const order = await getOrderByAccess(code, req.headers.get('x-order-token'))
  if (!order) {
    return NextResponse.json({ error: 'Pesanan nggak ketemu atau link-nya nggak valid.' }, { status: 404 })
  }
  if (order.status === 'dibatalkan' || order.payment_status === 'ditolak') {
    return NextResponse.json({ error: 'Chat pesanan ini sudah ditutup.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = (await req.json())?.body
  } catch {
    return NextResponse.json({ error: 'Permintaan nggak terbaca.' }, { status: 400 })
  }
  const msg = validateMessage(body)
  if (!msg.ok) return NextResponse.json({ error: msg.error }, { status: 400 })

  const db = serviceClient()
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [{ count: total }, { count: lastHour }] = await Promise.all([
    db.from('order_messages').select('id', { count: 'exact', head: true }).eq('order_id', order.id),
    db
      .from('order_messages')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', order.id)
      .eq('sender', 'pembeli')
      .gte('created_at', hourAgo),
  ])
  if ((total ?? 0) >= ORDER_LIMITS.messagesPerOrder) {
    return NextResponse.json({ error: 'Batas jumlah pesan di pesanan ini sudah tercapai.' }, { status: 429 })
  }
  if ((lastHour ?? 0) >= ORDER_LIMITS.buyerMessagesPerHour) {
    return NextResponse.json({ error: 'Terlalu banyak pesan dalam satu jam. Coba lagi nanti.' }, { status: 429 })
  }

  const { data, error } = await db
    .from('order_messages')
    .insert({ order_id: order.id, sender: 'pembeli', body: msg.value })
    .select('id, sender, body, created_at')
    .single()
  if (error) {
    console.error('order message insert failed', error)
    return NextResponse.json({ error: 'Pesan belum terkirim. Coba lagi.' }, { status: 500 })
  }
  return NextResponse.json({ message: data }, { status: 201 })
}

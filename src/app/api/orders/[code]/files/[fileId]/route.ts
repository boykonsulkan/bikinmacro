import { NextResponse } from 'next/server'
import { STORAGE_BUCKET } from '@/lib/orders/config'
import { getOrderByAccess, serviceClient } from '@/lib/orders/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Unduh file pesanan (contoh milik pembeli atau hasil dari admin). Token lewat header,
// jadi klien mengunduh dengan fetch lalu menyimpan sebagai blob.
export async function GET(req: Request, { params }: { params: Promise<{ code: string; fileId: string }> }) {
  const { code, fileId } = await params
  const order = await getOrderByAccess(code, req.headers.get('x-order-token'))
  if (!order || !UUID_RE.test(fileId)) {
    return NextResponse.json({ error: 'File nggak ketemu.' }, { status: 404 })
  }

  const db = serviceClient()
  const { data: row } = await db
    .from('order_files')
    .select('name, storage_path')
    .eq('id', fileId)
    .eq('order_id', order.id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'File nggak ketemu.' }, { status: 404 })

  const { data: blob, error } = await db.storage.from(STORAGE_BUCKET).download(row.storage_path)
  if (error || !blob) return NextResponse.json({ error: 'File belum bisa diunduh.' }, { status: 500 })

  return new Response(blob, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${row.name.replace(/"/g, '')}"`,
      'Cache-Control': 'no-store',
    },
  })
}

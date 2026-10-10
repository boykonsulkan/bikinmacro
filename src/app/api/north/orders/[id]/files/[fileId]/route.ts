import { NextResponse } from 'next/server'
import { STORAGE_BUCKET } from '@/lib/orders/config'
import { getAdminUser, serviceClient } from '@/lib/orders/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Admin mengunduh file pesanan (contoh pembeli atau hasil).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Nggak punya akses.' }, { status: 401 })
  const { id, fileId } = await params
  if (!UUID_RE.test(id) || !UUID_RE.test(fileId)) return NextResponse.json({ error: 'ID nggak valid.' }, { status: 400 })

  const db = serviceClient()
  const { data: row } = await db
    .from('order_files')
    .select('name, storage_path')
    .eq('id', fileId)
    .eq('order_id', id)
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

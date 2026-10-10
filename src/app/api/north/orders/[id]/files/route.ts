import { NextResponse } from 'next/server'
import { ORDER_LIMITS, STORAGE_BUCKET } from '@/lib/orders/config'
import { getAdminUser, serviceClient } from '@/lib/orders/server'
import { safeFileName } from '@/lib/orders/validate'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED = ['.xlsm', '.xlsx', '.bas']

// Admin mengunggah file hasil (.xlsm utama, .bas bonus) untuk satu pesanan.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Nggak punya akses.' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID nggak valid.' }, { status: 400 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Pilih file dulu.' }, { status: 400 })

  const lower = file.name.toLowerCase()
  const ext = ALLOWED.find((e) => lower.endsWith(e))
  if (!ext) return NextResponse.json({ error: 'Format harus .xlsm, .xlsx, atau .bas.' }, { status: 400 })
  if (file.size <= 0 || file.size > ORDER_LIMITS.resultFileMaxBytes) {
    return NextResponse.json({ error: 'Ukuran file nggak valid (maksimal 4 MB).' }, { status: 400 })
  }
  if (ext !== '.bas') {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    const isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04
    if (!isZip) return NextResponse.json({ error: 'File Excel-nya rusak atau bukan format yang benar.' }, { status: 400 })
  }

  const db = serviceClient()
  const { data: order } = await db.from('orders').select('id').eq('id', id).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pesanan nggak ketemu.' }, { status: 404 })

  const storagePath = `${id}/hasil-${Date.now()}${ext}`
  const { error: uploadError } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, new Uint8Array(await file.arrayBuffer()), { contentType: 'application/octet-stream', upsert: false })
  if (uploadError) {
    console.error('admin file upload failed', uploadError)
    return NextResponse.json({ error: 'File belum bisa diupload.' }, { status: 500 })
  }

  const { error } = await db.from('order_files').insert({
    order_id: id,
    kind: 'hasil',
    name: safeFileName(file.name, `hasil${ext}`),
    storage_path: storagePath,
    size_bytes: file.size,
  })
  if (error) {
    await db.storage.from(STORAGE_BUCKET).remove([storagePath])
    return NextResponse.json({ error: 'File belum bisa disimpan.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}

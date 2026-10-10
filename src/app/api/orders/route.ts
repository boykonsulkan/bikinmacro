import { NextResponse } from 'next/server'
import { ORDER_LIMITS, PLANS, STORAGE_BUCKET, planTotals } from '@/lib/orders/config'
import { hashToken, newCode, newToken, serviceClient } from '@/lib/orders/server'
import { safeFileName, validateOrderInput, validateSampleFile } from '@/lib/orders/validate'

// Pesanan baru dari form /pesan. Tanpa login: pembeli menerima kode pesanan
// dan token rahasia (cuma ditampilkan sekali) untuk membuka halaman pesanan.
export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Form nggak terbaca. Coba kirim ulang.' }, { status: 400 })
  }

  // Honeypot: kolom ini disembunyikan dari manusia, bot biasanya mengisinya.
  if (String(form.get('kontak_tambahan') ?? '').trim() !== '') {
    return NextResponse.json({ error: 'Permintaan ditolak.' }, { status: 400 })
  }

  const parsed = validateOrderInput({
    email: form.get('email'),
    plan: form.get('plan'),
    midtransOrderId: form.get('midtransOrderId'),
    description: form.get('description'),
  })
  const file = form.get('file')
  const fieldErrors: Record<string, string> = parsed.ok ? {} : { ...parsed.errors }

  let fileBytes: Uint8Array | null = null
  if (!(file instanceof File)) {
    fieldErrors.file = 'Upload file contoh kamu (.xlsx).'
  } else {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    const fileError = validateSampleFile(file.name, file.size, head)
    if (fileError) fieldErrors.file = fileError
    else fileBytes = new Uint8Array(await file.arrayBuffer())
  }
  if (Object.keys(fieldErrors).length > 0 || !parsed.ok || !fileBytes || !(file instanceof File)) {
    return NextResponse.json({ error: 'Ada isian yang perlu dibenerin.', fieldErrors }, { status: 400 })
  }

  const order = parsed.value
  const db = serviceClient()

  // Batas pesanan: per email per hari, dan global per jam.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [{ count: perEmail }, { count: perHour }] = await Promise.all([
    db.from('orders').select('id', { count: 'exact', head: true }).ilike('email', order.email.replace(/[\\%_]/g, '\\$&')).gte('created_at', dayAgo),
    db.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', hourAgo),
  ])
  if ((perEmail ?? 0) >= ORDER_LIMITS.ordersPerEmailPerDay || (perHour ?? 0) >= ORDER_LIMITS.ordersPerHourGlobal) {
    return NextResponse.json({ error: 'Terlalu banyak pesanan dalam waktu singkat. Coba lagi nanti.' }, { status: 429 })
  }

  const totals = planTotals(order.plan)
  const token = newToken()

  let created: { id: string; code: string } | null = null
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const { data, error } = await db
      .from('orders')
      .insert({
        code: newCode(),
        access_token_hash: hashToken(token),
        email: order.email,
        plan: order.plan,
        midtrans_order_id: order.midtransOrderId,
        description: order.description,
        outputs_total: totals.outputs,
        revisions_total: totals.revisions,
      })
      .select('id, code')
      .single()

    if (!error) {
      created = data
    } else if (error.code === '23505') {
      // Bentrok unique: kalau karena nomor order Midtrans, berhenti. Kalau cuma kode, coba kode baru.
      if (error.message.includes('midtrans_order_id')) {
        return NextResponse.json(
          { error: 'Nomor order ini sudah dipakai untuk pesanan lain.', fieldErrors: { midtransOrderId: 'Nomor order ini sudah dipakai.' } },
          { status: 409 },
        )
      }
    } else {
      console.error('orders insert failed', error)
      return NextResponse.json({ error: 'Pesanan belum bisa disimpan. Coba lagi sebentar.' }, { status: 500 })
    }
  }
  if (!created) {
    return NextResponse.json({ error: 'Pesanan belum bisa disimpan. Coba lagi sebentar.' }, { status: 500 })
  }

  const storagePath = `${created.id}/contoh-${Date.now()}.xlsx`
  const { error: uploadError } = await db.storage.from(STORAGE_BUCKET).upload(storagePath, fileBytes, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: false,
  })
  if (uploadError) {
    console.error('order file upload failed', uploadError)
    await db.from('orders').delete().eq('id', created.id)
    return NextResponse.json({ error: 'File belum bisa diupload. Coba lagi sebentar.' }, { status: 500 })
  }
  const { error: fileRowError } = await db.from('order_files').insert({
    order_id: created.id,
    kind: 'contoh',
    name: safeFileName(file.name, 'contoh.xlsx'),
    storage_path: storagePath,
    size_bytes: file.size,
  })
  if (fileRowError) {
    console.error('order file row failed', fileRowError)
    await db.storage.from(STORAGE_BUCKET).remove([storagePath])
    await db.from('orders').delete().eq('id', created.id)
    return NextResponse.json({ error: 'Pesanan belum bisa disimpan. Coba lagi sebentar.' }, { status: 500 })
  }

  return NextResponse.json({ code: created.code, token, plan: PLANS[order.plan].label }, { status: 201 })
}

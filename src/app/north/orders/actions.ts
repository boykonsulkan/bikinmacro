'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/orders/config'
import { getAdminUser, hashToken, newToken, serviceClient } from '@/lib/orders/server'
import { validateMessage } from '@/lib/orders/validate'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireAdmin(id: string) {
  const admin = await getAdminUser()
  if (!admin) redirect('/north/login')
  if (!UUID_RE.test(id)) redirect('/north/orders')
}

function fail(id: string, message: string): never {
  redirect(`/north/orders/${id}?error=${encodeURIComponent(message)}`)
}

const toInt = (v: FormDataEntryValue | null, max: number) => {
  const n = Number.parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : null
}

export async function updateOrder(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  await requireAdmin(id)

  const paymentStatus = String(formData.get('payment_status') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!(PAYMENT_STATUSES as string[]).includes(paymentStatus)) fail(id, 'Status pembayaran nggak valid.')
  if (!(ORDER_STATUSES as string[]).includes(status)) fail(id, 'Status pesanan nggak valid.')

  const db = serviceClient()
  const { data: order } = await db.from('orders').select('outputs_total, revisions_total').eq('id', id).maybeSingle()
  if (!order) redirect('/north/orders')

  const delivered = toInt(formData.get('outputs_delivered'), order.outputs_total)
  const used = toInt(formData.get('revisions_used'), order.revisions_total)
  if (delivered === null || used === null) fail(id, 'Output dan revisi harus angka.')

  const { error } = await db
    .from('orders')
    .update({
      payment_status: paymentStatus,
      status,
      outputs_delivered: delivered,
      revisions_used: used,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) fail(id, 'Perubahan belum tersimpan.')

  revalidatePath(`/north/orders/${id}`)
  revalidatePath('/north/orders')
  redirect(`/north/orders/${id}?ok=1`)
}

export async function sendAdminMessage(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  await requireAdmin(id)

  const msg = validateMessage(formData.get('body'))
  if (!msg.ok) fail(id, msg.error)

  const { error } = await serviceClient().from('order_messages').insert({ order_id: id, sender: 'admin', body: msg.value })
  if (error) fail(id, 'Pesan belum terkirim.')

  revalidatePath(`/north/orders/${id}`)
  redirect(`/north/orders/${id}`)
}

/**
 * Buat token baru (link lama langsung mati) untuk pembeli yang kehilangan link.
 * Token cuma dikembalikan sekali ke admin; yang disimpan di database cuma hash-nya.
 */
export async function resetAccessToken(id: string): Promise<{ code: string; token: string } | { error: string }> {
  const admin = await getAdminUser()
  if (!admin) return { error: 'Nggak punya akses.' }
  if (!UUID_RE.test(id)) return { error: 'ID nggak valid.' }

  const token = newToken()
  const { data, error } = await serviceClient()
    .from('orders')
    .update({ access_token_hash: hashToken(token), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('code')
    .maybeSingle()
  if (error || !data) return { error: 'Token belum bisa dibuat ulang.' }
  return { code: data.code as string, token }
}

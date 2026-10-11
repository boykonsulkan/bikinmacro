import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createClient as createSessionClient } from '@/utils/supabase/server'

/** Client dengan service role. HANYA dipakai di server. Melewati RLS, jadi cek akses sendiri. */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Konfigurasi Supabase (service role) belum lengkap.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // tanpa huruf/angka yang mirip

/** Kode pendek yang bisa dibacakan, mis. BM-7K3Q9F. Bukan rahasia. */
export function newCode(): string {
  const bytes = randomBytes(6)
  let out = ''
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return `BM-${out}`
}

/** Token rahasia untuk link pesanan (192 bit). */
export function newToken(): string {
  return randomBytes(24).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function tokenMatches(token: string | null | undefined, storedHash: string): boolean {
  if (!token || token.length > 200) return false
  const a = Buffer.from(hashToken(token), 'hex')
  const b = Buffer.from(storedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export const ORDER_COLUMNS =
  'id, code, email, plan, midtrans_order_id, description, payment_status, status, outputs_total, outputs_delivered, revisions_total, revisions_used, created_at, updated_at'

export type OrderRow = {
  id: string
  code: string
  email: string
  plan: string
  midtrans_order_id: string
  description: string
  payment_status: string
  status: string
  outputs_total: number
  outputs_delivered: number
  revisions_total: number
  revisions_used: number
  created_at: string
  updated_at: string
}

export type OrderFileRow = {
  id: string
  order_id: string
  kind: 'contoh' | 'hasil'
  name: string
  storage_path: string
  size_bytes: number
  created_at: string
}

export type OrderMessageRow = {
  id: string
  order_id: string
  sender: 'pembeli' | 'admin'
  body: string
  created_at: string
}

/** Cari pesanan lewat kode + token rahasia. null kalau nggak cocok (pesan error sengaja disamakan). */
export async function getOrderByAccess(code: string, token: string | null) {
  if (!/^BM-[A-Z0-9]{6}$/.test(code)) return null
  const db = serviceClient()
  const { data } = await db
    .from('orders')
    .select(`${ORDER_COLUMNS}, access_token_hash`)
    .eq('code', code)
    .maybeSingle()
  if (!data || !tokenMatches(token, data.access_token_hash as string)) return null
  const { access_token_hash: _omit, ...order } = data as OrderRow & { access_token_hash: string }
  void _omit
  return order as OrderRow
}

/** Admin yang sedang login (role = admin), atau null. Dipakai halaman, server action, dan route admin. */
export async function getAdminUser() {
  const supabase = await createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

/**
 * Apakah tabel ada? Pakai query GET biasa. JANGAN pakai query HEAD (select(..., { head: true })):
 * supabase-js nggak melaporkan error untuk tabel yang hilang pada HEAD (error kosong, count null),
 * jadi pengecekan seperti itu selalu "lolos" walau tabelnya belum dibuat.
 */
export async function tableExists(db: ReturnType<typeof serviceClient>, table: string): Promise<boolean> {
  const { error } = await db.from(table).select('id').limit(1)
  return !error
}

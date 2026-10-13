import { NextResponse } from 'next/server'
import { getAdminUser, serviceClient } from '@/lib/orders/server'
import { createClient } from '@/utils/supabase/server'

// SEMENTARA (diagnostik kecepatan): mengukur jarak fungsi Vercel ke Supabase. Dihapus setelah wilayah ditentukan.
export const dynamic = 'force-dynamic'

export async function GET() {
  const t0 = Date.now()
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Nggak punya akses.' }, { status: 401 })
  const adminCheckMs = Date.now() - t0

  const db = serviceClient()
  const queries: number[] = []
  for (let i = 0; i < 6; i++) {
    const s = Date.now()
    await db.from('plan_settings').select('plan').limit(1)
    queries.push(Date.now() - s)
  }
  const s2 = Date.now()
  await (await createClient()).auth.getUser()
  const getUserMs = Date.now() - s2

  return NextResponse.json({ region: process.env.VERCEL_REGION ?? 'lokal', adminCheckMs, queryMs: queries, getUserMs })
}

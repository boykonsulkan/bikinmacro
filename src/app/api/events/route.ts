import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { isClientEvent, sanitizeProps } from '@/lib/events/names'
import { trackEvent } from '@/lib/events/server'

/** POST /api/events { name, props }: kejadian dari browser. Hanya nama yang ada di daftar putih yang diterima. */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await req.text()
  if (raw.length > 2000) return NextResponse.json({ error: 'Terlalu besar' }, { status: 413 })
  let body: { name?: unknown; props?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Format salah' }, { status: 400 })
  }
  if (!isClientEvent(body.name)) return NextResponse.json({ error: 'Kejadian tidak dikenal' }, { status: 400 })

  await trackEvent(user.id, body.name, sanitizeProps(body.props))
  return NextResponse.json({ ok: true })
}

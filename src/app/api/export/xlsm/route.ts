import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { AI_LIMITS, REJECTION_MESSAGES, scanVba } from '@/lib/ai/guard'
import { buildXlsm } from '@/lib/xlsm/build'
import { trackEvent } from '@/lib/events/server'
import { rateLimit } from '@/lib/rate'

// Butuh Buffer dan pustaka biner, jadi harus runtime Node (bukan edge).
export const runtime = 'nodejs'

/**
 * GET /api/export/xlsm?generation_id=... : file .xlsm (Excel dengan macro) berisi kode terbaru generasi itu.
 * Kode dibaca dari database (milik pengguna yang login), bukan dari kiriman klien, dan dipindai ulang.
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`xlsm:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Terlalu sering mengunduh. Tunggu sebentar lalu coba lagi.' }, { status: 429 })
  }

  const id = new URL(req.url).searchParams.get('generation_id')
  if (!id) return NextResponse.json({ error: 'generation_id wajib diisi' }, { status: 400 })

  const { data: generation } = await supabase
    .from('generations')
    .select('id, user_id, output_vba')
    .eq('id', id)
    .single()
  if (!generation || generation.user_id !== user.id || !generation.output_vba) {
    return NextResponse.json({ error: 'Macro tidak ditemukan' }, { status: 404 })
  }

  const code: string = generation.output_vba
  if (code.length > AI_LIMITS.codeMaxChars) {
    await trackEvent(user.id, 'download_xlsm_failed', { reason: 'too_long' })
    return NextResponse.json({ error: REJECTION_MESSAGES.too_long }, { status: 422 })
  }
  if (scanVba(code).blocked.length > 0) {
    await trackEvent(user.id, 'download_xlsm_failed', { reason: 'unsafe' })
    return NextResponse.json({ error: REJECTION_MESSAGES.unsafe }, { status: 422 })
  }

  try {
    const file = buildXlsm(code)
    await trackEvent(user.id, 'download_xlsm', { bytes: file.length })
    return new NextResponse(Buffer.from(file), {
      headers: {
        'Content-Type': 'application/vnd.ms-excel.sheet.macroEnabled.12',
        'Content-Disposition': 'attachment; filename="BikinMacro.xlsm"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Export xlsm gagal:', error)
    await trackEvent(user.id, 'download_xlsm_failed', { reason: 'error' })
    return NextResponse.json({ error: 'Gagal membuat file Excel. Unduh versi .bas sebagai gantinya.' }, { status: 500 })
  }
}

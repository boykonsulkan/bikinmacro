import { NextResponse } from 'next/server'
import { checkKeys, describeKey, snapScriptUrl } from '@/lib/midtrans/keys'
import { getAdminUser } from '@/lib/orders/server'

// Pengecek konfigurasi Midtrans untuk admin. Hanya menampilkan JENIS key
// (sandbox, produksi, kosong, placeholder), bukan isinya, jadi aman dipakai untuk
// memastikan environment di hosting benar tanpa membuka rahasia.
// Buka saat login sebagai admin: /api/north/midtrans-check
export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Nggak punya akses.' }, { status: 401 })

  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim()
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim()
  const check = checkKeys(serverKey, clientKey)

  return NextResponse.json(
    {
      siapLive: check.ok && check.production,
      mode: check.ok ? (check.production ? 'produksi' : 'sandbox') : null,
      masalah: check.ok ? (check.production ? null : 'Masih sandbox: pembayaran nyata belum bisa masuk.') : check.error,
      serverKey: describeKey(serverKey, 'server'),
      clientKey: describeKey(clientKey, 'client'),
      snapJsDimuatDari: snapScriptUrl(clientKey),
      supabaseServiceRoleTerpasang: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      variabelModeLama: process.env.NEXT_PUBLIC_MIDTRANS_MODE ? 'masih ada (diabaikan, boleh dihapus)' : 'tidak ada',
      urlNotifikasiDiDashboard: 'https://bikinmacro.my.id/api/webhooks/midtrans',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

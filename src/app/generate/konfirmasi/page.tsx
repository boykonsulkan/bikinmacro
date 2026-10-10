import type { Metadata } from 'next'
import KonfirmasiScreen from '@/components/konfirmasi/KonfirmasiScreen'
import { DUMMY_PLAN } from '@/components/konfirmasi/dummy'

export const metadata: Metadata = {
  title: 'Cek rencana macro | BikinMacro',
  robots: { index: false, follow: false },
}

// /generate/* sudah diproteksi login oleh middleware.
// TODO: ambil rencana asli dari backend generator (kontrak di
// docs/konfirmasi-contract.md) menggantikan DUMMY_PLAN.
export default function KonfirmasiPage() {
  return <KonfirmasiScreen plan={DUMMY_PLAN} isDummy />
}

import type { Metadata } from 'next'
import KonfirmasiScreen from '@/components/konfirmasi/KonfirmasiScreen'
import { DUMMY_PLAN } from '@/components/konfirmasi/dummy'

// Pratinjau layar Konfirmasi tanpa login, data dummy. Tidak ada di navigasi.
export const metadata: Metadata = {
  title: 'Dev: konfirmasi rencana',
  robots: { index: false, follow: false },
}

export default function DevKonfirmasiPage() {
  return <KonfirmasiScreen plan={DUMMY_PLAN} isDummy />
}

import type { Metadata } from 'next'
import CobaFlow from '@/components/coba/CobaFlow'

export const metadata: Metadata = {
  title: 'Coba gratis: file Excel dengan macro, tanpa daftar | BikinMacro',
  description:
    'Download file contoh rekap penjualan, upload, lalu ambil file Excel yang sudah berisi macro dan tombol Jalankan. Tanpa daftar.',
}

// Demo terarah: satu use case, satu file contoh, hasil yang selalu sama.
// Alur ini nggak memanggil generator; file hasil disiapkan di public/demo
// (dibangun ulang dengan scripts/demo/build-demo.ps1).
export default function CobaPage() {
  return <CobaFlow />
}

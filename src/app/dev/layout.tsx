import { notFound } from 'next/navigation'

// Halaman /dev/* cuma buat pengembangan (cek animasi, pratinjau layar).
// Di produksi dibuat 404.
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound()
  return children
}

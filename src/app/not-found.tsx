import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-7xl font-bold text-primary mb-4">404</p>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Halaman tidak ditemukan</h1>
      <p className="text-muted mb-8 max-w-sm">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <Link
        href="/"
        className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
      >
        Kembali ke Beranda
      </Link>
    </div>
  )
}

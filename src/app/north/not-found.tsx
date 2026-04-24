import Link from 'next/link'

export default function NorthNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-xl font-semibold text-gray-800 mb-2">Halaman tidak ditemukan</h1>
      <p className="text-sm text-gray-500 mb-8">Halaman admin yang kamu cari tidak ada.</p>
      <Link
        href="/north"
        className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  )
}

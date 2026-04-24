'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error monitoring (e.g. Sentry) — never expose to user
    console.error(error)
  }, [error])

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-7xl font-bold text-primary mb-4">500</p>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Terjadi kesalahan</h1>
      <p className="text-muted mb-8 max-w-sm">
        Kami tidak dapat memproses permintaan ini. Silakan coba lagi atau hubungi kami jika masalah berlanjut.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
        >
          Coba Lagi
        </button>
        <Link
          href="/"
          className="bg-card border border-border hover:bg-card/80 text-foreground px-6 py-2.5 rounded-xl font-medium transition-colors"
        >
          Beranda
        </Link>
      </div>
    </div>
  )
}

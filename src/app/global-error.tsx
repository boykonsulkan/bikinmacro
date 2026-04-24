'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#fdfbf7' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '1rem',
        }}>
          <p style={{ fontSize: '4rem', fontWeight: 700, color: '#f97316', margin: '0 0 1rem' }}>500</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Terjadi kesalahan sistem</h1>
          <p style={{ color: '#888', marginBottom: '2rem', maxWidth: '24rem' }}>
            Kami sedang menangani masalah ini. Silakan muat ulang halaman.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#f97316',
              color: '#fff',
              border: 'none',
              padding: '0.625rem 1.5rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  )
}

'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { resetAccessToken } from '../actions'

const btn =
  'inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-bold text-foreground hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50'

/** Upload file hasil (.xlsm utama, .bas bonus) lewat route admin. */
export function UploadResult({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/north/orders/${orderId}/files`, { method: 'POST', body: new FormData(form) })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        form.reset()
        setMessage('File terupload.')
        router.refresh()
      } else {
        setMessage(json.error ?? 'Upload gagal.')
      }
    } catch {
      setMessage('Koneksi bermasalah.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label htmlFor="file-hasil" className="sr-only">File hasil</label>
      <input id="file-hasil" name="file" type="file" accept=".xlsm,.xlsx,.bas" required className="text-sm text-card-foreground" />
      <button type="submit" disabled={busy} className={btn}>{busy ? 'Mengupload...' : 'Upload hasil'}</button>
      {message && <span role="status" className="text-xs font-semibold text-muted">{message}</span>}
    </form>
  )
}

/** Bikin link baru untuk pembeli yang kehilangan link (link lama langsung mati). */
export function ResetLink({ orderId }: { orderId: string }) {
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function reset() {
    if (!window.confirm('Link lama akan mati dan diganti link baru. Lanjut?')) return
    setBusy(true)
    setError('')
    const result = await resetAccessToken(orderId)
    setBusy(false)
    if ('error' in result) setError(result.error)
    else setLink(`${window.location.origin}/pesanan/${result.code}#${result.token}`)
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={reset} disabled={busy} className={`${btn} w-fit`}>Buat link baru untuk pembeli</button>
      {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
      {link && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-3 text-warning-ink">
          <p className="text-xs font-bold">Kirim link ini ke pembeli. Cuma muncul sekali.</p>
          <p className="mt-2 break-all font-mono text-xs font-semibold">{link}</p>
        </div>
      )}
    </div>
  )
}

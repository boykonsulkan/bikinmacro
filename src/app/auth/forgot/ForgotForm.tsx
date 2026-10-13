'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { requestPasswordReset } from '../reset-actions'
import type { ResetState } from '../reset-actions'

const INITIAL: ResetState = { status: 'idle', message: '' }

export default function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, INITIAL)

  if (state.status === 'sent') {
    return (
      <div className="text-foreground" role="status">
        <h1 className="text-2xl font-bold mb-4 text-center">Cek email kamu</h1>
        <p className="rounded-md border border-border bg-card p-4 text-sm leading-relaxed">{state.message}</p>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/auth/login" className="text-primary hover:underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col w-full gap-2 text-foreground">
      <h1 className="text-2xl font-bold mb-2 text-center">Lupa password?</h1>
      <p className="mb-4 text-center text-sm text-muted">
        Masukkan email akunmu. Kami kirim tautan untuk membuat password baru.
      </p>

      <label className="text-sm font-medium" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        className="rounded-md px-4 py-2 bg-card border border-border mb-4 focus:outline-none focus:border-primary transition-colors"
        name="email"
        type="email"
        placeholder="anda@email.com"
        autoComplete="email"
        required
      />

      <button
        disabled={pending}
        className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white rounded-md px-4 py-2 font-medium transition-colors mb-2 inline-flex items-center justify-center gap-2"
      >
        {pending && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {pending ? 'Mengirim...' : 'Kirim tautan'}
      </button>

      {state.status === 'error' && (
        <p role="alert" className="mt-2 p-3 bg-red-900/30 text-red-400 border border-red-900 rounded-md text-center text-sm">
          {state.message}
        </p>
      )}

      <p className="mt-2 text-center text-sm text-muted">
        <Link href="/auth/login" className="text-primary hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </form>
  )
}

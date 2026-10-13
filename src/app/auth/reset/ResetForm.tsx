'use client'

import { useActionState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { INVITE } from '@/lib/invites/rules'
import { resetPassword } from '../reset-actions'
import type { ResetState } from '../reset-actions'

const INITIAL: ResetState = { status: 'idle', message: '' }

// Token ada di bagian # URL ("#t=..."): nggak pernah dikirim ke server saat halaman dibuka dan nggak masuk log.
function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const readToken = () => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('t')?.trim() ?? ''

const inputClass =
  'rounded-md px-4 py-2 bg-card border border-border mb-4 focus:outline-none focus:border-primary transition-colors'

export default function ResetForm() {
  // null = belum tahu (render server), '' = nggak ada token.
  const token = useSyncExternalStore<string | null>(subscribeHash, readToken, () => null)
  const [state, action, pending] = useActionState(resetPassword, INITIAL)

  if (token === null) {
    return (
      <p className="flex items-center justify-center gap-2 text-sm text-muted" role="status">
        <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Memeriksa tautan...
      </p>
    )
  }

  if (token === '') {
    return (
      <div className="text-foreground" role="alert">
        <h1 className="text-2xl font-bold mb-4 text-center">Tautan nggak lengkap</h1>
        <p className="rounded-md border border-border bg-card p-4 text-sm leading-relaxed">
          Buka tautan dari email atur ulang password persis seperti yang dikirim. Kalau sudah kedaluwarsa, minta yang baru.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/auth/forgot" className="text-primary hover:underline">
            Minta tautan baru
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col w-full gap-2 text-foreground">
      <h1 className="text-2xl font-bold mb-2 text-center">Buat password baru</h1>
      <p className="mb-4 text-center text-sm text-muted">
        Setelah disimpan kamu langsung masuk, dan perangkat lain otomatis keluar.
      </p>

      <input type="hidden" name="token" value={token} />

      <label className="text-sm font-medium" htmlFor="password">
        Password baru
      </label>
      <input
        id="password"
        className={inputClass}
        name="password"
        type="password"
        required
        minLength={INVITE.passwordMin}
        maxLength={INVITE.passwordMax}
        autoComplete="new-password"
        aria-describedby="pw-hint"
      />
      <p id="pw-hint" className="-mt-3 mb-4 text-xs text-muted">
        Minimal {INVITE.passwordMin} karakter.
      </p>

      <label className="text-sm font-medium" htmlFor="confirm">
        Ulangi password baru
      </label>
      <input
        id="confirm"
        className={inputClass}
        name="confirm"
        type="password"
        required
        minLength={INVITE.passwordMin}
        maxLength={INVITE.passwordMax}
        autoComplete="new-password"
      />

      <button
        disabled={pending}
        className="bg-primary hover:bg-primary-hover disabled:opacity-60 text-white rounded-md px-4 py-2 font-medium transition-colors mb-2 inline-flex items-center justify-center gap-2"
      >
        {pending && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {pending ? 'Menyimpan...' : 'Simpan password'}
      </button>

      {state.status === 'error' && (
        <div role="alert" className="mt-2 p-3 bg-red-900/30 text-red-400 border border-red-900 rounded-md text-center text-sm">
          <p>{state.message}</p>
          {/Tautan ini|tautan baru/i.test(state.message) && (
            <p className="mt-2">
              <Link href="/auth/forgot" className="underline">
                Minta tautan baru
              </Link>
            </p>
          )}
        </div>
      )}
    </form>
  )
}

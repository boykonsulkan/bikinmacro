'use client'

import { useActionState, useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'
import { INVITE, STATE_MESSAGE } from '@/lib/invites/rules'
import { activateAction, checkInvite } from './actions'
import type { ActivateState, InviteView } from './actions'

const INITIAL: ActivateState = { status: 'idle', message: '' }

// Token ada di bagian # URL: nggak pernah dikirim ke server saat halaman dibuka dan nggak masuk log.
function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const readToken = () => window.location.hash.replace(/^#/, '').trim()

const input = 'w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground'

export default function ActivationForm() {
  // null = belum tahu (render server), '' = nggak ada token.
  const token = useSyncExternalStore<string | null>(subscribeHash, readToken, () => null)
  const [view, setView] = useState<InviteView | null>(null)
  const [state, action, pending] = useActionState(activateAction, INITIAL)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const id = setTimeout(() => {
      void checkInvite(token).then((v) => {
        if (!cancelled) setView(v)
      })
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [token])

  const missing = token === ''
  const bad = missing ? 'invalid' : view && view.state !== 'ok' ? view.state : null

  if (token === null || (!missing && !view)) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-muted" role="status">
        <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Memeriksa undangan kamu...
      </p>
    )
  }

  if (bad) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft" role="alert">
        <h1 className="text-xl font-extrabold text-card-foreground">Undangan nggak bisa dipakai</h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-muted">{STATE_MESSAGE[bad]}</p>
        <Link href="/auth/login" className="mt-4 inline-block text-sm font-bold text-accent-ink underline">
          Masuk ke akun
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <p className="text-xs font-semibold tracking-wide text-accent-ink">Undangan beta tester</p>
      <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-card-foreground">
        Aktifkan akun kamu
      </h1>
      <p className="mt-3 text-sm font-medium leading-relaxed text-muted">
        Akun untuk <span className="font-mono font-bold text-card-foreground">{view?.maskedEmail}</span> dengan paket{' '}
        <span className="font-bold text-card-foreground">{view?.planLabel}</span>.{' '}
        {view?.existingAdmin
          ? 'Ini akun admin: password-nya nggak diubah lewat undangan. Klik Aktifkan, lalu masuk seperti biasa.'
          : view?.existing
            ? 'Email ini sudah punya akun BikinMacro. Buat password baru di bawah (password lama kalau ada akan diganti, jadi kamu juga nggak perlu mengingatnya). Setelah itu kamu langsung masuk dengan paket beta.'
            : 'Cukup buat password, lalu kamu langsung bisa mencoba. Password ini yang kamu pakai untuk masuk lagi kapan saja.'}
      </p>

      <input type="hidden" name="token" value={token} />

      {!view?.existingAdmin && (
        <>
      <div className="mt-6 flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-bold text-foreground">Buat password</label>
        <input id="password" name="password" type="password" required minLength={INVITE.passwordMin} maxLength={INVITE.passwordMax}
          autoComplete="new-password" className={input} aria-describedby="pw-hint" />
        <p id="pw-hint" className="text-xs font-medium text-muted">Minimal {INVITE.passwordMin} karakter.</p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor="confirm" className="text-sm font-bold text-foreground">Ulangi password</label>
        <input id="confirm" name="confirm" type="password" required minLength={INVITE.passwordMin} maxLength={INVITE.passwordMax}
          autoComplete="new-password" className={input} />
      </div>
        </>
      )}

      {state.status === 'error' && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-warning-border bg-warning-bg p-3 text-sm font-semibold text-warning-ink">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-action px-7 text-sm font-bold text-white shadow-glow transition hover:bg-action-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
      >
        {pending && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {pending ? 'Mengaktifkan...' : 'Aktifkan akun'}
      </button>
    </form>
  )
}

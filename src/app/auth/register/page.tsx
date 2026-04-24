import Link from 'next/link'
import { signup } from '../actions'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mt-20 mx-auto">
      <Link
        href="/"
        className="absolute left-8 top-8 py-2 px-4 rounded-md no-underline text-foreground bg-btn-background hover:bg-btn-background-hover flex items-center group text-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>{' '}
        Kembali
      </Link>

      <form
        className="flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
        action={signup}
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Daftar BikinMacro</h1>
        
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-card border border-border mb-4 focus:outline-none focus:border-primary transition-colors"
          name="email"
          placeholder="anda@email.com"
          required
        />
        
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-card border border-border mb-6 focus:outline-none focus:border-primary transition-colors"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        
        <button className="bg-primary hover:bg-primary-hover text-white rounded-md px-4 py-2 font-medium transition-colors mb-2">
          Daftar
        </button>

        <p className="text-sm text-center text-muted">
          Sudah punya akun?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Masuk di sini
          </Link>
        </p>

        {resolvedSearchParams?.message && (
          <p className="mt-4 p-4 bg-red-900/30 text-red-400 border border-red-900 rounded-md text-center">
            {resolvedSearchParams.message}
          </p>
        )}
      </form>
    </div>
  )
}

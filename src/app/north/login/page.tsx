import { adminLogin } from '@/app/auth/actions'
import Link from 'next/link'

export default async function NorthLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="flex min-h-screen bg-[#fdfbf7] items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            N
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">North Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in with your administrative credentials.</p>
        </div>

        <form action={adminLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Admin Email
            </label>
            <input
              className="w-full rounded-lg px-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900"
              name="email"
              placeholder="admin@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              className="w-full rounded-lg px-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-gray-900"
              type="password"
              name="password"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button className="w-full bg-black hover:bg-gray-800 text-white rounded-lg px-4 py-2.5 font-medium transition-colors mt-2">
            Sign In to North
          </button>

          {resolvedSearchParams?.message && (
            <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm border border-red-100 rounded-lg text-center">
              {resolvedSearchParams.message}
            </p>
          )}
        </form>
        
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            &larr; Return to public site
          </Link>
        </div>
      </div>
    </div>
  )
}

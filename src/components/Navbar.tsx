import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/auth/actions'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userPlan = 'free'
  let userRole = 'user'
  if (user) {
    const { data: profile } = await supabase.from('users').select('plan, role').eq('id', user.id).single()
    if (profile) {
      userPlan = profile.plan
      userRole = profile.role
    }
  }

  return (
    <nav className="w-full flex justify-center border-b border-b-border h-16">
      <div className="w-full max-w-6xl flex justify-between items-center p-3 text-sm">
        <div className="flex gap-5 items-center font-semibold text-lg text-primary">
          <Link href="/">BikinMacro</Link>
        </div>
        {!user ? (
          <div className="flex gap-4 items-center">
            <Link href="/auth/login" className="text-muted hover:text-foreground transition-colors">
              Masuk
            </Link>
            <Link href="/auth/register" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md transition-colors">
              Coba Gratis
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <span className="bg-card border border-border px-3 py-1 rounded-full text-xs font-medium text-muted uppercase">
                Plan: {userPlan}
              </span>
              <Link href="/pricing" className="text-xs font-medium text-primary hover:underline">
                Upgrade
              </Link>
            </div>
            {userRole === 'admin' && (
              <Link href="/north" className="text-muted hover:text-foreground transition-colors font-bold text-orange-400">
                Admin
              </Link>
            )}
            
            <Link href="/generate" className="text-muted hover:text-foreground transition-colors">
              Generate
            </Link>
            {userPlan !== 'free' && (
              <Link href="/history" className="text-muted hover:text-foreground transition-colors">
                History
              </Link>
            )}
            
            <form action={logout}>
              <button className="text-muted hover:text-foreground transition-colors">
                Keluar
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  )
}

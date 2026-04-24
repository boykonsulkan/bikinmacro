import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import UserNav from './UserNav'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userPlan = 'free'
  let userRole = 'user'
  let userName = ''
  
  if (user) {
    const { data: profile } = await supabase.from('users').select('plan, role, email').eq('id', user.id).single()
    if (profile) {
      userPlan = profile.plan
      userRole = profile.role
      // Extract name from email as fallback or use a 'name' field if you have one
      userName = profile.email.split('@')[0]
    }
  }

  return (
    <nav className="w-full flex justify-center border-b border-border h-16 bg-background sticky top-0 z-40">
      <div className="w-full max-w-6xl flex justify-between items-center p-3 text-sm">
        <div className="flex gap-5 items-center font-bold text-xl text-primary tracking-tight">
          <Link href="/">BikinMacro</Link>
        </div>
        {!user ? (
          <div className="flex gap-4 items-center">
            <Link href="/auth/login" className="text-muted hover:text-foreground transition-colors font-medium">
              Masuk
            </Link>
            <Link href="/auth/register" className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full font-bold transition-all hover:scale-105 shadow-lg shadow-primary/20">
              Coba Gratis
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-muted font-medium">
               <Link href="/generate" className="hover:text-foreground transition-colors">
                 Generate
               </Link>
               {userPlan !== 'free' && (
                 <Link href="/history" className="hover:text-foreground transition-colors">
                   History
                 </Link>
               )}
               {userRole === 'admin' && (
                 <Link href="/north" className="text-orange-500 hover:text-orange-600 transition-colors font-bold">
                   Admin
                 </Link>
               )}
            </div>
            
            <div className="h-6 w-px bg-border hidden md:block" />

            <div className="flex items-center gap-4">
              <UserNav 
                userEmail={user.email || ''} 
                userName={userName} 
                plan={userPlan} 
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

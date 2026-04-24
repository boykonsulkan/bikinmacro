import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { LayoutDashboard, Users, CreditCard, Home, Settings } from 'lucide-react'

export default async function NorthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If not logged in, just render children (which will be the login page due to middleware)
  // However, the login page is inside /north/login.
  // Wait, layout wraps everything in /north, including /north/login.
  // We probably don't want the sidebar on the login page.
  // We can check if we want to show the sidebar, but server components don't have access to pathname directly.
  // Actually, we can just render the children.
  // Let's create a wrapper that checks if the user is authenticated.
  
  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:block">
        <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground">North Portal</h2>
          <p className="text-xs text-muted mt-1">Admin Control Center</p>
        </div>
        <nav className="space-y-1 px-4 mt-4">
          <Link href="/north" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-primary/10 text-primary">
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted hover:bg-card-foreground/5 transition-colors">
            <Users size={18} />
            Users
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted hover:bg-card-foreground/5 transition-colors">
            <CreditCard size={18} />
            Transactions
          </Link>
        </nav>
        
        <div className="absolute bottom-0 w-64 p-4 border-t border-border">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted hover:bg-card-foreground/5 transition-colors">
            <Home size={18} />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}

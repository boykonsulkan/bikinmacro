'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CreditCard, Home, SlidersHorizontal } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/north', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/north/users', label: 'Users', icon: Users },
    { href: '/north/transactions', label: 'Transactions', icon: CreditCard },
    { href: '/north/settings', label: 'Settings', icon: SlidersHorizontal },
  ]

  return (
    <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
      <div className="p-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground">North Portal</h2>
        <p className="text-xs text-muted mt-1">Admin Control Center</p>
      </div>
      
      <nav className="flex-1 space-y-1 px-4 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-card-foreground/5 hover:text-foreground'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-border mt-auto">
        <Link 
          href="/" 
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted hover:bg-card-foreground/5 hover:text-foreground transition-colors"
        >
          <Home size={18} />
          Back to App
        </Link>
      </div>
    </aside>
  )
}

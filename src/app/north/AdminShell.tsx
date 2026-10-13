'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/north/login') return <>{children}</>

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}

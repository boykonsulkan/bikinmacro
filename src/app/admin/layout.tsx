import Link from 'next/link'
import { LayoutDashboard, Users, FileCode2, CircleDollarSign } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 w-full flex flex-col sm:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full sm:w-64 border-r border-border bg-card p-4 sm:p-6 flex flex-col gap-2 shrink-0">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 px-2">Admin Panel</h2>
        
        <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium">
          <LayoutDashboard size={18} /> Overview
        </Link>
        <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-border text-muted-foreground transition-colors">
          <Users size={18} /> Users
        </Link>
        <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-border text-muted-foreground transition-colors">
          <FileCode2 size={18} /> Generations
        </Link>
        <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-border text-muted-foreground transition-colors">
          <CircleDollarSign size={18} /> Revenue
        </Link>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-6 sm:p-10 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

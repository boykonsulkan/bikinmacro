'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { 
  LogOut, 
  Settings, 
  HelpCircle, 
  Moon, 
  Sun, 
  ChevronDown, 
  User as UserIcon,
  Zap
} from 'lucide-react'
import { logout } from '@/app/auth/actions'

export default function UserNav({ 
  userEmail, 
  userName, 
  plan 
}: { 
  userEmail: string, 
  userName?: string, 
  plan: string 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const initials = userName 
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase()
    : userEmail[0].toUpperCase()

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-card-foreground/5 transition-colors focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/10 overflow-hidden">
           {initials}
        </div>
        <ChevronDown size={14} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-border mb-1">
            <p className="text-sm font-bold text-foreground truncate">{userName || 'User'}</p>
            <p className="text-xs text-muted truncate">{userEmail}</p>
          </div>

          {/* Plan Info */}
          <div className="px-4 py-2">
             <div className="flex items-center justify-between bg-card-foreground/5 p-2 rounded-xl border border-border/50 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Plan: {plan}</span>
                <Link 
                  href="/pricing" 
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Zap size={10} className="fill-current" /> Upgrade
                </Link>
             </div>
          </div>

          {/* Links */}
          <div className="space-y-0.5 px-2">
            <Link 
              href="/settings" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-card-foreground/5 rounded-xl transition-colors"
            >
              <Settings size={16} /> Pengaturan
            </Link>
            <Link 
              href="/help" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-card-foreground/5 rounded-xl transition-colors"
            >
              <HelpCircle size={16} /> Bantuan
            </Link>
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-card-foreground/5 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${mounted && theme === 'dark' ? 'bg-primary' : 'bg-muted/30'}`}>
                 <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${mounted && theme === 'dark' ? 'left-4.5' : 'left-0.5'}`} />
              </div>
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-border px-2">
            <button 
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/5 rounded-xl transition-colors"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

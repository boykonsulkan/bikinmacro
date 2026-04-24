import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Zap, User, Mail, CreditCard, ChevronRight } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>Silakan masuk terlebih dahulu.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('users')
    .select('plan, credits_used, credits_limit, email')
    .eq('id', user.id)
    .single()

  const planName = profile?.plan === 'pro' ? 'Pro' : profile?.plan === 'starter' ? 'Starter' : 'Free'
  const creditsUsed = profile?.credits_used || 0
  const creditsLimit = profile?.credits_limit || 3

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto p-6 sm:p-12">
      <h1 className="text-3xl font-extrabold text-foreground mb-10">Pengaturan</h1>

      <div className="space-y-8">
        {/* Plan & Usage */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted uppercase text-xs font-bold tracking-widest">
            <CreditCard size={14} /> Plan & Penggunaan
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">Paket {planName}</h3>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    {profile?.plan || 'free'}
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">Penggunaan fitur kamu bulan ini.</p>
              </div>
              <Link href="/pricing" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                Ganti Plan <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Macro Generated</span>
                  <span className="text-foreground font-medium">{creditsUsed} / {creditsLimit}</span>
                </div>
                <div className="w-full h-2 bg-muted/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all" 
                    style={{ width: `${Math.min((creditsUsed / creditsLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                <span className="text-muted">Refinement Chat</span>
                <span className="text-foreground font-medium">
                  {profile?.plan === 'free' ? '5 / macro' : profile?.plan === 'starter' ? '10 / macro' : 'Unlimited'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Upgrade Card if Free */}
        {profile?.plan === 'free' && (
          <div className="bg-gradient-to-br from-primary to-orange-500 rounded-2xl p-6 text-white shadow-xl shadow-primary/20">
            <h3 className="text-xl font-bold mb-2">Upgrade ke Starter</h3>
            <p className="text-sm opacity-90 mb-6">Dapatkan lebih banyak kuota macro, riwayat tersimpan, dan bantuan AI yang lebih pintar.</p>
            <Link href="/pricing" className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold transition-transform hover:scale-105">
              <Zap size={18} className="fill-current" /> Lihat Plan & Upgrade
            </Link>
          </div>
        )}

        {/* Profile Info */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted uppercase text-xs font-bold tracking-widest">
            <User size={14} /> Profil
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-2xl border border-primary/10">
                 {user.email?.[0].toUpperCase()}
               </div>
               <div>
                 <h3 className="text-lg font-bold text-foreground">{user.email?.split('@')[0]}</h3>
                 <p className="text-sm text-muted">{user.email}</p>
               </div>
            </div>

            <div className="space-y-4">
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-muted uppercase tracking-wider">Nama Display</label>
                 <input 
                   disabled 
                   value={user.email?.split('@')[0]} 
                   className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-muted cursor-not-allowed"
                 />
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-muted uppercase tracking-wider">Email</label>
                 <div className="relative">
                   <Mail className="absolute left-4 top-3.5 text-muted" size={16} />
                   <input 
                     disabled 
                     value={user.email} 
                     className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-sm text-muted cursor-not-allowed"
                   />
                 </div>
               </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

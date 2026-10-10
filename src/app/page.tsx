import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { FileCode2, ArrowRight, LayoutTemplate } from 'lucide-react'
import LandingPage from '@/components/landing/LandingPage'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // For Logged In
  let userPlan = 'free'
  let creditsUsed = 0
  let creditsLimit = 3

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('plan, credits_used, credits_limit')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      userPlan = profile.plan
      creditsUsed = profile.credits_used
      creditsLimit = profile.credits_limit
    }
  }

  if (!user) return <LandingPage />

  const isLowCredits = user && creditsUsed >= creditsLimit * 0.8

  return (
    <div className="flex flex-col items-center flex-1 w-full p-6 sm:p-12">
      {user && (
        <div className="w-full max-w-4xl flex flex-col gap-8 mt-10">
          <div className="flex justify-between items-center bg-card border border-border p-6 rounded-2xl shadow-sm">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mau bikin macro apa hari ini?</h1>
              <p className="text-muted mt-2">
                Kamu sudah bikin <strong className="text-primary">{creditsUsed}</strong> dari <strong className="text-foreground">{creditsLimit}</strong> macro bulan ini.
              </p>
            </div>
            <Link href="/generate" className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors">
              <FileCode2 size={20} />
              Bikin Macro
            </Link>
          </div>

          {isLowCredits && (
            <div className={`border p-4 rounded-lg flex justify-between items-center ${
              creditsUsed >= creditsLimit 
                ? 'bg-red-500/10 border-red-500/50' 
                : 'bg-orange-500/10 border-orange-500/50'
            }`}>
              <p className={`font-medium ${creditsUsed >= creditsLimit ? 'text-red-400' : 'text-orange-400'}`}>
                {creditsUsed >= creditsLimit ? 'Kuota kamu sudah habis!' : 'Kuota kamu hampir habis!'}
              </p>
              <Link href="/pricing" className={`text-sm text-white px-3 py-1 rounded-md transition-colors ${
                creditsUsed >= creditsLimit ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
              }`}>
                Upgrade
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Link href="/generate" className="group flex flex-col justify-between bg-card hover:bg-card/80 border border-border hover:border-primary/50 p-8 rounded-2xl transition-all h-48 cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileCode2 size={100} className="text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Bikin Macro Baru</h3>
                <p className="text-muted text-sm">Deskripsikan macro yang kamu butuhkan dengan bahasa Indonesia.</p>
              </div>
              <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
                Mulai <ArrowRight size={16} className="ml-1" />
              </div>
            </Link>

            {userPlan !== 'free' ? (
              <Link href="/history" className="group flex flex-col justify-between bg-card hover:bg-card/80 border border-border hover:border-primary/50 p-8 rounded-2xl transition-all h-48 cursor-pointer relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <LayoutTemplate size={100} className="text-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Riwayat Macro</h3>
                  <p className="text-muted text-sm">Lihat kode macro yang sudah pernah kamu buat sebelumnya.</p>
                </div>
                <div className="flex items-center text-foreground font-medium group-hover:translate-x-1 transition-transform">
                  Lihat Riwayat <ArrowRight size={16} className="ml-1" />
                </div>
              </Link>
            ) : (
              <div className="flex flex-col justify-between bg-card/50 border border-border border-dashed p-8 rounded-2xl transition-all h-48 opacity-80">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">Riwayat Macro <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">Pro</span></h3>
                  <p className="text-muted text-sm">Upgrade ke paket Starter atau Pro untuk melihat riwayat macro yang sudah kamu buat.</p>
                </div>
                <Link href="/pricing" className="flex items-center text-primary font-medium hover:underline">
                  Upgrade Sekarang
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

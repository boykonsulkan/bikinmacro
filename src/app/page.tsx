import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { FileCode2, ArrowRight, LayoutTemplate } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // For Guest
  let totalUsers = 0
  let totalMacros = 0

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
  } else {
    // In a real app, you might want to cache this or use a cron to update a stats table
    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: macrosCount } = await supabase.from('generations').select('*', { count: 'exact', head: true })
    totalUsers = usersCount || 0
    totalMacros = macrosCount || 0
  }

  const isLowCredits = user && creditsUsed >= creditsLimit * 0.8

  return (
    <div className="flex flex-col items-center flex-1 w-full p-6 sm:p-12">
      {user ? (
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
      ) : (
        <div className="w-full max-w-5xl flex flex-col items-center text-center mt-16 sm:mt-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            LIVE: {totalUsers} User | {totalMacros} Macro Terbuat
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold text-foreground tracking-tight max-w-4xl leading-tight">
            Dari kalimat biasa jadi <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Excel Macro</span>. Tanpa coding.
          </h1>
          <p className="text-lg sm:text-xl text-muted max-w-2xl mt-6">
            BikinMacro menggunakan teknologi AI untuk mengubah instruksi bahasa Indonesia kamu menjadi kode VBA yang siap dipakai. Hemat waktu berjam-jam untuk automasi pekerjaanmu.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/auth/register" className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
              Coba Gratis Sekarang <ArrowRight size={20} />
            </Link>
          </div>

          <div className="w-full mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { title: "Deskripsikan Masalah", desc: "Ketik instruksi kamu seperti sedang menyuruh asisten.", prompt: "Gabungkan nama dari kolom A dan B ke kolom C" },
              { title: "AI Generate Kode", desc: "Tunggu beberapa detik, AI akan menuliskan kode VBA yang rapi.", prompt: "Dim i As Long..." },
              { title: "Copy & Paste", desc: "Langsung salin ke Excel dan jalankan. Selesai!", prompt: "Macro siap dijalankan!" }
            ].map((step, i) => (
              <div key={i} className="bg-card border border-border p-6 rounded-2xl">
                <div className="w-10 h-10 bg-primary/20 text-primary flex items-center justify-center rounded-full font-bold mb-4">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted text-sm mb-4">{step.desc}</p>
                <div className="bg-background border border-border p-3 rounded-lg text-xs font-mono text-muted/80">
                  {step.prompt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

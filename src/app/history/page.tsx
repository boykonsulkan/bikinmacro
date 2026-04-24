import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import HistoryList from '@/components/HistoryList'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user has Starter or Pro plan
  const { data: profile } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.plan === 'free' || profile.plan === 'addon')) {
    // Upsell
    return (
      <div className="flex-1 w-full max-w-5xl mx-auto p-6 sm:p-12 text-center mt-20">
        <h1 className="text-3xl font-bold mb-4">Fitur Terkunci</h1>
        <p className="text-muted mb-8 max-w-lg mx-auto">
          Riwayat pembuatan macro hanya tersedia untuk paket Starter dan Pro. Upgrade sekarang untuk menyimpan dan melihat kembali semua kode macro yang pernah Anda buat.
        </p>
        <a href="/pricing" className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors">
          Lihat Paket
        </a>
      </div>
    )
  }

  const { data: generations, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return <div className="p-12 text-center text-red-500">Gagal memuat riwayat.</div>
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 sm:p-12">
      <h1 className="text-3xl font-bold mb-2">Riwayat Macro</h1>
      <p className="text-muted mb-8">Daftar macro yang pernah kamu buat sebelumnya.</p>
      
      <HistoryList generations={generations || []} />
    </div>
  )
}

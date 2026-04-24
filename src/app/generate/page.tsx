import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GenerateForm from '@/components/GenerateForm'

export default async function GeneratePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('credits_used, credits_limit')
    .eq('id', user.id)
    .single()

  const creditsUsed = profile?.credits_used || 0
  const creditsLimit = profile?.credits_limit || 3

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 sm:p-12">
      <h1 className="text-3xl font-bold mb-2">Bikin Macro Baru</h1>
      <p className="text-muted mb-8">
        Sisa <strong className="text-primary">{creditsLimit - creditsUsed}</strong> dari {creditsLimit} macro bulan ini.
      </p>

      <GenerateForm 
        hasCredits={creditsUsed < creditsLimit} 
        creditsRemaining={creditsLimit - creditsUsed} 
      />
    </div>
  )
}

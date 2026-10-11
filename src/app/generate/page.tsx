import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GenerateForm from '@/components/GenerateForm'
import type { ResumeState } from '@/components/GenerateForm'

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('credits_used, credits_limit, role, plan')
    .eq('id', user.id)
    .single()

  const { data: settings } = await supabase
    .from('plan_settings')
    .select('max_chat_per_generation, credits_limit')
    .eq('plan', profile?.plan || 'free')
    .single()

  // Hasil yang sedang dikerjakan (?g=<id>) dimuat ulang dari database, jadi refresh tetap di halaman chat.
  const { g } = await searchParams
  let resume: ResumeState | null = null
  if (g && /^[0-9a-f-]{36}$/i.test(g)) {
    const { data: gen } = await supabase
      .from('generations')
      .select('id, prompt, output_vba')
      .eq('id', g)
      .eq('user_id', user.id)
      .maybeSingle()
    if (gen) {
      const { data: chats } = await supabase
        .from('generation_chats')
        .select('role, content')
        .eq('generation_id', gen.id)
        .order('created_at', { ascending: true })
      resume = {
        id: gen.id,
        // Detail tambahan dari form disembunyikan, sama seperti saat pertama kali dibuat.
        prompt: String(gen.prompt).split('\n\nDetail tambahan:')[0],
        code: gen.output_vba,
        chats: (chats ?? []).map((c) => ({ role: c.role as 'user' | 'assistant', content: c.content })),
      }
    }
  }

  const isAdmin = profile?.role === 'admin'
  const creditsUsed = profile?.credits_used || 0
  const creditsLimit = settings?.credits_limit ?? profile?.credits_limit ?? 3
  const maxChatPerGeneration = settings?.max_chat_per_generation ?? 10

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 sm:p-12">
      <h1 className="text-3xl font-bold mb-2">Bikin Macro Baru</h1>
      <p className="text-muted mb-8">
        {isAdmin ? (
          <span>Mode <strong className="text-primary">Admin</strong> — generasi tidak terbatas.</span>
        ) : (
          <>Sisa <strong className="text-primary">{creditsLimit - creditsUsed}</strong> dari {creditsLimit} macro bulan ini.</>
        )}
      </p>

      <GenerateForm
        hasCredits={isAdmin || creditsUsed < creditsLimit}
        creditsRemaining={creditsLimit - creditsUsed}
        isAdmin={isAdmin}
        maxChatPerGeneration={maxChatPerGeneration}
        resume={resume}
      />
    </div>
  )
}

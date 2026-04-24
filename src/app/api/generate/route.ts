import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

function getAiModel(provider: string, model: string) {
  if (provider === 'openai') {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    return openai(model || 'gpt-4o-mini')
  }
  if (provider === 'openrouter') {
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1'
    })
    return openrouter(model || 'anthropic/claude-3-5-sonnet')
  }
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return anthropic((model || 'claude-3-5-sonnet-20240620') as Parameters<ReturnType<typeof createAnthropic>>[0])
}

function getFallbackProvider(): string {
  return process.env.AI_PROVIDER ||
    (process.env.OPENROUTER_API_KEY ? 'openrouter' :
     process.env.OPENAI_API_KEY ? 'openai' : 'anthropic')
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, category } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Fetch admin settings for AI config and limits
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('ai_provider, ai_model, system_context, free_credits_limit, max_chat_per_generation')
      .eq('id', 1)
      .single()

    const aiProvider = settings?.ai_provider || getFallbackProvider()
    const aiModel = settings?.ai_model || ''
    const systemContext = settings?.system_context || ''

    // Quota check
    const { data: profile } = await supabase
      .from('users')
      .select('credits_used, credits_limit, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const isAdmin = profile.role === 'admin'
    if (!isAdmin && profile.credits_used >= profile.credits_limit) {
      return NextResponse.json({ error: 'Quota exhausted' }, { status: 402 })
    }

    // Build system prompt with optional admin context
    const contextSection = systemContext
      ? `\n\nKonteks tambahan dari admin:\n${systemContext}`
      : ''

    const systemPrompt = `Kamu adalah expert programmer VBA untuk Microsoft Excel. Tugasmu adalah membuat macro VBA yang bersih, efisien, dan siap pakai.
Output HANYA kode VBA saja, tidak ada penjelasan di luar kode.
Gunakan komentar dalam kode (bahasa Indonesia). Tambahkan error handling.
Kode harus langsung bisa di-paste ke Excel VBA Editor. Jangan gunakan library eksternal.${contextSection}

PENTING: Jika permintaan user BUKAN tentang Excel, VBA, atau Macro, TOLAK permintaan tersebut dengan memberikan komentar VBA seperti ini:
' ERROR: Maaf, saya hanya bisa membantu membuat macro Excel VBA.`

    const userPrompt = `Buatkan macro Excel VBA untuk: ${prompt}. Pastikan macro aman dijalankan, punya konfirmasi sebelum aksi destruktif, dan berjalan di Excel 2016 ke atas.`

    const { text } = await generateText({
      model: getAiModel(aiProvider, aiModel),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
    })

    let vbaCode = text
    if (vbaCode.startsWith('```vba')) {
      vbaCode = vbaCode.replace(/```vba\n?/, '').replace(/```$/, '')
    } else if (vbaCode.startsWith('```')) {
      vbaCode = vbaCode.replace(/```\n?/, '').replace(/```$/, '')
    }
    vbaCode = vbaCode.trim()

    // Update quota (skip for admins)
    if (!isAdmin) {
      await supabase.from('users').update({ credits_used: profile.credits_used + 1 }).eq('id', user.id)
    }

    // Save generation and return its id for chat
    const { data: inserted } = await supabase
      .from('generations')
      .insert({ user_id: user.id, prompt, category, output_vba: vbaCode })
      .select('id')
      .single()

    return NextResponse.json({
      vba_code: vbaCode,
      generation_id: inserted?.id,
      max_chat_per_generation: settings?.max_chat_per_generation ?? 10
    })

  } catch (error: any) {
    console.error('Error in /api/generate:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
